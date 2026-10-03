import json, logging, re, uuid
from datetime import date, datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import select, func, or_, type_coerce
from pydantic import BaseModel, Field, field_validator
from .core.config import settings
from .core.db import Base, engine, get_db, SessionLocal
from .core.security import hash_password, verify_password, token_for, current_user, require_roles
from .models import *
from .services import store_file, enqueue_ingestion, extract_text, file_size, stream_file
from .embeddings import embed, cosine
from .providers import generate_locally, generate_openrouter
from pgvector.sqlalchemy import Vector
from .core.rate_limit import enforce_rate_limit

logging.basicConfig(level=logging.INFO, format="%(message)s")
@asynccontextmanager
async def lifespan(app):
    if settings.environment.lower()=="production" and (len(settings.secret_key)<32 or settings.secret_key.startswith("change-this") or settings.admin_password=="ChangeMe-Local-Only-123!"):
        raise RuntimeError("Set a random SECRET_KEY of at least 32 characters and ADMIN_PASSWORD before starting in production")
    if settings.social_webhook_enabled:
        from urllib.parse import urlparse
        webhook_url=urlparse(settings.social_webhook_url)
        if not webhook_url.hostname or (settings.environment.lower()=="production" and webhook_url.scheme!="https"):
            raise RuntimeError("SOCIAL_WEBHOOK_ENABLED requires a valid webhook URL; production URLs must use HTTPS")
        if settings.environment.lower()=="production" and len(settings.social_webhook_secret)<32:
            raise RuntimeError("SOCIAL_WEBHOOK_SECRET must contain at least 32 characters when the webhook is enabled in production")
    if settings.environment.lower()=="production" and not settings.public_app_url.startswith("https://"):
        raise RuntimeError("PUBLIC_APP_URL must use HTTPS in production")
    # Production schema is created exclusively by the Alembic migration in the
    # container entrypoint; create_all remains a convenience for local development.
    if settings.environment.lower() != "production":
        Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        if not db.scalar(select(User).where(User.email==settings.admin_email.lower())):
            db.add(User(email=settings.admin_email.lower(), password_hash=hash_password(settings.admin_password), role="admin")); db.commit()
    yield

app=FastAPI(title=settings.app_name, version="1.0.0", description="Polar science archive and publishing API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=[x.strip() for x in settings.cors_origins.split(",") if x.strip()], allow_credentials=True, allow_methods=["GET","POST","PUT","PATCH","DELETE","OPTIONS"], allow_headers=["Authorization","Content-Type","X-Request-ID"])
@app.middleware("http")
async def request_context(request: Request, call_next):
    request.state.request_id=request.headers.get("x-request-id") or str(uuid.uuid4())
    try: response=await call_next(request)
    except Exception:
        logging.exception('{"event":"unhandled_error","request_id":"%s"}',request.state.request_id)
        response=JSONResponse({"detail":"Internal server error","request_id":request.state.request_id},status_code=500)
    response.headers["X-Request-ID"]=request.state.request_id
    response.headers["X-Content-Type-Options"]="nosniff"
    return response

def normalize_portal_email(value: str) -> str:
    email = value.strip().lower()
    local, separator, domain = email.rpartition("@")
    label_pattern = r"[a-z0-9](?:[a-z0-9-]*[a-z0-9])?"
    if (not separator or not local or len(email) > 320 or len(local) > 64
            or not re.fullmatch(r"[a-z0-9.!#$%&'*+/=?^_`{|}~-]+", local)
            or ".." in local or not all(re.fullmatch(label_pattern, label) for label in domain.split("."))
            or len(domain.split(".")) < 2):
        raise ValueError("Enter a valid email address")
    return email

class Login(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return normalize_portal_email(value)

class UserIn(BaseModel):
    email: str
    password: str=Field(min_length=12)
    role: str="viewer"

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return normalize_portal_email(value)
class RegisterIn(BaseModel):
    email: str
    password: str=Field(min_length=12)
    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return normalize_portal_email(value)
class ActivateIn(BaseModel):
    token: str
class ExpeditionIn(BaseModel): name:str; year:int|None=None; region:str|None=None; start_date:date|None=None; end_date:date|None=None; stations:list[str]=Field(default_factory=list); description:str=""
class AssetIn(BaseModel):
    type:str; title:str=Field(min_length=1,max_length=500); description:str=Field(default="",max_length=20000)
    expedition_id:int|None=None; region:str|None=None; station:str|None=None; year:int|None=None
    record_date:date|None=None; authors:list[str]=Field(default_factory=list); access_level:str="internal"
    external_url:str|None=None; tags:list[str]=Field(default_factory=list); metadata:dict=Field(default_factory=dict)
    type_details:dict=Field(default_factory=dict)

    @field_validator("authors")
    @classmethod
    def valid_authors(cls, values):
        cleaned=list(dict.fromkeys(v.strip() for v in values if isinstance(v,str) and v.strip()))
        if len(cleaned)>30 or any(len(v)>200 for v in cleaned): raise ValueError("Provide at most 30 authors, each no longer than 200 characters")
        return cleaned

    @field_validator("tags")
    @classmethod
    def valid_tags(cls, values):
        cleaned=list(dict.fromkeys(v.strip() for v in values if isinstance(v,str) and v.strip()))
        if len(cleaned)>30 or any(len(v)>120 for v in cleaned): raise ValueError("Provide at most 30 keywords, each no longer than 120 characters")
        return cleaned

    @field_validator("access_level")
    @classmethod
    def valid_access(cls, value):
        if value not in {"public","internal"}: raise ValueError("access_level must be public or internal")
        return value

    @field_validator("external_url")
    @classmethod
    def valid_external_url(cls, value):
        if value is not None and value.strip():
            from urllib.parse import urlparse
            parsed=urlparse(value.strip())
            if parsed.scheme!="https" or not parsed.hostname or parsed.username or parsed.password:
                raise ValueError("External links must be valid HTTPS URLs")
            return value.strip()
        return None

    @field_validator("type_details")
    @classmethod
    def valid_type_details(cls, value):
        if len(value)>20: raise ValueError("Too many type-specific metadata fields")
        for key,item in value.items():
            if not re.fullmatch(r"[a-z][a-z0-9_]{0,49}",key) or not isinstance(item,(str,int,float,bool,type(None))):
                raise ValueError("Type-specific metadata must contain simple named values")
            if isinstance(item,str) and len(item)>2000: raise ValueError("Type-specific metadata values are limited to 2000 characters")
        return value
class DraftIn(BaseModel): kind:str; title:str; body_md:str=""; tone:str="general_public"; expedition_id:int|None=None; ai_assisted:bool=False
class TransitionIn(BaseModel): action:str; comment:str=""; scheduled_at:str|None=None
class EditorialCommentIn(BaseModel): comment:str=Field(min_length=1,max_length=5000)
ASSET_TYPES={"report","dataset","publication","photo","video","activity"}; ROLES={"admin","editor","reviewer","viewer","submitter","public_user","pending_submitter"}
UPLOAD_EXTENSIONS={"pdf","docx","csv","nc","nc4","jpg","jpeg","png","webp","tif","tiff","mp4","txt","xml"}
IMAGE_EXTENSIONS={"jpg","jpeg","png","webp","tif","tiff"}
SOCIAL_DRAFT_KINDS={"post","carousel","reel","instagram","twitter","facebook"}
SOCIAL_FEED_KIND={"post":"post","carousel":"carousel","reel":"reel","instagram":"post","twitter":"post","facebook":"post"}
def serialize_asset(a):
    metadata=dict(a.metadata_json or {})
    metadata.pop("_ingestion_job_id",None)
    return {"id":a.id,"type":a.type,"title":a.title,"description":a.description,"expedition_id":a.expedition_id,"expedition":a.expedition.name if a.expedition else None,"region":a.region,"station":a.station,"year":a.year,"record_date":a.record_date.isoformat() if a.record_date else None,"authors":a.authors or [],"access_level":getattr(a,"access_level","public"),"tags":[tag.name for tag in getattr(a,"tags",[])],"type_details":metadata.get("type_details",{}),"file_key":a.file_key,"thumb_key":a.thumb_key,"external_url":a.external_url,"status":a.processing_status,"review_status":a.review_status,"error":a.error,"version":a.version,"metadata":metadata,"created_at":a.created_at.isoformat() if a.created_at else None}

def apply_asset_tags(db:Session, asset:Asset, names:list[str]):
    db.query(AssetTag).filter(AssetTag.asset_id==asset.id).delete(synchronize_session=False)
    for name in dict.fromkeys(value.strip() for value in names if value.strip()):
        tag=db.scalar(select(Tag).where(func.lower(Tag.name)==name.lower()))
        if not tag: tag=Tag(name=name,kind="theme");db.add(tag);db.flush()
        db.add(AssetTag(asset_id=asset.id,tag_id=tag.id))

def asset_metadata(existing:dict|None, details:dict|None):
    result=dict(existing or {})
    result["type_details"]=dict(details or {})
    return result
def serialize_draft(d, webhook_delivery_status=None, query_webhook_status=True):
    from sqlalchemy.orm import object_session
    db = object_session(d)
    public_story_id = d.id if d.kind == "article" else None
    if db and public_story_id is None:
        from .modules.feed import FeedItem, OutreachStory
        from sqlalchemy import select
        story = db.scalar(select(OutreachStory.id).where(OutreachStory.source_draft_id == d.id).limit(1))
        if story is not None:
            public_story_id = story
        else:
            public_story_id = db.scalar(select(FeedItem.id).where(FeedItem.origin_draft_id == d.id).limit(1))
    if query_webhook_status and db and d.kind in SOCIAL_DRAFT_KINDS:
        from .models import WebhookOutbox
        from .modules.feed import FeedItem
        from sqlalchemy import select
        linked = db.scalar(select(FeedItem).where(FeedItem.origin_draft_id==d.id))
        if linked:
            outbox = db.scalar(select(WebhookOutbox).where(WebhookOutbox.feed_item_id==linked.id).order_by(WebhookOutbox.created_at.desc()))
            if outbox: webhook_delivery_status = {"id": outbox.id, "state": outbox.state, "attempts": outbox.attempts, "last_error": outbox.last_error}
    return {"id":d.id,"kind":d.kind,"title":d.title,"body_md":d.body_md,"tone":d.tone,"audience":d.audience,"reading_level":d.reading_level,"max_length":d.max_length,"key_messages":d.key_messages,"status":d.status,"ai_assisted":d.ai_assisted,"expedition_id":d.expedition_id,"scheduled_at":d.scheduled_at,"approved_at":d.approved_at,"published_at":d.published_at,"reviewer_id":d.reviewer_id,"created_at":d.created_at,"updated_at":d.updated_at,"public_story_id":public_story_id,"webhook_delivery_status":webhook_delivery_status}
def serialize_public_draft(d,db):
    sources=[]
    for citation in db.scalars(select(DraftCitation).where(DraftCitation.draft_id==d.id)):
        asset=db.get(Asset,citation.asset_id) if citation.asset_id else None
        sources.append({"asset_id":citation.asset_id,"chunk_id":citation.chunk_id,"title":asset.title if asset else None,"url":asset.external_url if asset else None,"claim_text":citation.claim_text,"span_text":citation.span_text,"supported":citation.supported})
    return {**serialize_draft(d),"sources":sources}

@app.get("/health")
def health(db:Session=Depends(get_db)):
    try: db.execute(select(1)); db_ok=True
    except Exception: db_ok=False
    return {"status":"ok" if db_ok else "degraded","database":db_ok,"queue":"redis-configured"}
@app.get("/metrics")
def metrics(db:Session=Depends(get_db)):
    return {"assets":db.scalar(select(func.count(Asset.id))) or 0,"drafts":db.scalar(select(func.count(Draft.id))) or 0,"processing_assets":db.scalar(select(func.count(Asset.id)).where(Asset.processing_status=="processing")) or 0}
@app.post("/api/auth/login")
def login(data:Login,request:Request,db:Session=Depends(get_db)):
    enforce_rate_limit(request,"login",10,300)
    u=db.scalar(select(User).where(User.email==data.email.lower()))
    if not u or not verify_password(data.password,u.password_hash): raise HTTPException(401,"Invalid email or password")
    if not u.is_active: raise HTTPException(401,"Account not activated")
    return {"access_token":token_for(u),"refresh_token":token_for(u,"refresh"),"token_type":"bearer","expires_in":settings.access_token_minutes*60,"user":{"id":u.id,"email":u.email,"role":u.role}}
@app.post("/api/auth/refresh")
def refresh(payload:dict,db:Session=Depends(get_db)):
    from jose import jwt,JWTError
    try:
        p=jwt.decode(payload.get("refresh_token",""),settings.secret_key,algorithms=["HS256"])
        if p.get("type")!="refresh": raise ValueError()
        u=db.get(User,int(p["sub"]))
        if not u or not u.is_active: raise ValueError()
    except Exception: raise HTTPException(401,"Invalid refresh token")
    return {"access_token":token_for(u),"refresh_token":token_for(u,"refresh"),"token_type":"bearer","expires_in":settings.access_token_minutes*60}
@app.get("/api/auth/me")
def me(u=Depends(current_user)):
    if not u: raise HTTPException(401,"Authentication required")
    return {"id":u.id,"email":u.email,"role":u.role}
@app.post("/api/auth/public/register",status_code=201)
def public_register(data:RegisterIn,request:Request,db:Session=Depends(get_db)):
    enforce_rate_limit(request,"register",5,300)
    import secrets, hashlib
    from datetime import timedelta, timezone
    if db.scalar(select(User).where(User.email==data.email.lower())): raise HTTPException(409,"Email already registered")
    u=User(email=data.email.lower(),password_hash=hash_password(data.password),role="public_user",is_active=False)
    db.add(u);db.flush()
    # Create an empty public profile for the user
    from .models import PublicProfile
    # username derived from email or a random string, let's use part of email and a random suffix
    import string
    import random
    base_name = data.email.lower().split("@")[0]
    base_name = re.sub(r'[^a-z0-9_]', '', base_name)[:20]
    suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=5))
    username = f"{base_name}_{suffix}"
    profile = PublicProfile(user_id=u.id, username=username, display_name=base_name)
    db.add(profile)

    raw_token=secrets.token_urlsafe(32)
    token_hash=hashlib.sha256(raw_token.encode()).hexdigest()
    expires_at=datetime.now(timezone.utc)+timedelta(days=1)
    db.add(ActivationToken(user_id=u.id,token_hash=token_hash,expires_at=expires_at))
    from .services import send_activation_email
    if not send_activation_email(u.email, raw_token):
        db.rollback()
        raise HTTPException(503, "Email delivery is unconfigured or failed. Cannot register.")
    db.commit()
    return {"message":"Check your email for activation link"}

