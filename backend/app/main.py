import logging, uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import select, func, or_, type_coerce
from pydantic import BaseModel, EmailStr, Field
from .core.config import settings
from .core.db import Base, engine, get_db, SessionLocal
from .core.security import hash_password, verify_password, token_for, current_user, require_roles
from .models import *
from .services import store_file, enqueue_ingestion, extract_text
from .embeddings import embed, cosine
from .providers import generate_locally
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

class Login(BaseModel): email: EmailStr; password: str
class UserIn(BaseModel): email: EmailStr; password: str=Field(min_length=12); role: str="viewer"
class ExpeditionIn(BaseModel): name:str; year:int|None=None; region:str|None=None; stations:list[str]=[]; description:str=""
class AssetIn(BaseModel): type:str; title:str; description:str=""; expedition_id:int|None=None; region:str|None=None; year:int|None=None; external_url:str|None=None; tags:list[str]=[]; metadata:dict={}
class DraftIn(BaseModel): kind:str; title:str; body_md:str=""; tone:str="general_public"; expedition_id:int|None=None
class TransitionIn(BaseModel): action:str; comment:str=""; scheduled_at:str|None=None
ASSET_TYPES={"report","dataset","publication","photo","video","activity"}; ROLES={"admin","editor","reviewer","viewer"}
def serialize_asset(a): return {"id":a.id,"type":a.type,"title":a.title,"description":a.description,"expedition_id":a.expedition_id,"expedition":a.expedition.name if a.expedition else None,"region":a.region,"year":a.year,"file_key":a.file_key,"thumb_key":a.thumb_key,"external_url":a.external_url,"status":a.status,"error":a.error,"version":a.version,"metadata":a.metadata_json,"created_at":a.created_at.isoformat() if a.created_at else None}
def serialize_draft(d): return {"id":d.id,"kind":d.kind,"title":d.title,"body_md":d.body_md,"tone":d.tone,"status":d.status,"expedition_id":d.expedition_id,"scheduled_at":d.scheduled_at,"published_at":d.published_at,"created_at":d.created_at}

@app.get("/health")
def health(db:Session=Depends(get_db)):
    try: db.execute(select(1)); db_ok=True
    except Exception: db_ok=False
    return {"status":"ok" if db_ok else "degraded","database":db_ok,"queue":"redis-configured"}
@app.get("/metrics")
def metrics(db:Session=Depends(get_db)):
    return {"assets":db.scalar(select(func.count(Asset.id))) or 0,"drafts":db.scalar(select(func.count(Draft.id))) or 0,"processing_assets":db.scalar(select(func.count(Asset.id)).where(Asset.status=="processing")) or 0}
@app.post("/api/auth/login")
def login(data:Login,request:Request,db:Session=Depends(get_db)):
    enforce_rate_limit(request,"login",10,300)
    u=db.scalar(select(User).where(User.email==data.email.lower()))
    if not u or not u.is_active or not verify_password(data.password,u.password_hash): raise HTTPException(401,"Invalid email or password")
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
@app.post("/api/users",status_code=201)
def create_user(data:UserIn,db:Session=Depends(get_db),u=Depends(require_roles("admin"))):
    if data.role not in ROLES: raise HTTPException(422,"Invalid role")
    if db.scalar(select(User).where(User.email==data.email.lower())): raise HTTPException(409,"Email already exists")
    row=User(email=data.email.lower(),password_hash=hash_password(data.password),role=data.role); db.add(row);db.commit();db.refresh(row);return {"id":row.id,"email":row.email,"role":row.role}
@app.get("/api/users")
def users(db:Session=Depends(get_db),u=Depends(require_roles("admin"))): return [{"id":x.id,"email":x.email,"role":x.role,"is_active":x.is_active} for x in db.scalars(select(User).order_by(User.id))]

@app.get("/api/expeditions")
def expeditions(db:Session=Depends(get_db)): return [{"id":x.id,"name":x.name,"year":x.year,"region":x.region,"stations":x.stations,"description":x.description} for x in db.scalars(select(Expedition).order_by(Expedition.year.desc()))]
@app.post("/api/expeditions",status_code=201)
def add_expedition(data:ExpeditionIn,db:Session=Depends(get_db),u=Depends(require_roles("admin","editor"))):
    row=Expedition(**data.model_dump());db.add(row);db.commit();db.refresh(row);return row
@app.get("/api/expeditions/{eid}")
def expedition(eid:int,db:Session=Depends(get_db)):
    row=db.get(Expedition,eid)
    if not row: raise HTTPException(404,"Expedition not found")
    return row
