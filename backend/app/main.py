import logging, re, uuid
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
class AssetIn(BaseModel): type:str; title:str; description:str=""; expedition_id:int|None=None; region:str|None=None; station:str|None=None; year:int|None=None; external_url:str|None=None; tags:list[str]=Field(default_factory=list); metadata:dict=Field(default_factory=dict)
class DraftIn(BaseModel): kind:str; title:str; body_md:str=""; tone:str="general_public"; expedition_id:int|None=None; ai_assisted:bool=False
class TransitionIn(BaseModel): action:str; comment:str=""; scheduled_at:str|None=None
class EditorialCommentIn(BaseModel): comment:str=Field(min_length=1,max_length=5000)
ASSET_TYPES={"report","dataset","publication","photo","video","activity"}; ROLES={"admin","editor","reviewer","viewer","submitter","public_user","pending_submitter"}
SOCIAL_DRAFT_KINDS={"post","carousel","reel","instagram","twitter","facebook"}
SOCIAL_FEED_KIND={"post":"post","carousel":"carousel","reel":"reel","instagram":"post","twitter":"post","facebook":"post"}
def serialize_asset(a): return {"id":a.id,"type":a.type,"title":a.title,"description":a.description,"expedition_id":a.expedition_id,"expedition":a.expedition.name if a.expedition else None,"region":a.region,"station":a.station,"year":a.year,"file_key":a.file_key,"thumb_key":a.thumb_key,"external_url":a.external_url,"status":a.processing_status,"review_status":a.review_status,"error":a.error,"version":a.version,"metadata":a.metadata_json,"created_at":a.created_at.isoformat() if a.created_at else None}
def serialize_draft(d): return {"id":d.id,"kind":d.kind,"title":d.title,"body_md":d.body_md,"tone":d.tone,"status":d.status,"ai_assisted":d.ai_assisted,"expedition_id":d.expedition_id,"scheduled_at":d.scheduled_at,"approved_at":d.approved_at,"published_at":d.published_at,"reviewer_id":d.reviewer_id,"created_at":d.created_at,"updated_at":d.updated_at,"public_story_id": d.id if d.kind == "article" else (d.outreach_stories[0].id if getattr(d, 'outreach_stories', None) and len(d.outreach_stories) > 0 else (d.feed_items[0].id if getattr(d, 'feed_items', None) and len(d.feed_items) > 0 else None))}
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
def assets(type:str|None=None,expedition_id:int|None=None,region:str|None=None,station:str|None=None,year:int|None=None,processing_status:str|None="ready",review_status:str|None="approved",page:int=1,page_size:int=24,db:Session=Depends(get_db)):
    q=select(Asset)
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
    a=Asset(**data.model_dump(exclude={"tags","metadata"}),metadata_json=data.metadata,created_by=u.id);db.add(a);db.flush()
    for name in set(data.tags):
        normalized=name.strip()
        if normalized:
            tag=db.scalar(select(Tag).where(func.lower(Tag.name)==normalized.lower()))
            if not tag:tag=Tag(name=normalized,kind="theme");db.add(tag);db.flush()
            db.add(AssetTag(asset_id=a.id,tag_id=tag.id))
    db.add(AssetVersion(asset_id=a.id,version=1,snapshot_json=data.model_dump(mode="json")));db.commit();db.refresh(a);return serialize_asset(a)
@app.get("/api/assets/{aid}")
def get_asset(aid:int,db:Session=Depends(get_db)):
    a=db.get(Asset,aid)
    if not a or (a.processing_status!="ready" or a.review_status!="approved"): raise HTTPException(404,"Asset not found")
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
    if a and (a.processing_status != "ready" or a.review_status != "approved"):
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
def stream_asset_media(aid:int,request:Request,db:Session=Depends(get_db)):
    asset=db.get(Asset,aid)
    if not asset or (asset.processing_status!="ready" or asset.review_status!="approved") or asset.type!="video" or not asset.file_key:
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
    allowed={"type","title","description","expedition_id","region","station","year","external_url","metadata_json"}
    if "type" in data and data["type"] not in ASSET_TYPES: raise HTTPException(422,"Unsupported asset type")
    for k,v in data.items():
        if k in allowed: setattr(a,k,v)
    a.version+=1;a.updated_at=now();db.add(AssetVersion(asset_id=a.id,version=a.version,snapshot_json=serialize_asset(a)));db.commit();db.refresh(a);return serialize_asset(a)