@app.post("/api/auth/register",status_code=201)
def register(data:RegisterIn,request:Request,db:Session=Depends(get_db)):
    enforce_rate_limit(request,"register",5,300)
    import secrets, hashlib
    from datetime import timedelta, timezone
    if db.scalar(select(User).where(User.email==data.email.lower())): raise HTTPException(409,"Email already registered")
    u=User(email=data.email.lower(),password_hash=hash_password(data.password),role="pending_submitter",is_active=False)
    db.add(u);db.flush()
    raw_token=secrets.token_urlsafe(32)
    token_hash=hashlib.sha256(raw_token.encode()).hexdigest()
    expires_at=datetime.now(timezone.utc)+timedelta(days=1)
    db.add(ActivationToken(user_id=u.id,token_hash=token_hash,expires_at=expires_at))
    from .services import send_activation_email
    if not send_activation_email(u.email, raw_token):
        db.rollback()
        raise HTTPException(503, "Email delivery is unconfigured or failed. Cannot register.")
    db.commit()
    return {"message":"Check your email for activation link"}

@app.post("/api/auth/activate")
def activate(data:ActivateIn,db:Session=Depends(get_db)):
    import hashlib
    from datetime import timezone
    token_hash=hashlib.sha256(data.token.encode()).hexdigest()
    t=db.scalar(select(ActivationToken).where(ActivationToken.token_hash==token_hash))
    if not t: raise HTTPException(400,"Invalid or expired token")
    if t.expires_at<datetime.now(timezone.utc):
        db.delete(t);db.commit();raise HTTPException(400,"Token expired")
    u=db.get(User,t.user_id)
    if u: u.is_active=True
    db.delete(t);db.commit()
    return {"message":"Account activated successfully"}

@app.post("/api/users",status_code=201)
def create_user(data:UserIn,db:Session=Depends(get_db),u=Depends(require_roles("admin"))):
    if data.role not in ROLES: raise HTTPException(422,"Invalid role")
    if db.scalar(select(User).where(User.email==data.email.lower())): raise HTTPException(409,"Email already exists")
    row=User(email=data.email.lower(),password_hash=hash_password(data.password),role=data.role); db.add(row);db.commit();db.refresh(row);return {"id":row.id,"email":row.email,"role":row.role}
@app.get("/api/users")
def users(db:Session=Depends(get_db),u=Depends(require_roles("admin"))): return [{"id":x.id,"email":x.email,"role":x.role,"is_active":x.is_active} for x in db.scalars(select(User).order_by(User.id))]

@app.post("/api/users/{user_id}/approve")
def approve_submitter(user_id:int,db:Session=Depends(get_db),u=Depends(require_roles("admin"))):
    target=db.get(User,user_id)
    if not target: raise HTTPException(404,"User not found")
    if target.role!="pending_submitter": raise HTTPException(400,"User is not a pending submitter")
    target.role="submitter"
    db.commit()
    return {"message":"Submitter approved"}

@app.get("/api/expeditions")
def expeditions(db:Session=Depends(get_db)): return [{"id":x.id,"name":x.name,"year":x.year,"region":x.region,"start_date":x.start_date,"end_date":x.end_date,"stations":x.stations,"description":x.description} for x in db.scalars(select(Expedition).order_by(Expedition.year.desc()))]
@app.post("/api/expeditions",status_code=201)
def add_expedition(data:ExpeditionIn,db:Session=Depends(get_db),u=Depends(require_roles("admin","editor"))):
    if data.start_date and data.end_date and data.start_date>data.end_date:raise HTTPException(422,"start_date must not be after end_date")
    row=Expedition(**data.model_dump());db.add(row);db.commit();db.refresh(row);return row
@app.get("/api/expeditions/{eid}")
def expedition(eid:int,db:Session=Depends(get_db)):
    row=db.get(Expedition,eid)
    if not row: raise HTTPException(404,"Expedition not found")
    return row
@app.get("/api/assets")
def assets(type:str|None=None,expedition_id:int|None=None,region:str|None=None,station:str|None=None,year:int|None=None,processing_status:str|None="ready",review_status:str|None="approved",page:int=1,page_size:int=24,db:Session=Depends(get_db),u=Depends(current_user)):
    q=select(Asset)
    if not u or u.role not in {"admin","editor","reviewer"}: q=q.where(Asset.access_level=="public")
    if processing_status: q=q.where(Asset.processing_status==processing_status)
    if review_status: q=q.where(Asset.review_status==review_status)
    if type: q=q.where(Asset.type==type)
    if expedition_id: q=q.where(Asset.expedition_id==expedition_id)
    if region: q=q.where(Asset.region.ilike(f"%{region}%"))
    if station:q=q.where(Asset.station.ilike(f"%{station}%"))
    if year: q=q.where(Asset.year==year)
    total=db.scalar(select(func.count()).select_from(q.subquery())) or 0
    rows=db.scalars(q.order_by(Asset.created_at.desc()).offset((max(page,1)-1)*min(page_size,100)).limit(min(page_size,100))).all()
    return {"items":[serialize_asset(a) for a in rows],"total":total,"page":page,"page_size":min(page_size,100)}