@app.get("/api/assets")
def assets(type:str|None=None,expedition_id:int|None=None,region:str|None=None,year:int|None=None,status:str="ready",page:int=1,page_size:int=24,db:Session=Depends(get_db)):
    q=select(Asset).where(Asset.status==status)
    if type: q=q.where(Asset.type==type)
    if expedition_id: q=q.where(Asset.expedition_id==expedition_id)
    if region: q=q.where(Asset.region.ilike(f"%{region}%"))
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
    if not a or a.status!="ready": raise HTTPException(404,"Asset not found")
    db.add(ViewLog(asset_id=aid));db.commit();return serialize_asset(a)
@app.patch("/api/assets/{aid}")
def update_asset(aid:int,data:dict,db:Session=Depends(get_db),u=Depends(require_roles("admin","editor"))):
    a=db.get(Asset,aid)
    if not a: raise HTTPException(404,"Asset not found")
    allowed={"type","title","description","expedition_id","region","year","external_url","metadata_json"}
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
async def upload(file:UploadFile=File(...),title:str=Form(...),type:str=Form("report"),description:str=Form(""),expedition_id:int|None=Form(None),db:Session=Depends(get_db),u=Depends(require_roles("admin","editor"))):
    if type not in ASSET_TYPES: raise HTTPException(422,"Unsupported asset type")
    suffix=(file.filename or "").lower().rsplit(".",1)[-1] if "." in (file.filename or "") else ""
    allowed={"pdf","docx","csv","nc","nc4","jpg","jpeg","png","webp","tif","tiff","mp4","txt"}
    if suffix not in allowed: raise HTTPException(415,"Unsupported file extension")
    data=await file.read(settings.max_upload_mb*1024*1024+1)
    if not data or len(data)>settings.max_upload_mb*1024*1024: raise HTTPException(413,"File empty or exceeds upload limit")
    signatures={"pdf":data.startswith(b"%PDF-"),"jpg":data.startswith(b"\xff\xd8\xff"),"jpeg":data.startswith(b"\xff\xd8\xff"),"png":data.startswith(b"\x89PNG\r\n\x1a\n"),"webp":data.startswith(b"RIFF") and data[8:12]==b"WEBP","mp4":len(data)>12 and data[4:8]==b"ftyp","nc":data.startswith((b"CDF\x01",b"CDF\x02",b"\x89HDF\r\n\x1a\n")),"nc4":data.startswith((b"CDF\x01",b"CDF\x02",b"\x89HDF\r\n\x1a\n")),"docx":data.startswith(b"PK\x03\x04"),"csv":True,"txt":True,"tif":data.startswith((b"II*\x00",b"MM\x00*")),"tiff":data.startswith((b"II*\x00",b"MM\x00*"))}
    if not signatures.get(suffix,False):raise HTTPException(415,"File content does not match its extension")
    key=store_file(data,suffix,file.content_type or "application/octet-stream")
    a=Asset(type=type,title=title,description=description,expedition_id=expedition_id,file_key=key,status="processing",created_by=u.id,metadata_json={"filename":file.filename,"content_type":file.content_type,"size":len(data)})
    db.add(a);db.commit();db.refresh(a)
    queued=enqueue_ingestion(a.id,key,suffix)
    if not queued:
        try:
            text=extract_text(data,suffix)
            if text:
                for i in range(0,len(text),2500):
                    chunk_text=text[i:i+3000]
                    db.add(Chunk(asset_id=a.id,idx=i//2500,text=chunk_text,embedding=embed(chunk_text)))
            a.status="ready";db.commit()
        except Exception as e: a.status="failed";a.error=str(e)[:1000];db.commit()
    return {"asset":serialize_asset(a),"job_queued":queued}
@app.get("/api/ingest/failed")
def failed_ingestion(db:Session=Depends(get_db),u=Depends(require_roles("admin","editor"))):
    return [serialize_asset(a) for a in db.scalars(select(Asset).where(Asset.status=="failed").order_by(Asset.updated_at.desc()))]
@app.post("/api/ingest/{asset_id}/retry",status_code=202)
def retry_ingestion(asset_id:int,db:Session=Depends(get_db),u=Depends(require_roles("admin","editor"))):
    a=db.get(Asset,asset_id)
    if not a or a.status!="failed":raise HTTPException(404,"Failed asset not found")
    if not a.file_key:raise HTTPException(422,"Asset has no source file")
    suffix=(a.metadata_json or {}).get("filename","").lower().rsplit(".",1)[-1]
    a.status="processing";a.error=None;db.commit()
    if not enqueue_ingestion(a.id,a.file_key,suffix):
        a.status="failed";a.error="Redis/RQ unavailable; start the worker before retrying";db.commit();raise HTTPException(503,a.error)
    return {"asset_id":a.id,"status":a.status,"queued":True}

@app.get("/api/search")
def search(q:str="",type:str|None=None,expedition:str|None=None,year_from:int|None=None,year_to:int|None=None,region:str|None=None,tags:str|None=None,sort:str="relevance",page:int=1,db:Session=Depends(get_db)):
    stmt=select(Asset).where(Asset.status=="ready")
    if type: stmt=stmt.where(Asset.type==type)
    if expedition:
        if expedition.isdigit(): stmt=stmt.where(Asset.expedition_id==int(expedition))
        else: stmt=stmt.join(Expedition).where(Expedition.name.ilike(f"%{expedition}%"))
    if year_from: stmt=stmt.where(Asset.year>=year_from)
    if year_to: stmt=stmt.where(Asset.year<=year_to)
    if region: stmt=stmt.where(Asset.region.ilike(f"%{region}%"))
    if tags:
        tag_names=[x.strip().lower() for x in tags.split(",") if x.strip()]
        matched=db.scalars(select(AssetTag.asset_id).join(Tag,Tag.id==AssetTag.tag_id).where(func.lower(Tag.name).in_(tag_names))).all()
        stmt=stmt.where(Asset.id.in_(matched))
    terms=[x for x in q.split() if len(x)>1]
    vector=embed(q) if q.strip() else []
    if q.strip() and db.bind.dialect.name=="postgresql":
        lexical_ids=db.scalars(select(Chunk.asset_id).join(Asset,Asset.id==Chunk.asset_id).where(Asset.status=="ready",func.to_tsvector("english",Chunk.text).op("@@")(func.plainto_tsquery("english",q))).limit(50)).all()
        distance=type_coerce(Chunk.embedding,Vector(384)).cosine_distance(vector)
        semantic_ids=db.scalars(select(Chunk.asset_id).join(Asset,Asset.id==Chunk.asset_id).where(Asset.status=="ready",Chunk.embedding.is_not(None)).order_by(distance).limit(50)).all()
        title_ids=db.scalars(select(Asset.id).where(Asset.status=="ready",or_(*[or_(Asset.title.ilike(f"%{t}%"),Asset.description.ilike(f"%{t}%")) for t in terms])).limit(50)).all() if terms else []
        candidate_ids=set(lexical_ids)|set(semantic_ids)|set(title_ids)
        stmt=stmt.where(Asset.id.in_(candidate_ids))
    rows=db.scalars(stmt.order_by(Asset.created_at.desc()).limit(500)).all(); scored=[]
    for a in rows:
        chunks=db.scalars(select(Chunk).where(Chunk.asset_id==a.id)).all()
        searchable=a.title+" "+a.description+" "+" ".join(c.text for c in chunks)
        kw=sum(1 for t in terms if t.lower() in searchable.lower())/max(len(terms),1)
        age=max((datetime.now(timezone.utc)-a.created_at.replace(tzinfo=timezone.utc)).days,0); rec=0.5**(age/365)
        semantic=max((cosine(vector,c.embedding or []) for c in chunks),default=0.0)
        if chunks and vector: score=0.4*kw+0.5*max(semantic,0)+0.1*rec
        else: score=0.4*kw+0.1*rec
        scored.append((score,a))
    scored.sort(key=lambda x:x[0],reverse=True)
    db.add(SearchLog(query=q,filters_json={"type":type,"region":region,"year_from":year_from,"year_to":year_to},n_results=len(scored)));db.commit()
    start=(max(page,1)-1)*20
    return {"items":[{**serialize_asset(a),"score":round(s,4)} for s,a in scored[start:start+20]],"total":len(scored),"page":page,"page_size":20,"mode":"keyword+local semantic hashing embeddings+recency"}
@app.get("/api/search/images")
def image_search(q:str,db:Session=Depends(get_db)):
    if not q.strip(): raise HTTPException(422,"Query required")
    items=db.scalars(select(Asset).where(Asset.type=="photo",Asset.status=="ready",or_(Asset.title.ilike(f"%{q}%"),Asset.description.ilike(f"%{q}%"))).limit(50)).all()
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
@app.post("/api/editorial/drafts/{did}/transition")
def transition(did:int,data:TransitionIn,db:Session=Depends(get_db),u=Depends(current_user)):
    d=db.get(Draft,did)
    if not d:raise HTTPException(404,"Draft not found")
    rules={"submit":({"draft","changes_requested"},{"admin","editor"},"in_review"),"approve":({"in_review"},{"admin","reviewer"},"approved"),"request_changes":({"in_review"},{"admin","reviewer"},"changes_requested"),"reject":({"in_review"},{"admin","reviewer"},"rejected"),"schedule":({"approved"},{"admin","editor"},"scheduled"),"publish":({"approved"},{"admin"},"published"),"unschedule":({"scheduled"},{"admin","editor"},"approved")}
    rule=rules.get(data.action)
    if not u or not rule or d.status not in rule[0] or u.role not in rule[1]:raise HTTPException(409,"Transition not allowed for this state or role")
    d.status=rule[2]
    if data.action=="schedule":
        from datetime import datetime
        if not data.scheduled_at:raise HTTPException(422,"scheduled_at required")
        d.scheduled_at=datetime.fromisoformat(data.scheduled_at.replace("Z","+00:00"))
    if d.status=="published":d.published_at=now()
    if data.action in {"approve","request_changes","reject"}:d.reviewer_id=u.id
    db.add(DraftComment(draft_id=did,author_id=u.id,body=data.comment,action=data.action));db.commit();db.refresh(d);return serialize_draft(d)
@app.get("/api/editorial/calendar")
def calendar(month:str|None=None,db:Session=Depends(get_db),u=Depends(require_roles("admin","editor","reviewer"))):return [serialize_draft(d) for d in db.scalars(select(Draft).where(Draft.scheduled_at.is_not(None)).order_by(Draft.scheduled_at))]
@app.get("/api/stories")
def stories(db:Session=Depends(get_db)):return [serialize_draft(d) for d in db.scalars(select(Draft).where(Draft.kind=="article",Draft.status=="published").order_by(Draft.published_at.desc()))]
@app.get("/api/stories/{sid}")
def story(sid:int,db:Session=Depends(get_db)):
    d=db.get(Draft,sid)
    if not d or d.kind!="article" or d.status!="published":raise HTTPException(404,"Story not found")
    return serialize_draft(d)
@app.post("/api/generate")
def generate(payload:dict,db:Session=Depends(get_db),u=Depends(require_roles("admin","editor"))):
    ids=payload.get("asset_ids") or []
    stmt=select(Chunk,Asset).join(Asset,Chunk.asset_id==Asset.id).where(Asset.status=="ready")
    if ids:stmt=stmt.where(Asset.id.in_(ids))
    elif payload.get("expedition_id"):stmt=stmt.where(Asset.expedition_id==payload["expedition_id"])
    elif payload.get("theme"):stmt=stmt.where(or_(Asset.title.ilike(f"%{payload['theme']}%"),Chunk.text.ilike(f"%{payload['theme']}%")))
    else:raise HTTPException(422,"Provide asset_ids, expedition_id, or theme")
    rows=db.execute(stmt.limit(12)).all()
    if not rows:raise HTTPException(422,"No indexed source chunks found; ingest source documents first")
    citations=[]; snippets=[]
    for i,(c,a) in enumerate(rows,1):
        excerpt=c.text[:700];snippets.append(f"[{i}] {excerpt}");citations.append((c,a))
    title=f"Polar science: {payload.get('theme') or rows[0][1].title}"
    body="## Introduction\n\nThis draft is grounded in the selected archive sources and requires editorial review.\n\n## Key findings\n\n"+"\n\n".join(f"{a.title}: {c.text[:350]}" for c,a in citations[:4])+"\n\n## Sources\n\n"+"\n".join(f"- {a.title}" for c,a in citations)
    citation_rows=[{"chunk_id":c.id,"asset_id":a.id,"asset_title":a.title,"text":c.text} for c,a in citations]
    if settings.llm_provider=="ollama":
        try:
            generated=generate_locally(settings.model_name,settings.model_base_url,citation_rows,(payload.get("formats") or ["article"])[0],payload.get("tone","general_public"),payload.get("theme",""))
            title=generated["title"];body=generated["body_md"];citation_rows=generated["citations"]
        except Exception as exc:
            raise HTTPException(502,f"Local Ollama generation failed citation validation: {str(exc)[:300]}")
    d=Draft(kind=(payload.get("formats") or ["article"])[0],title=title,body_md=body,tone=payload.get("tone","general_public"),status="draft",created_by=u.id);db.add(d);db.flush()
    for item in citation_rows:db.add(DraftCitation(draft_id=d.id,claim_text=item.get("claim_text",item.get("text", "")[:350]),chunk_id=item["chunk_id"],asset_id=item["asset_id"],span_text=item.get("span_text",item.get("text","")[:500]),supported=True))
    db.commit();db.refresh(d)
    return {**serialize_draft(d),"provider":settings.llm_provider,"notice":"Draft is grounded in selected source chunks and citation spans were validated.","citations_count":len(citation_rows),"citations":[{"claim_text":x.get("claim_text",x.get("text","" )[:350]),"chunk_id":x["chunk_id"],"asset_id":x["asset_id"],"span_text":x.get("span_text",x.get("text","" )[:500]),"supported":True} for x in citation_rows]}
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
app.include_router(feed_router,prefix="/api")