@app.delete("/api/assets/{aid}",status_code=204)
def delete_asset(aid:int,db:Session=Depends(get_db),u=Depends(require_roles("admin"))):
    a=db.get(Asset,aid)
    if not a: raise HTTPException(404,"Asset not found")
    db.delete(a);db.commit()
@app.post("/api/ingest/upload",status_code=202)
async def upload(file:UploadFile=File(...),title:str=Form(...),type:str=Form("report"),description:str=Form(""),expedition_id:int|None=Form(None),station:str|None=Form(None),region:str|None=Form(None),year:int|None=Form(None),db:Session=Depends(get_db),u=Depends(require_roles("admin","editor"))):
    if type not in ASSET_TYPES: raise HTTPException(422,"Unsupported asset type")
    suffix=(file.filename or "").lower().rsplit(".",1)[-1] if "." in (file.filename or "") else ""
    allowed={"pdf","docx","csv","nc","nc4","jpg","jpeg","png","webp","tif","tiff","mp4","txt"}
    if suffix not in allowed: raise HTTPException(415,"Unsupported file extension")
    data=await file.read(settings.max_upload_mb*1024*1024+1)
    if not data or len(data)>settings.max_upload_mb*1024*1024: raise HTTPException(413,"File empty or exceeds upload limit")
    signatures={"pdf":data.startswith(b"%PDF-"),"jpg":data.startswith(b"\xff\xd8\xff"),"jpeg":data.startswith(b"\xff\xd8\xff"),"png":data.startswith(b"\x89PNG\r\n\x1a\n"),"webp":data.startswith(b"RIFF") and data[8:12]==b"WEBP","mp4":len(data)>12 and data[4:8]==b"ftyp","nc":data.startswith((b"CDF\x01",b"CDF\x02",b"\x89HDF\r\n\x1a\n")),"nc4":data.startswith((b"CDF\x01",b"CDF\x02",b"\x89HDF\r\n\x1a\n")),"docx":data.startswith(b"PK\x03\x04"),"csv":True,"txt":True,"tif":data.startswith((b"II*\x00",b"MM\x00*")),"tiff":data.startswith((b"II*\x00",b"MM\x00*"))}
    if not signatures.get(suffix,False):raise HTTPException(415,"File content does not match its extension")
    key=store_file(data,suffix,file.content_type or "application/octet-stream")
    a=Asset(type=type,title=title,description=description,expedition_id=expedition_id,station=station,region=region,year=year,file_key=key,status="processing",created_by=u.id,metadata_json={"filename":file.filename,"content_type":file.content_type,"size":len(data)})
    db.add(a);db.commit();db.refresh(a)
    queued=enqueue_ingestion(a.id,key,suffix)
    if not queued:
        try:
            text=extract_text(data,suffix)
            if text:
                for i in range(0,len(text),2500):
                    chunk_text=text[i:i+3000]
                    db.add(Chunk(asset_id=a.id,idx=i//2500,text=chunk_text,embedding=embed(chunk_text)))
            a.processing_status="ready";db.commit()
        except Exception as e: a.processing_status="failed";a.error=str(e)[:1000];db.commit()
    return {"asset":serialize_asset(a),"job_queued":queued}
@app.get("/api/ingest/failed")
def failed_ingestion(db:Session=Depends(get_db),u=Depends(require_roles("admin","editor"))):
    return [serialize_asset(a) for a in db.scalars(select(Asset).where(Asset.processing_status=="failed").order_by(Asset.updated_at.desc()))]
@app.post("/api/ingest/{asset_id}/retry",status_code=202)
def retry_ingestion(asset_id:int,db:Session=Depends(get_db),u=Depends(require_roles("admin","editor"))):
    a=db.get(Asset,asset_id)
    if not a or a.processing_status!="failed":raise HTTPException(404,"Failed asset not found")
    if not a.file_key:raise HTTPException(422,"Asset has no source file")
    suffix=(a.metadata_json or {}).get("filename","").lower().rsplit(".",1)[-1]
    a.processing_status="processing";a.error=None;db.commit()
    if not enqueue_ingestion(a.id,a.file_key,suffix):
        a.processing_status="failed";a.error="Redis/RQ unavailable; start the worker before retrying";db.commit();raise HTTPException(503,a.error)
    return {"asset_id":a.id,"status":a.processing_status,"review_status":a.review_status,"queued":True}

@app.get("/api/search")
def search(q:str="",type:str|None=None,expedition:str|None=None,year_from:int|None=None,year_to:int|None=None,region:str|None=None,station:str|None=None,tags:str|None=None,sort:str="relevance",page:int=1,db:Session=Depends(get_db)):
    stmt=select(Asset).where((Asset.processing_status=="ready") & (Asset.review_status=="approved"))
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
            lexical_ids=db.scalars(select(Chunk.asset_id).join(Asset,Asset.id==Chunk.asset_id).where((Asset.processing_status=="ready") & (Asset.review_status=="approved"),func.to_tsvector("english",Chunk.text).op("@@")(func.plainto_tsquery("english",q))).limit(50)).all()
            distance=type_coerce(Chunk.embedding,Vector(384)).cosine_distance(vector)
            semantic_ids=db.scalars(select(Chunk.asset_id).join(Asset,Asset.id==Chunk.asset_id).where((Asset.processing_status=="ready") & (Asset.review_status=="approved"),Chunk.embedding.is_not(None)).order_by(distance).limit(50)).all()
            title_ids=db.scalars(select(Asset.id).where((Asset.processing_status=="ready") & (Asset.review_status=="approved"),or_(*[or_(Asset.title.ilike(f"%{t}%"),Asset.description.ilike(f"%{t}%")) for t in terms])).limit(50)).all() if terms else []
            candidate_ids=set(lexical_ids)|set(semantic_ids)|set(title_ids)
            stmt=stmt.where(Asset.id.in_(candidate_ids))
        else:
            title_ids=db.scalars(select(Asset.id).where((Asset.processing_status=="ready") & (Asset.review_status=="approved"),or_(*[or_(Asset.title.ilike(f"%{t}%"),Asset.description.ilike(f"%{t}%")) for t in terms]))).all() if terms else []
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
    stmt = select(Asset).where((Asset.processing_status=="ready") & (Asset.review_status=="approved"), or_(Asset.type=="photo", Asset.thumb_key.is_not(None), Asset.file_key.ilike("%.jpg"), Asset.file_key.ilike("%.jpeg"), Asset.file_key.ilike("%.png"), Asset.file_key.ilike("%.webp")))
    if q.strip():
        stmt = stmt.where(or_(Asset.title.ilike(f"%{q}%"),Asset.description.ilike(f"%{q}%")))
    items=db.scalars(stmt.order_by(Asset.created_at.desc()).limit(50)).all()
    return {"items":[serialize_asset(a) for a in items],"total":len(items),"mode":"text fallback; configure a local CLIP provider for semantic image retrieval"}

@app.get("/api/editorial/drafts")
def drafts(status:str|None=None,kind:str|None=None,db:Session=Depends(get_db),u=Depends(require_roles("admin","editor","reviewer"))):
    q=select(Draft)
    if status:q=q.where(Draft.status==status)
    if kind:q=q.where(Draft.kind==kind)
    return [serialize_draft(x) for x in db.scalars(q.order_by(Draft.created_at.desc()))]
@app.post("/api/editorial/drafts",status_code=201)
def create_draft(data:DraftIn,db:Session=Depends(get_db),u=Depends(require_roles("admin","editor"))):
    d=Draft(**data.model_dump(),created_by=u.id);db.add(d);db.commit();db.refresh(d);return serialize_draft(d)
@app.get("/api/editorial/drafts/{did}")
def draft_detail(did:int,db:Session=Depends(get_db),u=Depends(require_roles("admin","editor","reviewer"))):
    d=db.get(Draft,did)
    if not d:raise HTTPException(404,"Draft not found")
    return {**serialize_draft(d),"citations":[{"claim_text":c.claim_text,"chunk_id":c.chunk_id,"asset_id":c.asset_id,"span_text":c.span_text,"supported":c.supported} for c in db.scalars(select(DraftCitation).where(DraftCitation.draft_id==did))],"comments":[{"author_id":c.author_id,"body":c.body,"action":c.action,"created_at":c.created_at} for c in db.scalars(select(DraftComment).where(DraftComment.draft_id==did))]}
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
            linked_item.status=linked_states[data.action];linked_item.updated_at=now()
            if data.action in {"approve","request_changes","reject"}:linked_item.reviewer_id=u.id
            if data.action=="approve":linked_item.approved_at=now()
            if data.action=="publish":linked_item.published_at=now()
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
@app.post("/api/generate")
def generate(payload:dict,db:Session=Depends(get_db),u=Depends(require_roles("admin","editor"))):
    allowed_formats={"article","twitter","instagram","facebook","post","carousel","reel","story"}
    formats=payload.get("formats") or ["article"]
    if not isinstance(formats,list) or not formats or any(kind not in allowed_formats for kind in formats):
        raise HTTPException(422,{"detail":"formats must be a non-empty list of supported outreach formats","supported":sorted(allowed_formats)})
    formats=list(dict.fromkeys(formats))
    raw_ids=payload.get("asset_ids") or []
    if not isinstance(raw_ids,list):raise HTTPException(422,"asset_ids must be a list of asset IDs")
    try:
        ids=[int(asset_id) for asset_id in raw_ids]
        expedition_id=int(payload["expedition_id"]) if payload.get("expedition_id") not in (None,"") else None
    except (TypeError,ValueError):raise HTTPException(422,"asset_ids and expedition_id must contain valid integer IDs")
    stmt=select(Chunk,Asset).join(Asset,Chunk.asset_id==Asset.id).where((Asset.processing_status=="ready") & (Asset.review_status=="approved"))
    if ids:stmt=stmt.where(Asset.id.in_(ids))
    elif expedition_id:stmt=stmt.where(Asset.expedition_id==expedition_id)
    elif payload.get("theme"):stmt=stmt.where(or_(Asset.title.ilike(f"%{payload['theme']}%"),Chunk.text.ilike(f"%{payload['theme']}%")))
    else:raise HTTPException(422,"Provide asset_ids, expedition_id, or theme")
    rows=db.execute(stmt.limit(12)).all()
    if not rows:raise HTTPException(422,"No indexed source chunks found; ingest source documents first")
    citations=[]; snippets=[]
    for i,(c,a) in enumerate(rows,1):
        excerpt=c.text[:700];snippets.append(f"[{i}] {excerpt}");citations.append((c,a))
    citation_rows=[{"chunk_id":c.id,"asset_id":a.id,"asset_title":a.title,"text":c.text} for c,a in citations]
    if settings.llm_provider=="openrouter" and not settings.model_api_key:
        raise HTTPException(503,"OpenRouter is selected but MODEL_API_KEY is not configured")
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
                generated=generate_locally(settings.model_name,settings.model_base_url,citation_rows,kind,payload.get("tone","general_public"),payload.get("theme",""))
                title=generated["title"];body=generated["body_md"];selected_citations=generated["citations"]
            elif settings.llm_provider=="openrouter":
                generated=generate_openrouter(settings.model_name,settings.model_api_key,citation_rows,kind,payload.get("tone","general_public"),payload.get("theme",""))
                title=generated["title"];body=generated["body_md"];selected_citations=generated["citations"]
            d=Draft(kind=kind,title=title,body_md=body,tone=payload.get("tone","general_public"),status="draft",ai_assisted=True,created_by=u.id,expedition_id=expedition_id);db.add(d);db.flush()
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
    a=Asset(**data.model_dump(exclude={"tags","metadata"}),metadata_json=data.metadata,created_by=u.id,status="draft")
    db.add(a);db.flush()
    for name in set(data.tags):
        normalized=name.strip()
        if normalized:
            tag=db.scalar(select(Tag).where(func.lower(Tag.name)==normalized.lower()))
            if not tag:tag=Tag(name=normalized,kind="theme");db.add(tag);db.flush()
            db.add(AssetTag(asset_id=a.id,tag_id=tag.id))
    db.add(AssetVersion(asset_id=a.id,version=1,snapshot_json=data.model_dump(mode="json")))
    db.commit();db.refresh(a)
    return serialize_asset(a)

@app.post("/api/datasets/{id}/upload", status_code=202)
async def upload_dataset_file(id:int,file:UploadFile=File(...),db:Session=Depends(get_db),u=Depends(require_roles("submitter", "admin", "editor"))):
    a = db.get(Asset, id)
    if not a: raise HTTPException(404, "Asset not found")
    if a.created_by != u.id and u.role not in {"admin", "editor"}: raise HTTPException(403, "Not authorized")
    if a.review_status not in {"draft", "rejected"} and a.processing_status != "failed": raise HTTPException(400, "Can only upload to draft, rejected or failed datasets")
    
    suffix=(file.filename or "").lower().rsplit(".",1)[-1] if "." in (file.filename or "") else ""
    allowed={"pdf","docx","csv","nc","nc4","jpg","jpeg","png","webp","tif","tiff","mp4","txt", "xml"}
    if suffix not in allowed: raise HTTPException(415,"Unsupported file extension")
    data=await file.read(settings.max_upload_mb*1024*1024+1)
    if not data or len(data)>settings.max_upload_mb*1024*1024: raise HTTPException(413,"File empty or exceeds upload limit")
    key=store_file(data,suffix,file.content_type or "application/octet-stream")
    a.file_key=key
    a.processing_status="processing"
    a.metadata_json = dict(a.metadata_json or {})
    a.metadata_json.update({"filename":file.filename,"content_type":file.content_type,"size":len(data)})
    db.commit()
    queued=enqueue_ingestion(a.id,key,suffix)
    if not queued:
        try:
            text=extract_text(data,suffix)
            if text:
                for i in range(0,len(text),2500):
                    chunk_text=text[i:i+3000]
                    db.add(Chunk(asset_id=a.id,idx=i//2500,text=chunk_text,embedding=embed(chunk_text)))
            # When upload finishes inline, state returns to draft for submitters to review before submitting
            a.review_status="draft";db.commit()
        except Exception as e: a.processing_status="failed";a.error=str(e)[:1000];db.commit()
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
def export_asset_xml(id:int, db:Session=Depends(get_db)):
    from fastapi.responses import Response
    from xml.sax.saxutils import escape
    a = db.get(Asset, id)
    if not a or (a.processing_status!="ready" or a.review_status!="approved"): raise HTTPException(404, "Asset not found")
    
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
def export_asset_pdf(id:int, db:Session=Depends(get_db)):
    from fastapi.responses import Response
    from fpdf import FPDF
    
    a = db.get(Asset, id)
    if not a or (a.processing_status!="ready" or a.review_status!="approved"): raise HTTPException(404, "Asset not found")
    
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