@app.post("/api/assets",status_code=201)
def add_asset(data:AssetIn,db:Session=Depends(get_db),u=Depends(require_roles("admin","editor"))):
    if data.type not in ASSET_TYPES: raise HTTPException(422,"Unsupported asset type")
    if not data.external_url: raise HTTPException(422,"Provide an HTTPS source link or use the upload endpoint to attach a file")
    if data.type_details and data.type not in {"report","photo"}: raise HTTPException(422,"Type-specific details are supported for reports and photos")
    a=Asset(**data.model_dump(exclude={"tags","metadata","type_details"}),metadata_json=asset_metadata(data.metadata,data.type_details),created_by=u.id,processing_status="ready",review_status="approved");db.add(a);db.flush()
    apply_asset_tags(db,a,data.tags)
    db.add(AssetVersion(asset_id=a.id,version=1,snapshot_json=data.model_dump(mode="json")));db.commit();db.refresh(a);return serialize_asset(a)
@app.get("/api/assets/{aid}")
def get_asset(aid:int,db:Session=Depends(get_db),u=Depends(current_user)):
    a=db.get(Asset,aid)
    if not a or (a.processing_status!="ready" or a.review_status!="approved"): raise HTTPException(404,"Asset not found")
    if a.access_level!="public" and (not u or u.role not in {"admin","editor","reviewer"}): raise HTTPException(404,"Asset not found")
    chunks=db.scalars(select(Chunk).where(Chunk.asset_id==aid).order_by(Chunk.idx,Chunk.id)).all()
    versions=db.scalars(select(AssetVersion).where(AssetVersion.asset_id==aid).order_by(AssetVersion.version.desc())).all()
    expedition={"id":a.expedition.id,"name":a.expedition.name,"stations":a.expedition.stations or []} if a.expedition else None
    version_rows=[{"version":row.version,"timestamp":row.created_at.isoformat() if row.created_at else None,"title":row.snapshot_json.get("title",a.title)} for row in versions]
    if not version_rows:
        version_rows=[{"version":a.version,"timestamp":a.updated_at.isoformat() if a.updated_at else None,"title":a.title}]
    db.add(ViewLog(asset_id=aid));db.commit()
    return {"asset":serialize_asset(a),"chunks":[{"id":chunk.id,"page":chunk.page,"text":chunk.text} for chunk in chunks],"versions":version_rows,"expedition":expedition}


@app.get("/api/storage/{key:path}")
def stream_storage_file(key: str, db:Session=Depends(get_db), u=Depends(current_user)):
    a = db.scalar(select(Asset).where((Asset.file_key == key) | (Asset.thumb_key == key)).limit(1))
    if not a: raise HTTPException(404, "File not found")
    if a and (a.processing_status != "ready" or a.review_status != "approved" or a.access_level!="public"):
        if not u or (a.created_by != u.id and u.role not in {"admin", "editor", "reviewer"}):
            raise HTTPException(403, "File is not public")

    try:
        total = file_size(key)
    except Exception:
        raise HTTPException(404, "File not found")
    if total <= 0:
        raise HTTPException(404, "File is empty")

    import mimetypes
    content_type, _ = mimetypes.guess_type(key)
    if not content_type:
        content_type = "application/octet-stream"

    try:
        body = stream_file(key, 0, total - 1)
    except Exception:
        raise HTTPException(404, "File is unavailable")

    return StreamingResponse(body, status_code=200, media_type=content_type, headers={"Cache-Control": "public, max-age=3600"})

@app.get("/api/assets/{aid}/media")
def stream_asset_media(aid:int,request:Request,db:Session=Depends(get_db),u=Depends(current_user)):
    asset=db.get(Asset,aid)
    if not asset or (asset.processing_status!="ready" or asset.review_status!="approved") or (asset.access_level!="public" and (not u or u.role not in {"admin","editor","reviewer"})) or asset.type!="video" or not asset.file_key:
        raise HTTPException(404,"Video media not found")
    try:total=file_size(asset.file_key)
    except Exception:raise HTTPException(404,"Video media is unavailable")
    if total<=0:raise HTTPException(404,"Video media is empty")
    start,end=0,total-1;status=200
    requested=request.headers.get("range")
    if requested:
        match=re.fullmatch(r"bytes=(\d*)-(\d*)",requested.strip())
        if not match or (not match.group(1) and not match.group(2)):
            raise HTTPException(416,"Invalid byte range",headers={"Content-Range":f"bytes */{total}"})
        if match.group(1):
            start=int(match.group(1));end=int(match.group(2)) if match.group(2) else total-1
        else:
            length=int(match.group(2));start=max(total-length,0)
        if start>=total or end<start:
            raise HTTPException(416,"Requested byte range is not satisfiable",headers={"Content-Range":f"bytes */{total}"})
        end=min(end,total-1);status=206
    headers={"Accept-Ranges":"bytes","Content-Length":str(end-start+1),"Cache-Control":"public, max-age=3600"}
    if status==206:headers["Content-Range"]=f"bytes {start}-{end}/{total}"
    content_type=(asset.metadata_json or {}).get("content_type") or "video/mp4"
    if not content_type.startswith("video/"):content_type="video/mp4"
    try:body=stream_file(asset.file_key,start,end)
    except Exception:raise HTTPException(404,"Video media is unavailable")
    return StreamingResponse(body,status_code=status,media_type=content_type,headers=headers)

@app.patch("/api/assets/{aid}")
def update_asset(aid:int,data:dict,db:Session=Depends(get_db),u=Depends(require_roles("admin","editor"))):
    a=db.get(Asset,aid)
    if not a: raise HTTPException(404,"Asset not found")
    allowed={"type","title","description","expedition_id","region","station","year","record_date","authors","access_level","external_url"}
    if "type" in data and data["type"] not in ASSET_TYPES: raise HTTPException(422,"Unsupported asset type")
    if data.get("access_level",a.access_level) not in {"public","internal"}: raise HTTPException(422,"access_level must be public or internal")
    if "external_url" in data:
        try: data["external_url"]=AssetIn.valid_external_url(data["external_url"])
        except (ValueError,TypeError,AttributeError) as exc: raise HTTPException(422,str(exc))
        if data["external_url"] and a.file_key: raise HTTPException(409,"This record already has an uploaded file. Replace its source using the upload workflow first.")
    for k,v in data.items():
        if k in allowed: setattr(a,k,v)
    if "type_details" in data:
        try: a.metadata_json=asset_metadata(a.metadata_json,AssetIn.valid_type_details(data["type_details"]))
        except (ValueError,TypeError,AttributeError) as exc: raise HTTPException(422,str(exc))
    details=(a.metadata_json or {}).get("type_details",{})
    if details and data.get("type",a.type) not in {"report","photo"}: raise HTTPException(422,"Type-specific details are supported for reports and photos")
    if "tags" in data:
        if not isinstance(data["tags"],list): raise HTTPException(422,"tags must be a list")
        apply_asset_tags(db,a,data["tags"])
    a.version+=1;a.updated_at=now();db.add(AssetVersion(asset_id=a.id,version=a.version,snapshot_json=serialize_asset(a)));db.commit();db.refresh(a);return serialize_asset(a)
@app.delete("/api/assets/{aid}",status_code=204)
def delete_asset(aid:int,db:Session=Depends(get_db),u=Depends(require_roles("admin","editor"))):
    a=db.get(Asset,aid)
    if not a: raise HTTPException(404,"Asset not found")
    from .modules.feed import FeedItem, FeedMedia
    linked_public = db.scalar(select(FeedItem.id).outerjoin(FeedMedia, FeedMedia.item_id==FeedItem.id).where(FeedItem.status=="published", or_(FeedItem.primary_asset_id==aid, FeedMedia.asset_id==aid)).limit(1))
    from .modules.feed import OutreachStory, StorySlide
    linked_story = db.scalar(select(OutreachStory.id).join(StorySlide, StorySlide.story_id==OutreachStory.id).where(OutreachStory.status=="published", StorySlide.asset_id==aid).limit(1))
    linked_article = db.scalar(select(Draft.id).join(DraftCitation, DraftCitation.draft_id==Draft.id).where(Draft.status=="published", DraftCitation.asset_id==aid).limit(1))
    if linked_public or linked_story or linked_article:
        raise HTTPException(409,"This asset is cited by or attached to published content; unpublish or remove that content before deleting it")
    db.delete(a);db.commit()
@app.post("/api/ingest/upload",status_code=202)
async def upload(file:UploadFile|None=File(None),title:str=Form(...),type:str=Form("report"),description:str=Form(""),expedition_id:int|None=Form(None),station:str|None=Form(None),region:str|None=Form(None),year:int|None=Form(None),record_date:date|None=Form(None),authors:str=Form("[]"),tags:str=Form("[]"),access_level:str=Form("internal"),type_details:str=Form("{}"),external_url:str|None=Form(None),db:Session=Depends(get_db),u=Depends(require_roles("admin","editor"))):
    if type not in ASSET_TYPES: raise HTTPException(422,"Unsupported asset type")
    try:
        authors_data=json.loads(authors);tags_data=json.loads(tags);details_data=json.loads(type_details)
        validated=AssetIn(type=type,title=title,description=description,expedition_id=expedition_id,station=station,region=region,year=year,record_date=record_date,authors=authors_data,access_level=access_level,external_url=external_url,tags=tags_data,type_details=details_data)
    except (ValueError,TypeError,json.JSONDecodeError) as exc: raise HTTPException(422,f"Invalid repository metadata: {str(exc)[:300]}")
    if details_data and type not in {"report","photo"}: raise HTTPException(422,"Type-specific details are supported for reports and photos")
    if bool(file)==bool(validated.external_url): raise HTTPException(422,"Provide exactly one source: an uploaded file or an HTTPS external link")
    if not file:
        a=Asset(type=type,title=title,description=description,expedition_id=expedition_id,station=station,region=region,year=year,record_date=record_date,authors=validated.authors,access_level=access_level,external_url=validated.external_url,processing_status="ready",review_status="approved",created_by=u.id,metadata_json=asset_metadata({},details_data))
        db.add(a);db.flush();apply_asset_tags(db,a,validated.tags);db.add(AssetVersion(asset_id=a.id,version=1,snapshot_json=validated.model_dump(mode="json")));db.commit();db.refresh(a)
        return {"asset":serialize_asset(a),"job_queued":False}
    suffix=(file.filename or "").lower().rsplit(".",1)[-1] if "." in (file.filename or "") else ""
    allowed={"pdf","docx","csv","nc","nc4","jpg","jpeg","png","webp","tif","tiff","mp4","txt"}
    if suffix not in allowed: raise HTTPException(415,"Unsupported file extension")
    data=await file.read(settings.max_upload_mb*1024*1024+1)
    if not data or len(data)>settings.max_upload_mb*1024*1024: raise HTTPException(413,"File empty or exceeds upload limit")
    signatures={"pdf":data.startswith(b"%PDF-"),"jpg":data.startswith(b"\xff\xd8\xff"),"jpeg":data.startswith(b"\xff\xd8\xff"),"png":data.startswith(b"\x89PNG\r\n\x1a\n"),"webp":data.startswith(b"RIFF") and data[8:12]==b"WEBP","mp4":len(data)>12 and data[4:8]==b"ftyp","nc":data.startswith((b"CDF\x01",b"CDF\x02",b"\x89HDF\r\n\x1a\n")),"nc4":data.startswith((b"CDF\x01",b"CDF\x02",b"\x89HDF\r\n\x1a\n")),"docx":data.startswith(b"PK\x03\x04"),"csv":True,"txt":True,"tif":data.startswith((b"II*\x00",b"MM\x00*")),"tiff":data.startswith((b"II*\x00",b"MM\x00*"))}
    if not signatures.get(suffix,False):raise HTTPException(415,"File content does not match its extension")
    key=store_file(data,suffix,file.content_type or "application/octet-stream")
    a=Asset(type=type,title=title,description=description,expedition_id=expedition_id,station=station,region=region,year=year,record_date=record_date,authors=validated.authors,access_level=access_level,file_key=key,processing_status="processing",review_status="approved",created_by=u.id,metadata_json=asset_metadata({"filename":file.filename,"content_type":file.content_type,"size":len(data)},details_data))
    db.add(a);db.flush();apply_asset_tags(db,a,validated.tags);db.add(AssetVersion(asset_id=a.id,version=1,snapshot_json=validated.model_dump(mode="json")));db.commit();db.refresh(a)
    ingestion_job_id=enqueue_ingestion(a.id,key,suffix)
    queued=bool(ingestion_job_id)
    if queued:
        a.metadata_json={**(a.metadata_json or {}),"_ingestion_job_id":ingestion_job_id}
        db.commit()
    else:
        try:
            text=extract_text(data,suffix)
            if text:
                for i in range(0,len(text),2500):
                    chunk_text=text[i:i+3000]
                    db.add(Chunk(asset_id=a.id,idx=i//2500,text=chunk_text,embedding=embed(chunk_text)))
            a.processing_status="ready";a.error=None;a.updated_at=now();db.commit()
        except Exception as e:
            db.rollback();a=db.get(Asset,a.id)
            if a:a.processing_status="failed";a.error=str(e)[:1000];a.updated_at=now();db.commit()
    return {"asset":serialize_asset(a),"job_queued":queued}
@app.get("/api/ingest/failed")
def failed_ingestion(db:Session=Depends(get_db),u=Depends(require_roles("admin","editor"))):
    return [serialize_asset(a) for a in db.scalars(select(Asset).where(Asset.processing_status=="failed").order_by(Asset.updated_at.desc()))]
@app.post("/api/ingest/{asset_id}/retry",status_code=202)
def retry_ingestion(asset_id:int,db:Session=Depends(get_db),u=Depends(require_roles("admin","editor"))):
    a=db.scalar(select(Asset).where(Asset.id==asset_id).with_for_update().execution_options(populate_existing=True))
    if not a:raise HTTPException(404,"Asset not found")
    if a.processing_status!="failed":raise HTTPException(409,"Only failed assets can be retried")
    if not a.file_key:raise HTTPException(422,"Asset has no source file")
    suffix=(a.metadata_json or {}).get("filename","").lower().rsplit(".",1)[-1]
    a.processing_status="processing";a.error=None;a.updated_at=now();db.commit()
    ingestion_job_id=enqueue_ingestion(a.id,a.file_key,suffix)
    if not ingestion_job_id:
        a.processing_status="failed";a.error="Redis/RQ unavailable; start the worker before retrying";db.commit();raise HTTPException(503,a.error)
    a.metadata_json={**(a.metadata_json or {}),"_ingestion_job_id":ingestion_job_id};db.commit()
    return {"asset_id":a.id,"status":a.processing_status,"review_status":a.review_status,"queued":True}

@app.get("/api/search")
def search(q:str="",type:str|None=None,expedition:str|None=None,year_from:int|None=None,year_to:int|None=None,region:str|None=None,station:str|None=None,tags:str|None=None,sort:str="relevance",page:int=1,db:Session=Depends(get_db)):
    stmt=select(Asset).where((Asset.processing_status=="ready") & (Asset.review_status=="approved") & (Asset.access_level=="public"))
    if type: stmt=stmt.where(Asset.type==type)
    if expedition:
        if expedition.isdigit(): stmt=stmt.where(Asset.expedition_id==int(expedition))
        else: stmt=stmt.join(Expedition).where(Expedition.name.ilike(f"%{expedition}%"))
    if year_from: stmt=stmt.where(Asset.year>=year_from)
    if year_to: stmt=stmt.where(Asset.year<=year_to)
    if region: stmt=stmt.where(Asset.region.ilike(f"%{region}%"))
    if station:stmt=stmt.where(Asset.station.ilike(f"%{station}%"))
    if tags:
        tag_names=[x.strip().lower() for x in tags.split(",") if x.strip()]
        matched=db.scalars(select(AssetTag.asset_id).join(Tag,Tag.id==AssetTag.tag_id).where(func.lower(Tag.name).in_(tag_names))).all()
        stmt=stmt.where(Asset.id.in_(matched))
    terms=[x for x in q.split() if len(x)>1]
    vector=embed(q) if q.strip() else []
    if q.strip():
        if db.bind.dialect.name=="postgresql":
            lexical_ids=db.scalars(select(Chunk.asset_id).join(Asset,Asset.id==Chunk.asset_id).where((Asset.processing_status=="ready") & (Asset.review_status=="approved") & (Asset.access_level=="public"),func.to_tsvector("english",Chunk.text).op("@@")(func.plainto_tsquery("english",q))).limit(50)).all()
            distance=type_coerce(Chunk.embedding,Vector(384)).cosine_distance(vector)
            semantic_ids=db.scalars(select(Chunk.asset_id).join(Asset,Asset.id==Chunk.asset_id).where((Asset.processing_status=="ready") & (Asset.review_status=="approved") & (Asset.access_level=="public"),Chunk.embedding.is_not(None)).order_by(distance).limit(50)).all()
            title_ids=db.scalars(select(Asset.id).where((Asset.processing_status=="ready") & (Asset.review_status=="approved") & (Asset.access_level=="public"),or_(*[or_(Asset.title.ilike(f"%{t}%"),Asset.description.ilike(f"%{t}%")) for t in terms])).limit(50)).all() if terms else []
            candidate_ids=set(lexical_ids)|set(semantic_ids)|set(title_ids)
            stmt=stmt.where(Asset.id.in_(candidate_ids))
        else:
            title_ids=db.scalars(select(Asset.id).where((Asset.processing_status=="ready") & (Asset.review_status=="approved") & (Asset.access_level=="public"),or_(*[or_(Asset.title.ilike(f"%{t}%"),Asset.description.ilike(f"%{t}%")) for t in terms]))).all() if terms else []
            stmt=stmt.where(Asset.id.in_(title_ids))
    rows=db.scalars(stmt.order_by(Asset.created_at.desc()).limit(500)).all(); scored=[]
    for a in rows:
        chunks=db.scalars(select(Chunk).where(Chunk.asset_id==a.id)).all()
        searchable=a.title+" "+a.description+" "+" ".join(c.text for c in chunks)
        kw=sum(1 for t in terms if t.lower() in searchable.lower())/max(len(terms),1)
        age=max((datetime.now(timezone.utc)-a.created_at.replace(tzinfo=timezone.utc)).days,0); rec=0.5**(age/365)
        semantic=max((cosine(vector,c.embedding) for c in chunks),default=0.0)
        if chunks and vector: score=0.4*kw+0.5*max(semantic,0)+0.1*rec
        else: score=0.4*kw+0.1*rec
        scored.append((score,a))
    scored.sort(key=lambda x:x[0],reverse=True)
    db.add(SearchLog(query=q,filters_json={"type":type,"region":region,"station":station,"year_from":year_from,"year_to":year_to},n_results=len(scored)));db.commit()
    start=(max(page,1)-1)*20
    return {"items":[{**serialize_asset(a),"score":round(float(s),4)} for s,a in scored[start:start+20]],"total":len(scored),"page":page,"page_size":20,"mode":"keyword+local semantic hashing embeddings+recency"}
@app.get("/api/search/images")
def image_search(q:str="",db:Session=Depends(get_db)):
    stmt = select(Asset).where((Asset.processing_status=="ready") & (Asset.review_status=="approved") & (Asset.access_level=="public"), or_(Asset.type=="photo", Asset.thumb_key.is_not(None), Asset.file_key.ilike("%.jpg"), Asset.file_key.ilike("%.jpeg"), Asset.file_key.ilike("%.png"), Asset.file_key.ilike("%.webp")))
    if q.strip():
        stmt = stmt.where(or_(Asset.title.ilike(f"%{q}%"),Asset.description.ilike(f"%{q}%")))
    items=db.scalars(stmt.order_by(Asset.created_at.desc()).limit(50)).all()
    return {"items":[serialize_asset(a) for a in items],"total":len(items),"mode":"text fallback; configure a local CLIP provider for semantic image retrieval"}

@app.get("/api/editorial/drafts")
def drafts(status:str|None=None,kind:str|None=None,db:Session=Depends(get_db),u=Depends(require_roles("admin","editor","reviewer"))):
    q=select(Draft)
    if status:q=q.where(Draft.status==status)
    if kind:q=q.where(Draft.kind==kind)
    rows=db.scalars(q.order_by(Draft.created_at.desc())).all()
    social_ids=[draft.id for draft in rows if draft.kind in SOCIAL_DRAFT_KINDS]
    status_by_draft={}
    if social_ids:
        from .modules.feed import FeedItem
        from .models import WebhookOutbox
        links=db.execute(select(FeedItem.origin_draft_id,FeedItem.id).where(FeedItem.origin_draft_id.in_(social_ids))).all()
        feed_ids=[feed_id for _,feed_id in links]
        if feed_ids:
            deliveries=db.scalars(select(WebhookOutbox).where(WebhookOutbox.feed_item_id.in_(feed_ids)).order_by(WebhookOutbox.created_at.desc(),WebhookOutbox.id.desc())).all()
            draft_by_feed={feed_id:draft_id for draft_id,feed_id in links}
            for event in deliveries:
                draft_id=draft_by_feed.get(event.feed_item_id)
                if draft_id is not None:
                    status_by_draft.setdefault(draft_id,{"id":event.id,"state":event.state,"attempts":event.attempts,"last_error":event.last_error})
    return [serialize_draft(draft,status_by_draft.get(draft.id),query_webhook_status=False) for draft in rows]
@app.post("/api/editorial/drafts",status_code=201)
def create_draft(data:DraftIn,db:Session=Depends(get_db),u=Depends(require_roles("admin","editor"))):
    d=Draft(**data.model_dump(),created_by=u.id);db.add(d);db.commit();db.refresh(d);return serialize_draft(d)
@app.get("/api/editorial/drafts/{did}")
def draft_detail(did:int,db:Session=Depends(get_db),u=Depends(require_roles("admin","editor","reviewer"))):
    d=db.get(Draft,did)
    if not d:raise HTTPException(404,"Draft not found")
    return {**serialize_draft(d),"citations":[{"claim_text":c.claim_text,"chunk_id":c.chunk_id,"asset_id":c.asset_id,"span_text":c.span_text,"supported":c.supported} for c in db.scalars(select(DraftCitation).where(DraftCitation.draft_id==did))],"comments":[{"author_id":c.author_id,"body":c.body,"action":c.action,"created_at":c.created_at} for c in db.scalars(select(DraftComment).where(DraftComment.draft_id==did))]}
@app.delete("/api/editorial/drafts/{did}",status_code=204)
def delete_draft(did:int,db:Session=Depends(get_db),u=Depends(require_roles("admin","editor"))):
    d=db.get(Draft,did)
    if not d:raise HTTPException(404,"Draft not found")
    from .modules.feed import FeedItem, OutreachStory
    linked_item=db.scalar(select(FeedItem).where(FeedItem.origin_draft_id==did))
    linked_story=db.scalar(select(OutreachStory).where(OutreachStory.source_draft_id==did))
    if d.status=="published" or (linked_item and linked_item.status=="published") or (linked_story and linked_story.status=="published"):
        raise HTTPException(409,"Published content cannot be deleted; unpublish it first")
    if linked_item:db.delete(linked_item)
    if linked_story:db.delete(linked_story)
    db.delete(d);db.commit()
@app.post("/api/webhooks/outbox/{event_id}/retry")
def retry_webhook_delivery(event_id:int,db:Session=Depends(get_db),u=Depends(require_roles("admin","editor","reviewer"))):
    from .modules.webhook import retry_webhook_event
    if not retry_webhook_event(db,event_id):raise HTTPException(409,"Webhook event is missing or is not in dead-letter state")
    return {"state":"pending"}
@app.post("/api/editorial/drafts/{did}/comments",status_code=201)
def add_draft_comment(did:int,data:EditorialCommentIn,db:Session=Depends(get_db),u=Depends(require_roles("admin","editor","reviewer"))):
    d=db.get(Draft,did)
    if not d:raise HTTPException(404,"Draft not found")
    comment=DraftComment(draft_id=did,author_id=u.id,body=data.comment.strip(),action="comment")
    if not comment.body:raise HTTPException(422,"Comment cannot be empty")
    db.add(comment);db.commit();db.refresh(comment)
    return {"id":comment.id,"body":comment.body,"action":comment.action,"created_at":comment.created_at,"author_id":u.id}
@app.post("/api/editorial/drafts/{did}/transition")
def transition(did:int,data:TransitionIn,db:Session=Depends(get_db),u=Depends(current_user)):
    d=db.get(Draft,did)
    if not d:raise HTTPException(404,"Draft not found")
    rules={"submit":({"draft","changes_requested"},{"admin","editor"},"in_review"),"approve":({"in_review"},{"admin","reviewer"},"approved"),"request_changes":({"in_review"},{"admin","reviewer"},"changes_requested"),"reject":({"in_review"},{"admin","reviewer"},"rejected"),"schedule":({"approved"},{"admin","editor"},"scheduled"),"publish":({"approved"},{"admin"},"published"),"unschedule":({"scheduled"},{"admin","editor"},"approved"),"unpublish":({"published"},{"admin"},"approved"),"archive":({"draft","changes_requested","approved","scheduled","published"},{"admin"},"archived")}
    rule=rules.get(data.action)
    if not u or not rule or d.status not in rule[0] or u.role not in rule[1]:raise HTTPException(409,"Transition not allowed for this state or role")
    if d.ai_assisted and data.action in {"submit","approve","publish","schedule"}:
        citations=db.scalars(select(DraftCitation).where(DraftCitation.draft_id==did)).all()
        if not citations or any(not citation.supported or not citation.span_text for citation in citations):raise HTTPException(422,"AI-assisted drafts require supported source citations before review or publication")
    d.status=rule[2]
    if data.action=="schedule":
        if not data.scheduled_at:raise HTTPException(422,"scheduled_at required")
        try:d.scheduled_at=datetime.fromisoformat(data.scheduled_at.replace("Z","+00:00"))
        except ValueError:raise HTTPException(422,"scheduled_at must be an ISO-8601 date-time")
        if d.scheduled_at.tzinfo is None or d.scheduled_at<=now():raise HTTPException(422,"scheduled_at must be a future date-time with a timezone")
    if d.status=="published":d.published_at=now()
    if data.action in {"approve","request_changes","reject"}:d.reviewer_id=u.id
    if data.action=="approve":d.approved_at=now()
    if data.action=="unpublish":d.published_at=None;d.scheduled_at=None
    d.updated_at=now()
    linked_states={"submit":"in_review","approve":"approved","request_changes":"changes_requested","reject":"rejected","schedule":"scheduled","publish":"published","unschedule":"approved","unpublish":"approved","archive":"archived"}
    # Cascade status to linked FeedItem for all feed-item-backed kinds
    if d.kind in SOCIAL_DRAFT_KINDS:
        from .modules.feed import FeedItem
        linked_item=db.scalar(select(FeedItem).where(FeedItem.origin_draft_id==did))
        if linked_item and linked_item.status in {"draft","changes_requested","in_review","approved","scheduled","published","archived"}:
            linked_item.kind=SOCIAL_FEED_KIND.get(d.kind,linked_item.kind)
            if data.action == "publish":
                from .modules.webhook import publish_feed_item
                publish_feed_item(db, linked_item)
            else:
                linked_item.status=linked_states[data.action];linked_item.updated_at=now()
            if data.action in {"approve","request_changes","reject"}:linked_item.reviewer_id=u.id
            if data.action=="approve":linked_item.approved_at=now()
            # publish handled above
            if data.action=="schedule":
                linked_item.scheduled_at=d.scheduled_at;linked_item.published_at=None
            if data.action in {"unpublish","unschedule"}:linked_item.published_at=None;linked_item.scheduled_at=None
    # Cascade status to linked OutreachStory for story kind
    elif d.kind=="story":
        from .modules.feed import OutreachStory
        linked_story=db.scalar(select(OutreachStory).where(OutreachStory.source_draft_id==did))
        if linked_story and linked_story.status in {"draft","changes_requested","in_review","approved","scheduled","published","archived"}:
            linked_story.status=linked_states[data.action];linked_story.updated_at=now()
            if data.action in {"approve","request_changes","reject"}:linked_story.reviewer_id=u.id
            if data.action=="approve":linked_story.approved_at=now()
            if data.action=="publish":linked_story.published_at=now()
            if data.action=="schedule":
                linked_story.scheduled_at=d.scheduled_at;linked_story.published_at=None
            if data.action in {"unpublish","unschedule"}:linked_story.published_at=None;linked_story.scheduled_at=None
    db.add(DraftComment(draft_id=did,author_id=u.id,body=data.comment,action=data.action));db.commit();db.refresh(d);return serialize_draft(d)
@app.get("/api/editorial/calendar")
def calendar(month:str|None=None,db:Session=Depends(get_db),u=Depends(require_roles("admin","editor","reviewer"))):return [serialize_draft(d) for d in db.scalars(select(Draft).where(Draft.scheduled_at.is_not(None)).order_by(Draft.scheduled_at))]
@app.get("/api/stories")
def stories(db:Session=Depends(get_db)):return [serialize_public_draft(d,db) for d in db.scalars(select(Draft).where(Draft.kind=="article",Draft.status=="published").order_by(Draft.published_at.desc()))]
@app.get("/api/stories/{sid}")
def story(sid:int,db:Session=Depends(get_db)):
    d=db.get(Draft,sid)
    if not d or d.kind!="article" or d.status!="published":raise HTTPException(404,"Story not found")
    return serialize_public_draft(d,db)
@app.get("/api/generate/sources")
def generate_sources(db:Session=Depends(get_db),u=Depends(require_roles("admin","editor"))):
    rows=db.execute(
        select(Asset,func.count(Chunk.id).label("chunk_count"))
        .outerjoin(Chunk,Chunk.asset_id==Asset.id)
        .where(
            Asset.processing_status=="ready",
            Asset.review_status.in_({"approved", "in_review", "draft"}),
        )
        .group_by(Asset.id)
        .order_by(Asset.created_at.desc())
        .limit(100)
    ).all()
    return [{"id":asset.id,"title":asset.title,"type":asset.type,"region":asset.region,
             "year":asset.year,"expedition_id":asset.expedition_id,
             "record_date":asset.record_date.isoformat() if asset.record_date else None,"authors":asset.authors or [],"tags":[tag.name for tag in asset.tags],"review_status":asset.review_status,"access_level":asset.access_level,"chunk_count":chunk_count}
            for asset,chunk_count in rows]

@app.post("/api/generate")
def generate(payload:dict,db:Session=Depends(get_db),u=Depends(require_roles("admin","editor"))):
    allowed_formats={"article","twitter","instagram","facebook","post","carousel","reel","story"}
    formats=payload.get("formats") or ["article"]
    if not isinstance(formats,list) or not formats or any(kind not in allowed_formats for kind in formats):
        raise HTTPException(422,{"detail":"formats must be a non-empty list of supported outreach formats","supported":sorted(allowed_formats)})
    formats=list(dict.fromkeys(formats))
    audience=payload.get("audience","general public");reading_level=payload.get("reading_level","plain_language");tone=payload.get("tone","informative")
    key_messages=payload.get("key_messages","")
    if not isinstance(audience,str) or not audience.strip() or len(audience)>200: raise HTTPException(422,"audience must be a non-empty value of at most 200 characters")
    if reading_level not in {"plain_language","school","general","technical"}: raise HTTPException(422,"Unsupported reading level")
    if not isinstance(tone,str) or not tone.strip() or len(tone)>100: raise HTTPException(422,"tone must be a non-empty value of at most 100 characters")
    if not isinstance(key_messages,str) or len(key_messages)>2000: raise HTTPException(422,"key_messages must be at most 2000 characters")
    try: max_length=int(payload.get("max_length",1000))
    except (TypeError,ValueError): raise HTTPException(422,"max_length must be an integer")
    if not 100<=max_length<=5000: raise HTTPException(422,"max_length must be between 100 and 5000 characters")
    raw_ids=payload.get("asset_ids") or []
    if not isinstance(raw_ids,list):raise HTTPException(422,"asset_ids must be a list of asset IDs")
    try:
        ids=[int(asset_id) for asset_id in raw_ids]
        expedition_id=int(payload["expedition_id"]) if payload.get("expedition_id") not in (None,"") else None
    except (TypeError,ValueError):raise HTTPException(422,"asset_ids and expedition_id must contain valid integer IDs")
    # Editors may prepare internal, citation-grounded drafts from ready material
    # that is still in draft/review. Only approved assets are public; generation
    # remains restricted to staff and creates an editorial draft requiring review.
    stmt=select(Chunk,Asset).join(Asset,Chunk.asset_id==Asset.id).where(
        Asset.processing_status=="ready",
        Asset.review_status.in_({"approved", "in_review", "draft"}),
    )
    if ids:stmt=stmt.where(Asset.id.in_(ids))
    elif expedition_id:stmt=stmt.where(Asset.expedition_id==expedition_id)
    elif payload.get("theme"):stmt=stmt.where(or_(Asset.title.ilike(f"%{payload['theme']}%"),Chunk.text.ilike(f"%{payload['theme']}%")))
    else:raise HTTPException(422,"Provide asset_ids, expedition_id, or theme")
    rows=db.execute(stmt.order_by(Asset.id,Chunk.idx,Chunk.id).limit(12)).all()
    if not rows:raise HTTPException(422,"No indexed text chunks found for the selected sources. Confirm indexing is complete and the records contain extractable text; draft and in-review records are supported.")
    citations=[]; snippets=[]
    for i,(c,a) in enumerate(rows,1):
        excerpt=c.text[:700];snippets.append(f"[{i}] {excerpt}");citations.append((c,a))
    citation_rows=[{"chunk_id":c.id,"asset_id":a.id,"asset_title":a.title,"text":c.text} for c,a in citations]
    if settings.llm_provider=="openrouter" and not settings.model_api_key:
        raise HTTPException(503,"OpenRouter is selected but MODEL_API_KEY is not configured in the API container. Set it in .env and recreate the API container.")
    if settings.llm_provider=="openrouter" and (not settings.model_name or settings.model_name=="local-fake"):
        raise HTTPException(503,"OpenRouter is selected but MODEL_NAME is not a valid OpenRouter model identifier")
    if settings.llm_provider not in {"openrouter","ollama"}:
        raise HTTPException(503,"AI content generation requires a configured OpenRouter or Ollama provider. Configure the provider and model in the API environment.")
    output=[];linked_content={}
    try:
        for kind in formats:
            title=f"{payload.get('theme') or rows[0][1].title} — {kind.title()}"
            excerpts="\n\n".join(f"> {a.title}: {c.text[:500]}" for c,a in citations[:4])
            if kind=="story":
                body="## Slide 1 — What the sources say\n\n"+"\n\n".join(c.text[:250] for c,a in citations[:4])
            elif kind=="reel":
                body="## Hook\n\nA short science explainer based only on the selected source material.\n\n## Voice-over / scenes\n\n"+excerpts+"\n\n## On-screen source cards\n\n"+"\n".join(f"- {a.title}" for c,a in citations[:4])
            elif kind in {"post","instagram","twitter","facebook","carousel"}:
                body="A source-grounded outreach draft for editorial review.\n\n"+excerpts+"\n\n## Sources\n\n"+"\n".join(f"- {a.title}" for c,a in citations[:4])
            else:
                body="## Introduction\n\nThis draft uses only retrieved repository passages and requires scientific/editorial review.\n\n## Source passages\n\n"+excerpts+"\n\n## Sources\n\n"+"\n".join(f"- {a.title}" for c,a in citations[:4])
            selected_citations=citation_rows
            if settings.llm_provider=="ollama":
                generated=generate_locally(settings.model_name,settings.model_base_url,citation_rows,kind,tone,payload.get("theme",""),audience,reading_level,max_length,key_messages)
                title=generated["title"];body=generated["body_md"];selected_citations=generated["citations"]
            elif settings.llm_provider=="openrouter":
                generated=generate_openrouter(settings.model_name,settings.model_api_key,citation_rows,kind,tone,payload.get("theme",""),audience,reading_level,max_length,key_messages)
                title=generated["title"];body=generated["body_md"];selected_citations=generated["citations"]
            d=Draft(kind=kind,title=title,body_md=body,tone=tone,audience=audience,reading_level=reading_level,max_length=max_length,key_messages=key_messages,status="draft",ai_assisted=True,created_by=u.id,expedition_id=expedition_id);db.add(d);db.flush()
            for item in selected_citations:
                chunk=db.get(Chunk,item["chunk_id"]);span=item.get("span_text",item.get("text",""))
                supported=bool(chunk and span and span in chunk.text)
                if not supported:raise ValueError("A generated claim did not pass exact source-span validation")
                db.add(DraftCitation(draft_id=d.id,claim_text=item.get("claim_text",item.get("text","")[:350]),chunk_id=chunk.id,asset_id=item["asset_id"],span_text=span,supported=True))
            if kind in {"story","post","carousel","reel","instagram","twitter","facebook"}:
                from .modules.feed import FeedCitation, FeedItem, OutreachStory, StoryCitation, StorySlide
                if kind=="story":
                    story=OutreachStory(title=title,summary=body[:500],status="draft",expedition_id=expedition_id,ai_assisted=True,source_draft_id=d.id,created_by=u.id)
                    db.add(story);db.flush()
                    slide=StorySlide(story_id=story.id,position=0,kind="text",title=title,body=body[:3000],duration_seconds=7)
                    db.add(slide);db.flush()
                    for source in selected_citations:
                        db.add(StoryCitation(story_id=story.id,slide_id=slide.id,asset_id=source["asset_id"],chunk_id=source["chunk_id"],claim_text=source.get("claim_text",source.get("text","")[:350]),span_text=source.get("span_text",source.get("text","")),label=source.get("asset_title", ""),supported=True))
                    linked_content[d.id]={"type":"story","id":story.id}
                else:
                    first_asset=db.get(Asset,selected_citations[0]["asset_id"]) if selected_citations else None
                    media_asset=first_asset if first_asset and first_asset.type in {"photo","video"} else None
                    feed_kind=SOCIAL_FEED_KIND[kind]
                    item=FeedItem(kind=feed_kind,caption=body,title=title,description=body,expedition_id=expedition_id,region=first_asset.region if first_asset else None,station=first_asset.station if first_asset else None,primary_asset_id=media_asset.id if media_asset else None,source="auto",origin_draft_id=d.id,status="draft",ai_assisted=True,created_by=u.id)
                    db.add(item);db.flush()
                    for source in selected_citations:
                        db.add(FeedCitation(item_id=item.id,asset_id=source["asset_id"],chunk_id=source["chunk_id"],claim_text=source.get("claim_text",source.get("text","")[:350]),span_text=source.get("span_text",source.get("text","")),label=source.get("asset_title", ""),supported=True))
                    linked_content[d.id]={"type":kind,"id":item.id}
            output.append(d)
        db.commit()
    except Exception as exc:
        db.rollback()
        if isinstance(exc,HTTPException):raise
        if settings.llm_provider in {"ollama","openrouter"}:raise HTTPException(502,f"{settings.llm_provider.title()} generation failed: {str(exc)[:300]}")
        raise HTTPException(422,f"Draft generation failed source validation: {str(exc)[:300]}")
    for draft in output:db.refresh(draft)
    return [{**serialize_draft(d),"linked_content":linked_content.get(d.id),"provider":settings.llm_provider,"notice":"Draft uses retrieved repository sources; exact citation spans are validated. Editorial approval is required before publication.","citations_count":db.scalar(select(func.count(DraftCitation.id)).where(DraftCitation.draft_id==d.id)) or 0,"citations":[{"claim_text":c.claim_text,"chunk_id":c.chunk_id,"asset_id":c.asset_id,"span_text":c.span_text,"supported":c.supported} for c in db.scalars(select(DraftCitation).where(DraftCitation.draft_id==d.id))]} for d in output]
@app.get("/api/config")
def get_config(db:Session=Depends(get_db),u=Depends(require_roles("admin","editor","reviewer"))):return {x.key:x.value_json for x in db.scalars(select(PortalConfig))}
@app.put("/api/config/{key}")
def put_config(key:str,value:dict,db:Session=Depends(get_db),u=Depends(require_roles("admin"))):
    x=db.get(PortalConfig,key) or PortalConfig(key=key,value_json=value);x.value_json=value;db.add(x);db.commit();return {"key":key,"value":value}
@app.get("/api/tags")
def tags(db:Session=Depends(get_db)):return [{"id":x.id,"name":x.name,"kind":x.kind} for x in db.scalars(select(Tag).order_by(Tag.name))]
@app.post("/api/tags",status_code=201)
def add_tag(data:dict,db:Session=Depends(get_db),u=Depends(require_roles("admin","editor"))):
    if not data.get("name"):raise HTTPException(422,"Tag name required")
    x=Tag(name=data["name"].strip(),kind=data.get("kind","theme"));db.add(x);db.commit();db.refresh(x);return {"id":x.id,"name":x.name,"kind":x.kind}
@app.get("/api/analytics/summary")
def analytics(db:Session=Depends(get_db),u=Depends(require_roles("admin","editor","reviewer"))):
    viewed=db.execute(select(Asset.id,Asset.title,func.count(ViewLog.id).label("views")).outerjoin(ViewLog,ViewLog.asset_id==Asset.id).group_by(Asset.id).order_by(func.count(ViewLog.id).desc()).limit(10)).all()
    terms=db.execute(select(SearchLog.query,func.count(SearchLog.id).label("count")).group_by(SearchLog.query).order_by(func.count(SearchLog.id).desc()).limit(10)).all()
    return {"assets":db.scalar(select(func.count(Asset.id))) or 0,"drafts":db.scalar(select(func.count(Draft.id))) or 0,"published_stories":db.scalar(select(func.count(Draft.id)).where(Draft.kind=="article",Draft.status=="published")) or 0,"top_assets":[{"id":x.id,"title":x.title,"views":x.views} for x in viewed],"top_searches":[{"query":x.query,"count":x.count} for x in terms]}
@app.post("/api/worker/tick")
def worker_tick(u=Depends(require_roles("admin"))):return {"status":"worker runs as separate process; scheduler tick enqueued when Redis/RQ is available"}

from .modules.feed import router as feed_router
from .modules.social import router as social_router

app.include_router(feed_router,prefix="/api")
app.include_router(social_router,prefix="/api/social")
# Submitter Endpoints
@app.get("/api/submitter/datasets")
def get_submitter_datasets(db:Session=Depends(get_db),u=Depends(require_roles("submitter", "admin", "editor"))):
    return [serialize_asset(a) for a in db.scalars(select(Asset).where(Asset.created_by==u.id).order_by(Asset.updated_at.desc()))]

@app.get("/api/submitter/datasets/{id}")
def get_submitter_dataset(id:int,db:Session=Depends(get_db),u=Depends(require_roles("submitter", "admin", "editor"))):
    a = db.get(Asset, id)
    if not a: raise HTTPException(404, "Asset not found")
    if a.created_by != u.id and u.role not in {"admin", "editor"}: raise HTTPException(403, "Not authorized")

    chunks = db.scalars(select(Chunk).where(Chunk.asset_id == id).order_by(Chunk.idx, Chunk.id)).all()
    versions = db.scalars(select(AssetVersion).where(AssetVersion.asset_id == id).order_by(AssetVersion.version.desc())).all()
    expedition = {"id":a.expedition.id,"name":a.expedition.name,"stations":a.expedition.stations or []} if a.expedition else None
    version_rows = [{"version":row.version,"timestamp":row.created_at.isoformat() if row.created_at else None,"title":row.snapshot_json.get("title",a.title)} for row in versions]
    if not version_rows:
        version_rows = [{"version":a.version,"timestamp":a.updated_at.isoformat() if a.updated_at else None,"title":a.title}]

    return {"asset":serialize_asset(a),"chunks":[{"id":chunk.id,"page":chunk.page,"text":chunk.text} for chunk in chunks],"versions":version_rows,"expedition":expedition}

@app.post("/api/datasets", status_code=201)
def create_dataset_draft(data:AssetIn,db:Session=Depends(get_db),u=Depends(require_roles("submitter", "admin", "editor"))):
    if data.type not in ASSET_TYPES: raise HTTPException(422,"Unsupported asset type")
    if data.type_details and data.type not in {"report","photo"}: raise HTTPException(422,"Type-specific details are supported for reports and photos")
    a=Asset(**data.model_dump(exclude={"tags","metadata","type_details"}),metadata_json=asset_metadata(data.metadata,data.type_details),created_by=u.id,processing_status="ready",review_status="draft")
    db.add(a);db.flush();apply_asset_tags(db,a,data.tags)
    db.add(AssetVersion(asset_id=a.id,version=1,snapshot_json=data.model_dump(mode="json")))
    db.commit();db.refresh(a)
    return serialize_asset(a)

@app.patch("/api/submitter/datasets/{id}")
def update_submitter_dataset(id:int,data:dict,db:Session=Depends(get_db),u=Depends(require_roles("submitter","admin","editor"))):
    a=db.get(Asset,id)
    if not a: raise HTTPException(404,"Asset not found")
    if a.created_by!=u.id and u.role not in {"admin","editor"}: raise HTTPException(403,"Not authorized")
    if a.review_status not in {"draft","rejected"}: raise HTTPException(409,"Only draft or changes-requested records can be edited")
    editable={"title","description","type","expedition_id","region","station","year","record_date","authors","tags","access_level","external_url","type_details"}
    if set(data)-editable: raise HTTPException(422,"Unsupported metadata fields")
    values={**serialize_asset(a),**data}
    values["metadata"]=a.metadata_json or {}
    try: validated=AssetIn.model_validate(values)
    except Exception as exc: raise HTTPException(422,f"Invalid repository metadata: {str(exc)[:300]}")
    if validated.type not in ASSET_TYPES: raise HTTPException(422,"Unsupported asset type")
    if validated.type_details and validated.type not in {"report","photo"}: raise HTTPException(422,"Type-specific details are supported for reports and photos")
    for key in ("title","description","type","expedition_id","region","station","year","record_date","authors","access_level","external_url"):
        setattr(a,key,getattr(validated,key))
    a.metadata_json=asset_metadata(a.metadata_json,validated.type_details);a.version+=1;a.updated_at=now()
    apply_asset_tags(db,a,validated.tags)
    db.add(AssetVersion(asset_id=a.id,version=a.version,snapshot_json=validated.model_dump(mode="json")))
    db.commit();db.refresh(a);return serialize_asset(a)

@app.post("/api/datasets/{id}/upload", status_code=202)
async def upload_dataset_file(id:int,file:UploadFile=File(...),db:Session=Depends(get_db),u=Depends(require_roles("submitter", "admin", "editor"))):
    a = db.get(Asset, id)
    if not a: raise HTTPException(404, "Asset not found")
    if a.created_by != u.id and u.role not in {"admin", "editor"}: raise HTTPException(403, "Not authorized")
    if a.review_status not in {"draft", "rejected"} and a.processing_status != "failed": raise HTTPException(400, "Can only upload to draft, rejected or failed datasets")

    suffix=(file.filename or "").lower().rsplit(".",1)[-1] if "." in (file.filename or "") else ""
    if suffix not in UPLOAD_EXTENSIONS: raise HTTPException(415,"Unsupported file extension")
    if a.type=="photo" and suffix not in IMAGE_EXTENSIONS:
        raise HTTPException(415,"Photo submissions require an image file")
    if a.type=="video" and suffix!="mp4":
        raise HTTPException(415,"Video submissions currently require an MP4 file")
    data=await file.read(settings.max_upload_mb*1024*1024+1)
    if not data or len(data)>settings.max_upload_mb*1024*1024: raise HTTPException(413,"File empty or exceeds upload limit")
    key=store_file(data,suffix,file.content_type or "application/octet-stream")
    db.query(Chunk).filter(Chunk.asset_id==a.id).delete(synchronize_session=False)
    a.file_key=key
    a.external_url=None
    a.processing_status="processing"
    a.metadata_json = dict(a.metadata_json or {})
    a.metadata_json.update({"filename":file.filename,"content_type":file.content_type,"size":len(data)})
    db.commit()
    ingestion_job_id=enqueue_ingestion(a.id,key,suffix)
    queued=bool(ingestion_job_id)
    if queued:
        a.metadata_json={**(a.metadata_json or {}),"_ingestion_job_id":ingestion_job_id}
        db.commit()
    else:
        try:
            text=extract_text(data,suffix)
            if text:
                for i in range(0,len(text),2500):
                    chunk_text=text[i:i+3000]
                    db.add(Chunk(asset_id=a.id,idx=i//2500,text=chunk_text,embedding=embed(chunk_text)))
            # Even formats without extractable text (for example some media files)
            # completed ingestion successfully and must not remain in "processing".
            a.processing_status="ready";a.review_status="draft";a.error=None;a.updated_at=now();db.commit()
        except Exception as e:
            db.rollback();a=db.get(Asset,id)
            if a:a.processing_status="failed";a.error=str(e)[:1000];a.updated_at=now();db.commit()
    return {"asset":serialize_asset(a),"job_queued":queued}

@app.post("/api/datasets/{id}/transition")
def transition_dataset(id:int,data:TransitionIn,db:Session=Depends(get_db),u=Depends(require_roles("submitter","admin","editor","reviewer"))):
    a = db.get(Asset, id)
    if not a: raise HTTPException(404, "Asset not found")

    rules={
        "submit": ({"draft", "rejected"}, {"submitter", "admin", "editor"}, "in_review"),
        "approve": ({"in_review"}, {"admin", "reviewer"}, "approved"),
        "request_changes": ({"in_review"}, {"admin", "reviewer"}, "rejected"),
        "archive": ({"approved", "draft", "rejected", "in_review"}, {"admin", "editor"}, "archived")
    }
    rule = rules.get(data.action)
    if not rule or a.review_status not in rule[0] or u.role not in rule[1]: raise HTTPException(409, "Transition not allowed for this state or role")
    if data.action == "submit" and a.created_by != u.id and u.role not in {"admin", "editor"}: raise HTTPException(403, "Not authorized to submit")
    if data.action == "submit" and not (a.file_key or a.external_url): raise HTTPException(422,"Attach a source file or HTTPS link before submitting for review")
    if data.action == "submit" and a.processing_status!="ready": raise HTTPException(409,"Wait for file processing to finish before submitting")
    if data.action == "request_changes" and not data.comment.strip(): raise HTTPException(422, "Comment is required when requesting changes")

    from_status = a.review_status
    a.review_status = rule[2]
    a.updated_at = now()

    db.add(AssetReviewHistory(
        asset_id=a.id,
        actor_id=u.id,
        action=data.action,
        from_status=from_status,
        to_status=a.review_status,
        comment=data.comment.strip()
    ))
    db.commit();db.refresh(a)
    return serialize_asset(a)


@app.get("/api/assets/{id}/export/xml")
def export_asset_xml(id:int, db:Session=Depends(get_db),u=Depends(current_user)):
    from fastapi.responses import Response
    from xml.sax.saxutils import escape
    a = db.get(Asset, id)
    if not a or (a.processing_status!="ready" or a.review_status!="approved") or (a.access_level!="public" and (not u or u.role not in {"admin","editor","reviewer"})): raise HTTPException(404, "Asset not found")

    title = escape(a.title or "")
    description = escape(a.description or "")
    region = escape(a.region or "")
    station = escape(a.station or "")
    year_str = escape(str(a.year) if a.year else "")

    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<MD_Metadata xmlns="http://www.isotc211.org/2005/gmd" xmlns:gco="http://www.isotc211.org/2005/gco">
    <fileIdentifier><gco:CharacterString>{a.id}</gco:CharacterString></fileIdentifier>
    <language><gco:CharacterString>eng</gco:CharacterString></language>
    <characterSet><MD_CharacterSetCode codeListValue="utf8"/></characterSet>
    <hierarchyLevel><MD_ScopeCode codeListValue="dataset"/></hierarchyLevel>
    <identificationInfo>
        <MD_DataIdentification>
            <citation>
                <CI_Citation>
                    <title><gco:CharacterString>{title}</gco:CharacterString></title>
                    <date><CI_Date><date><gco:DateTime>{a.created_at.isoformat()}</gco:DateTime></date><dateType><CI_DateTypeCode codeListValue="publication"/></dateType></CI_Date></date>
                </CI_Citation>
            </citation>
            <abstract><gco:CharacterString>{description}</gco:CharacterString></abstract>
            <status><MD_ProgressCode codeListValue="completed"/></status>
            <descriptiveKeywords>
                <MD_Keywords>
                    <keyword><gco:CharacterString>{region}</gco:CharacterString></keyword>
                    <keyword><gco:CharacterString>{station}</gco:CharacterString></keyword>
                    <keyword><gco:CharacterString>{year_str}</gco:CharacterString></keyword>
                </MD_Keywords>
            </descriptiveKeywords>
        </MD_DataIdentification>
    </identificationInfo>
</MD_Metadata>"""
    return Response(content=xml, media_type="application/xml")

@app.get("/api/assets/{id}/export/pdf")
def export_asset_pdf(id:int, db:Session=Depends(get_db),u=Depends(current_user)):
    from fastapi.responses import Response
    from fpdf import FPDF

    a = db.get(Asset, id)
    if not a or (a.processing_status!="ready" or a.review_status!="approved") or (a.access_level!="public" and (not u or u.role not in {"admin","editor","reviewer"})): raise HTTPException(404, "Asset not found")

    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("helvetica", "B", 16)
    pdf.cell(0, 10, "National Polar Data Center - Dataset Metadata", ln=True, align="C")
    pdf.ln(10)

    pdf.set_font("helvetica", "B", 12)
    pdf.cell(40, 10, "Title:")
    pdf.set_font("helvetica", "", 12)
    pdf.multi_cell(0, 10, a.title or "N/A")

    pdf.set_font("helvetica", "B", 12)
    pdf.cell(40, 10, "Type:")
    pdf.set_font("helvetica", "", 12)
    pdf.cell(0, 10, a.type or "N/A", ln=True)

    pdf.set_font("helvetica", "B", 12)
    pdf.cell(40, 10, "Region:")
    pdf.set_font("helvetica", "", 12)
    pdf.cell(0, 10, a.region or "N/A", ln=True)

    pdf.set_font("helvetica", "B", 12)
    pdf.cell(40, 10, "Year:")
    pdf.set_font("helvetica", "", 12)
    pdf.cell(0, 10, str(a.year) if a.year else "N/A", ln=True)

    pdf.set_font("helvetica", "B", 12)
    pdf.cell(40, 10, "Station:")
    pdf.set_font("helvetica", "", 12)
    pdf.cell(0, 10, a.station or "N/A", ln=True)

    pdf.ln(10)
    pdf.set_font("helvetica", "B", 12)
    pdf.cell(0, 10, "Description:", ln=True)
    pdf.set_font("helvetica", "", 12)
    pdf.multi_cell(0, 10, (a.description or "N/A").encode("latin-1", "replace").decode("latin-1"))

    pdf_bytes = pdf.output()
    safe_id = "".join(c for c in str(a.id) if c.isalnum())
    return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=dataset_{safe_id}.pdf"})

def stream_public_asset(a: Asset, request: Request):
    key = a.file_key
    if not key: raise HTTPException(404, "No file key")
    try: total = file_size(key)
    except Exception: raise HTTPException(404, "File not found")
    if total <= 0: raise HTTPException(404, "File is empty")

    import mimetypes
    content_type, _ = mimetypes.guess_type(key)
    if not content_type: content_type = "application/octet-stream"

    start, end = 0, total - 1
    status = 200
    requested = request.headers.get("range")
    if requested:
        match=re.fullmatch(r"bytes=(\d*)-(\d*)",requested.strip())
        if not match or (not match.group(1) and not match.group(2)):
            raise HTTPException(416,"Invalid byte range",headers={"Content-Range":f"bytes */{total}"})
        if match.group(1):
            start=int(match.group(1));end=int(match.group(2)) if match.group(2) else total-1
        else:
            start=max(total-int(match.group(2)),0)
        if start>=total or end<start:
            raise HTTPException(416,"Requested byte range is not satisfiable",headers={"Content-Range":f"bytes */{total}"})
        end=min(end,total-1);status=206

    try: body = stream_file(key, start, end)
    except Exception: raise HTTPException(404, "File is unavailable")

    headers = {
        "Accept-Ranges": "bytes",
        "Content-Length": str(end - start + 1),
        "Cache-Control": "public, max-age=3600"
    }
    if status==206:headers["Content-Range"]=f"bytes {start}-{end}/{total}"
    return StreamingResponse(body, status_code=status, media_type=content_type, headers=headers)

@app.get("/api/public/feed/{item_id}/media/{media_id}")
def public_feed_media(item_id: int, media_id: int, request: Request, db: Session = Depends(get_db)):
    from .modules.feed import FeedItem, FeedMedia
    item = db.get(FeedItem, item_id)
    if not item or item.status != "published":
        raise HTTPException(404, "Feed item not found")
    media = db.get(FeedMedia, media_id)
    if not media or media.item_id != item_id or not media.asset:
        raise HTTPException(404, "Media not found")

    a = media.asset
    if a.processing_status != "ready" or a.review_status != "approved" or a.access_level!="public":
        raise HTTPException(404, "Media asset unavailable")

    return stream_public_asset(a, request)

@app.get("/api/public/feed/{item_id}/asset/{asset_id}")
def public_feed_asset(item_id: int, asset_id: int, request: Request, db: Session = Depends(get_db)):
    from .modules.feed import FeedItem
    item = db.get(FeedItem, item_id)
    if not item or item.status != "published":
        raise HTTPException(404, "Feed item not found")
    if item.primary_asset_id != asset_id:
        raise HTTPException(404, "Media not found")

    a = db.get(Asset, asset_id)
    if not a or a.processing_status != "ready" or a.review_status != "approved" or a.access_level!="public":
        raise HTTPException(404, "Media asset unavailable")

    return stream_public_asset(a, request)
