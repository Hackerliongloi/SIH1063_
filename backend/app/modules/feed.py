from datetime import datetime, timezone
from typing import Literal
from urllib.parse import urlparse
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from ..core.db import get_db
from ..core.security import current_user, require_roles
from ..core.rate_limit import enforce_rate_limit
from ..models import AssetTag, Base, Asset, Chunk, Draft, DraftCitation, Expedition, SearchLog, Tag, User, now
from ..embeddings import cosine, embed
from sqlalchemy import String, Text, Integer, Boolean, DateTime, ForeignKey, Float, JSON, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..core.db import Base

router=APIRouter(tags=["feed"])
class FeedItem(Base):
    __tablename__="feed_items"
    id:Mapped[int]=mapped_column(primary_key=True);kind:Mapped[str]=mapped_column(String(20),index=True);caption:Mapped[str]=mapped_column(Text,default="");title:Mapped[str]=mapped_column(String(300),default="");description:Mapped[str]=mapped_column(Text,default="");region:Mapped[str|None]=mapped_column(String(120),nullable=True);station:Mapped[str|None]=mapped_column(String(120),nullable=True);event_at:Mapped[datetime|None]=mapped_column(DateTime(timezone=True),nullable=True);hashtags:Mapped[list]=mapped_column(JSON,default=list);expedition_id:Mapped[int|None]=mapped_column(ForeignKey("expeditions.id",ondelete="SET NULL"),nullable=True);primary_asset_id:Mapped[int|None]=mapped_column(ForeignKey("assets.id",ondelete="SET NULL"),nullable=True);poster_key:Mapped[str|None]=mapped_column(String(800),nullable=True);hls_key:Mapped[str|None]=mapped_column(String(800),nullable=True);mp4_key:Mapped[str|None]=mapped_column(String(800),nullable=True);duration_s:Mapped[int|None]=mapped_column(Integer,nullable=True);aspect:Mapped[str|None]=mapped_column(String(20),nullable=True);source:Mapped[str]=mapped_column(String(20),default="staff");origin_draft_id:Mapped[int|None]=mapped_column(Integer,nullable=True);status:Mapped[str]=mapped_column(String(30),default="draft",index=True);scheduled_at:Mapped[datetime|None]=mapped_column(DateTime(timezone=True),nullable=True);approved_at:Mapped[datetime|None]=mapped_column(DateTime(timezone=True),nullable=True);published_at:Mapped[datetime|None]=mapped_column(DateTime(timezone=True),nullable=True);editorial_boost:Mapped[float]=mapped_column(Float,default=0);rank_score:Mapped[float]=mapped_column(Float,default=0,index=True);like_count:Mapped[int]=mapped_column(Integer,default=0);view_count:Mapped[int]=mapped_column(Integer,default=0);share_count:Mapped[int]=mapped_column(Integer,default=0);ai_assisted:Mapped[bool]=mapped_column(Boolean,default=False);created_by:Mapped[int|None]=mapped_column(ForeignKey("users.id",ondelete="SET NULL"),nullable=True);reviewer_id:Mapped[int|None]=mapped_column(ForeignKey("users.id",ondelete="SET NULL"),nullable=True);created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now);updated_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now,onupdate=now)
    primary_asset=relationship(Asset, foreign_keys="FeedItem.primary_asset_id", lazy="joined")
    media=relationship("FeedMedia", cascade="all, delete-orphan", order_by="FeedMedia.idx", lazy="selectin")
    sources=relationship("FeedCitation", cascade="all, delete-orphan", order_by="FeedCitation.id", lazy="selectin")
class FeedReaction(Base):
    __tablename__="feed_reactions"
    id:Mapped[int]=mapped_column(primary_key=True);item_id:Mapped[int]=mapped_column(ForeignKey("feed_items.id",ondelete="CASCADE"),index=True);anon_id:Mapped[str]=mapped_column(String(64));type:Mapped[str]=mapped_column(String(20));ts:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
    __table_args__=(UniqueConstraint("item_id","anon_id","type"),)
class FeedView(Base):
    __tablename__="feed_views"
    id:Mapped[int]=mapped_column(primary_key=True);item_id:Mapped[int]=mapped_column(ForeignKey("feed_items.id",ondelete="CASCADE"),index=True);anon_id:Mapped[str]=mapped_column(String(64));watch_ms:Mapped[int]=mapped_column(Integer,default=0);ts:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
class FeedMedia(Base):
    __tablename__="feed_item_media"
    id:Mapped[int]=mapped_column(primary_key=True);item_id:Mapped[int]=mapped_column(ForeignKey("feed_items.id",ondelete="CASCADE"),index=True);idx:Mapped[int]=mapped_column(Integer);asset_id:Mapped[int]=mapped_column(ForeignKey("assets.id",ondelete="CASCADE"));kind:Mapped[str]=mapped_column(String(20));alt_text:Mapped[str]=mapped_column(Text,default="")
    asset=relationship(Asset, lazy="joined")
class FeedCitation(Base):
    __tablename__="feed_citations"
    id:Mapped[int]=mapped_column(primary_key=True);item_id:Mapped[int]=mapped_column(ForeignKey("feed_items.id",ondelete="CASCADE"),index=True);asset_id:Mapped[int|None]=mapped_column(ForeignKey("assets.id",ondelete="SET NULL"),nullable=True);chunk_id:Mapped[int|None]=mapped_column(ForeignKey("chunks.id",ondelete="SET NULL"),nullable=True);claim_text:Mapped[str]=mapped_column(Text,default="");span_text:Mapped[str]=mapped_column(Text,default="");source_url:Mapped[str|None]=mapped_column(String(2000),nullable=True);label:Mapped[str]=mapped_column(String(500),default="");supported:Mapped[bool]=mapped_column(Boolean,default=False)
    asset=relationship(Asset, lazy="joined")

class OutreachStory(Base):
    __tablename__="outreach_stories"
    id:Mapped[int]=mapped_column(primary_key=True);title:Mapped[str]=mapped_column(String(300));summary:Mapped[str]=mapped_column(Text,default="");hashtags:Mapped[list]=mapped_column(JSON,default=list);status:Mapped[str]=mapped_column(String(30),default="draft",index=True);expedition_id:Mapped[int|None]=mapped_column(ForeignKey("expeditions.id",ondelete="SET NULL"),nullable=True);region:Mapped[str|None]=mapped_column(String(120),nullable=True);station:Mapped[str|None]=mapped_column(String(120),nullable=True);ai_assisted:Mapped[bool]=mapped_column(Boolean,default=False);source_draft_id:Mapped[int|None]=mapped_column(ForeignKey("drafts.id",ondelete="SET NULL"),nullable=True);created_by:Mapped[int|None]=mapped_column(ForeignKey("users.id",ondelete="SET NULL"),nullable=True);reviewer_id:Mapped[int|None]=mapped_column(ForeignKey("users.id",ondelete="SET NULL"),nullable=True);scheduled_at:Mapped[datetime|None]=mapped_column(DateTime(timezone=True),nullable=True);approved_at:Mapped[datetime|None]=mapped_column(DateTime(timezone=True),nullable=True);published_at:Mapped[datetime|None]=mapped_column(DateTime(timezone=True),nullable=True);expires_at:Mapped[datetime|None]=mapped_column(DateTime(timezone=True),nullable=True);created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now);updated_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now,onupdate=now)
    slides=relationship("StorySlide", cascade="all, delete-orphan", order_by="StorySlide.position", lazy="selectin")
    citations=relationship("StoryCitation", cascade="all, delete-orphan", lazy="selectin")
class StorySlide(Base):
    __tablename__="story_slides"
    id:Mapped[int]=mapped_column(primary_key=True);story_id:Mapped[int]=mapped_column(ForeignKey("outreach_stories.id",ondelete="CASCADE"),index=True);position:Mapped[int]=mapped_column(Integer);kind:Mapped[str]=mapped_column(String(20),default="text");title:Mapped[str]=mapped_column(String(300),default="");body:Mapped[str]=mapped_column(Text,default="");asset_id:Mapped[int|None]=mapped_column(ForeignKey("assets.id",ondelete="SET NULL"),nullable=True);alt_text:Mapped[str]=mapped_column(Text,default="");duration_seconds:Mapped[int]=mapped_column(Integer,default=5)
    asset=relationship(Asset, lazy="joined")
class StoryCitation(Base):
    __tablename__="story_citations"
    id:Mapped[int]=mapped_column(primary_key=True);story_id:Mapped[int]=mapped_column(ForeignKey("outreach_stories.id",ondelete="CASCADE"),index=True);slide_id:Mapped[int|None]=mapped_column(ForeignKey("story_slides.id",ondelete="CASCADE"),nullable=True);asset_id:Mapped[int|None]=mapped_column(ForeignKey("assets.id",ondelete="SET NULL"),nullable=True);chunk_id:Mapped[int|None]=mapped_column(ForeignKey("chunks.id",ondelete="SET NULL"),nullable=True);claim_text:Mapped[str]=mapped_column(Text,default="");span_text:Mapped[str]=mapped_column(Text,default="");source_url:Mapped[str|None]=mapped_column(String(2000),nullable=True);label:Mapped[str]=mapped_column(String(500),default="");supported:Mapped[bool]=mapped_column(Boolean,default=False)
    asset=relationship(Asset, lazy="joined")
class AutogenRule(Base):
    __tablename__="autogen_rules"
    id:Mapped[int]=mapped_column(primary_key=True);name:Mapped[str]=mapped_column(String(200));trigger:Mapped[str]=mapped_column(String(30));template:Mapped[str]=mapped_column(Text,default="");enabled:Mapped[bool]=mapped_column(Boolean,default=False);auto_publish:Mapped[bool]=mapped_column(Boolean,default=False);max_per_day:Mapped[int]=mapped_column(Integer,default=1)

class FeedIn(BaseModel):
    kind:Literal["post","carousel","reel"]="post";caption:str=Field(min_length=1,max_length=10000);title:str=Field(default="",max_length=300);description:str=Field(default="",max_length=5000);region:str|None=Field(default=None,max_length=120);station:str|None=Field(default=None,max_length=120);event_at:datetime|None=None;hashtags:list[str]=Field(default_factory=list);expedition_id:int|None=None;primary_asset_id:int|None=None;ai_assisted:bool=False;editorial_boost:float=Field(default=0,ge=0,le=1)
class ReactionIn(BaseModel): type:str=Field(pattern="^(like|share)$")
class ViewIn(BaseModel): watch_ms:int=Field(default=0,ge=0,le=86400000)
class MediaIn(BaseModel): asset_id:int;kind:Literal["image","video"];alt_text:str=Field(default="",max_length=1000)
class CitationIn(BaseModel): asset_id:int|None=None;chunk_id:int|None=None;slide_position:int|None=Field(default=None,ge=0,le=19);claim_text:str=Field(min_length=1,max_length=5000);span_text:str=Field(default="",max_length=10000);source_url:str|None=None;label:str=Field(default="",max_length=500)
class StorySlideIn(BaseModel): position:int=Field(ge=0,le=19);kind:Literal["text","image","video"]="text";title:str=Field(default="",max_length=300);body:str=Field(default="",max_length=3000);asset_id:int|None=None;alt_text:str=Field(default="",max_length=1000);duration_seconds:int=Field(default=5,ge=2,le=30)
class StoryIn(BaseModel): title:str=Field(min_length=1,max_length=300);summary:str=Field(default="",max_length=3000);hashtags:list[str]=Field(default_factory=list);expedition_id:int|None=None;region:str|None=Field(default=None,max_length=120);station:str|None=Field(default=None,max_length=120);ai_assisted:bool=False;expires_at:datetime|None=None;slides:list[StorySlideIn]=Field(min_length=1,max_length=20);citations:list[CitationIn]=Field(default_factory=list)
def item_json(x):
    asset=x.primary_asset
    serialized_asset=(None if asset is None else {
        "id":asset.id,"type":asset.type,"title":asset.title,
        "external_url":asset.external_url,"file_key":asset.file_key,
        "thumb_key":asset.thumb_key,"metadata":asset.metadata_json or {},
    })
    media=[{"id":m.asset.id,"type":m.kind,"title":m.asset.title,"external_url":m.asset.external_url,"file_key":m.asset.file_key,"thumb_key":m.asset.thumb_key,"alt_text":m.alt_text,"metadata":m.asset.metadata_json or {}} for m in x.media if m.asset]
    if not media and serialized_asset and serialized_asset["type"] in {"photo","video"}:media=[{**serialized_asset,"type":"video" if serialized_asset["type"]=="video" else "image","alt_text":""}]
    sources=[{"asset_id":c.asset_id,"chunk_id":c.chunk_id,"label":c.label or (c.asset.title if c.asset else ""),"source_url":c.source_url or (c.asset.external_url if c.asset else None),"claim_text":c.claim_text,"span_text":c.span_text,"supported":c.supported} for c in x.sources]
    video_media=next((entry.asset for entry in x.media if entry.kind=="video" and entry.asset),None)
    video_url=x.mp4_key or (asset.external_url if asset and asset.type=="video" else video_media.external_url if video_media else None)
    return {"id":x.id,"kind":x.kind,"caption":x.caption,"title":x.title,"description":x.description,"region":x.region,"station":x.station,"event_at":x.event_at,"hashtags":x.hashtags,"expedition_id":x.expedition_id,"primary_asset_id":x.primary_asset_id,"primary_asset":serialized_asset,"media":media,"sources":sources,"poster_key":x.poster_key,"hls_key":x.hls_key,"mp4_key":x.mp4_key,"video_url":video_url,"duration_s":x.duration_s,"aspect":x.aspect,"status":x.status,"scheduled_at":x.scheduled_at,"approved_at":x.approved_at,"published_at":x.published_at,"updated_at":x.updated_at,"rank_score":x.rank_score,"like_count":x.like_count,"view_count":x.view_count,"share_count":x.share_count,"ai_assisted":x.ai_assisted,"source":x.source}

def citation_row(data:CitationIn, story_id:int|None=None, slide_id:int|None=None, item_id:int|None=None, db:Session|None=None):
    if data.source_url and (urlparse(data.source_url).scheme != "https" or not urlparse(data.source_url).netloc):
        raise HTTPException(422,"Citation source_url must be an HTTPS URL")
    chunk=db.get(Chunk,data.chunk_id) if db and data.chunk_id else None
    asset=db.get(Asset,data.asset_id) if db and data.asset_id else None
    if data.chunk_id and not chunk:raise HTTPException(422,"Citation chunk not found")
    if data.asset_id and (not asset or asset.status!="ready"):raise HTTPException(422,"Citation asset is unavailable")
    if chunk and data.asset_id and chunk.asset_id!=data.asset_id:raise HTTPException(422,"Citation chunk does not belong to the selected asset")
    if chunk and not data.asset_id:
        asset=db.get(Asset,chunk.asset_id)
    supported=bool(chunk and data.span_text.strip() and data.span_text.strip() in chunk.text)
    if data.chunk_id and not supported:raise HTTPException(422,"Citation span must exactly match the referenced source chunk")
    values={"asset_id":asset.id if asset else data.asset_id,"chunk_id":chunk.id if chunk else None,"claim_text":data.claim_text,"span_text":data.span_text,"source_url":data.source_url,"label":data.label or (asset.title if asset else ""),"supported":supported}
    if story_id is not None:return StoryCitation(story_id=story_id,slide_id=slide_id,**values)
    return FeedCitation(item_id=item_id,**values)

def story_json(story:OutreachStory):
    return {"id":story.id,"title":story.title,"summary":story.summary,"hashtags":story.hashtags,"status":story.status,"expedition_id":story.expedition_id,"region":story.region,"station":story.station,"ai_assisted":story.ai_assisted,"scheduled_at":story.scheduled_at,"approved_at":story.approved_at,"published_at":story.published_at,"expires_at":story.expires_at,"created_at":story.created_at,"updated_at":story.updated_at,"slides":[{"id":s.id,"position":s.position,"kind":s.kind,"title":s.title,"body":s.body,"asset_id":s.asset_id,"asset_url":s.asset.external_url if s.asset else None,"file_key":s.asset.file_key if s.asset else None,"thumb_key":s.asset.thumb_key if s.asset else None,"alt_text":s.alt_text,"duration_seconds":s.duration_seconds} for s in story.slides],"sources":[{"slide_id":c.slide_id,"asset_id":c.asset_id,"chunk_id":c.chunk_id,"label":c.label or (c.asset.title if c.asset else ""),"source_url":c.source_url or (c.asset.external_url if c.asset else None),"claim_text":c.claim_text,"span_text":c.span_text,"supported":c.supported} for c in story.citations]}
def anon_cookie(request:Request,response:Response):
    import secrets
    raw=request.cookies.get("polar_anon")
    if raw and len(raw)<128:return raw
    raw=secrets.token_urlsafe(24)
    response.set_cookie("polar_anon",raw,max_age=31536000,httponly=True,samesite="lax",secure=request.url.scheme=="https")
    return raw

def _story_expired(story:OutreachStory)->bool:
    expires=story.expires_at
    if not expires:return False
    if expires.tzinfo is None:expires=expires.replace(tzinfo=timezone.utc)
    return expires<=now()

def _write_story(story:OutreachStory,data:StoryIn,db:Session):
    if data.expires_at and data.expires_at.tzinfo is None:raise HTTPException(422,"expires_at must include a timezone")
    if data.expedition_id and not db.get(Expedition,data.expedition_id):raise HTTPException(422,"Expedition not found")
    positions=[slide.position for slide in data.slides]
    if len(set(positions))!=len(positions):raise HTTPException(422,"Story slide positions must be unique")
    if len(positions)>1 and sorted(positions)!=list(range(len(positions))):raise HTTPException(422,"Story slide positions must be sequential starting at zero")
    assets={}
    for slide in data.slides:
        if slide.kind in {"image","video"} and slide.asset_id is None:raise HTTPException(422,f"Slide {slide.position} requires an asset")
        if slide.asset_id:
            asset=db.get(Asset,slide.asset_id)
            if not asset or asset.status!="ready":raise HTTPException(422,f"Slide asset {slide.asset_id} is unavailable")
            if slide.kind=="image" and asset.type!="photo":raise HTTPException(422,"Image slides require photo assets")
            if slide.kind=="video" and asset.type!="video":raise HTTPException(422,"Video slides require video assets")
            assets[slide.position]=asset
    slide_rows={entry.position:StorySlide(position=entry.position,kind=entry.kind,title=entry.title,body=entry.body,asset_id=entry.asset_id,alt_text=entry.alt_text,duration_seconds=entry.duration_seconds) for entry in data.slides}
    story.title=data.title;story.summary=data.summary;story.hashtags=data.hashtags;story.expedition_id=data.expedition_id;story.region=data.region;story.station=data.station;story.ai_assisted=data.ai_assisted;story.expires_at=data.expires_at
    story.slides.clear();story.slides.extend(slide_rows.values());db.flush()
    for citation in data.citations:
        if citation.slide_position is not None and citation.slide_position not in slide_rows:raise HTTPException(422,"Citation references an unknown story slide")
        db.add(citation_row(citation,story_id=story.id,slide_id=slide_rows[citation.slide_position].id if citation.slide_position is not None else None,db=db))

@router.get("/outreach/stories")
def public_stories(limit:int=20,db:Session=Depends(get_db)):
    rows=db.scalars(select(OutreachStory).where(OutreachStory.status=="published").order_by(OutreachStory.published_at.desc(),OutreachStory.id.desc()).limit(min(max(limit,1),50))).all()
    return [story_json(story) for story in rows if not _story_expired(story)]

@router.get("/outreach/stories/manage")
def manage_stories(status:str|None=None,db:Session=Depends(get_db),u=Depends(require_roles("admin","editor","reviewer"))):
    q=select(OutreachStory)
    if status:q=q.where(OutreachStory.status==status)
    return [story_json(story) for story in db.scalars(q.order_by(OutreachStory.updated_at.desc()))]

@router.post("/outreach/stories",status_code=201)
def create_story(data:StoryIn,db:Session=Depends(get_db),u=Depends(require_roles("admin","editor"))):
    story=OutreachStory(title=data.title,summary=data.summary,created_by=u.id,status="draft")
    db.add(story);db.flush()
    try:_write_story(story,data,db);db.commit();db.refresh(story)
    except Exception:db.rollback();raise
    return story_json(story)

@router.put("/outreach/stories/{story_id}")
def update_story(story_id:int,data:StoryIn,db:Session=Depends(get_db),u=Depends(require_roles("admin","editor"))):
    story=db.get(OutreachStory,story_id)
    if not story:raise HTTPException(404,"Story not found")
    if story.status not in {"draft","changes_requested"}:raise HTTPException(409,"Only draft stories can be edited")
    story.citations.clear()
    try:_write_story(story,data,db);story.updated_at=now();db.commit();db.refresh(story)
    except Exception:db.rollback();raise
    return story_json(story)

@router.get("/outreach/stories/{story_id}")
def get_public_story(story_id:int,db:Session=Depends(get_db)):
    story=db.get(OutreachStory,story_id)
    if not story or story.status!="published" or _story_expired(story):raise HTTPException(404,"Story not found")
    return story_json(story)

@router.post("/outreach/stories/{story_id}/transition")
def transition_story(story_id:int,data:dict,db:Session=Depends(get_db),u=Depends(current_user)):
    story=db.get(OutreachStory,story_id)
    if not story:raise HTTPException(404,"Story not found")
    action=data.get("action")
    rules={"submit":({"draft","changes_requested"},{"admin","editor"},"in_review"),"approve":({"in_review"},{"admin","reviewer"},"approved"),"request_changes":({"in_review"},{"admin","reviewer"},"changes_requested"),"reject":({"in_review"},{"admin","reviewer"},"rejected"),"schedule":({"approved"},{"admin","editor"},"scheduled"),"publish":({"approved"},{"admin"},"published"),"unpublish":({"published"},{"admin"},"approved"),"archive":({"draft","changes_requested","approved","scheduled","published"},{"admin"},"archived")}
    rule=rules.get(action)
    if not u or not rule or story.status not in rule[0] or u.role not in rule[1]:raise HTTPException(409,"Transition not allowed for this state or role")
    if action=="submit" and story.ai_assisted:
        supported_slide_ids={cite.slide_id for cite in story.citations if cite.supported and cite.slide_id is not None}
        missing=[slide.position for slide in story.slides if slide.body.strip() and slide.id not in supported_slide_ids]
        if missing:raise HTTPException(422,{"detail":"Every AI-assisted story slide needs an exact-span validated citation before review","slides_missing_sources":missing})
    if action=="schedule":
        try:scheduled=datetime.fromisoformat(str(data.get("scheduled_at","")).replace("Z","+00:00"))
        except ValueError:raise HTTPException(422,"scheduled_at must be an ISO-8601 date-time")
        if scheduled.tzinfo is None or scheduled<=now():raise HTTPException(422,"scheduled_at must be a future date-time with a timezone")
        story.scheduled_at=scheduled
    story.status=rule[2]
    if action in {"approve","request_changes","reject"}:story.reviewer_id=u.id
    if action=="approve":story.approved_at=now()
    if story.status=="published":story.published_at=now()
    if action=="unpublish":story.published_at=None;story.scheduled_at=None
    story.updated_at=now();db.commit();db.refresh(story);return story_json(story)

@router.get("/feed")
def feed(cursor:str|None=None,tab:str="for_you",expedition:int|None=None,tag:str|None=None,region:str|None=None,station:str|None=None,year:int|None=None,content_type:str|None=None,limit:int=20,db:Session=Depends(get_db)):
    if tab not in {"for_you","latest"}:raise HTTPException(422,"tab must be for_you or latest")
    q=select(FeedItem).where(FeedItem.status=="published")
    if expedition:q=q.where(FeedItem.expedition_id==expedition)
    if tag:q=q.where(FeedItem.hashtags.contains([tag]))
    if region or year:q=q.outerjoin(Expedition,FeedItem.expedition_id==Expedition.id)
    if content_type:
        if content_type not in {"post","carousel","reel"}:raise HTTPException(422,"Invalid content_type")
        q=q.where(FeedItem.kind==content_type)
    if region:q=q.where((FeedItem.region.ilike(f"%{region}%"))|(Expedition.region.ilike(f"%{region}%")))
    if station:q=q.where(FeedItem.station.ilike(f"%{station}%"))
    if year:q=q.where(((FeedItem.event_at.is_not(None))&(func.extract("year",FeedItem.event_at)==year)) | (Expedition.year==year))
    if cursor:
        try:
            if tab=="latest":
                published_text,item_text=cursor.rsplit(":",1);published=datetime.fromisoformat(published_text);item_id=int(item_text)
                q=q.where((FeedItem.published_at<published)|((FeedItem.published_at==published)&(FeedItem.id<item_id)))
            else:
                score,item_text=cursor.split(":",1);item_id=int(item_text);rank=float(score)
                q=q.where((FeedItem.rank_score<rank)|((FeedItem.rank_score==rank)&(FeedItem.id<item_id)))
        except ValueError:raise HTTPException(400,"Invalid cursor")
    ordering=(FeedItem.published_at.desc(),FeedItem.id.desc()) if tab=="latest" else (FeedItem.rank_score.desc(),FeedItem.id.desc())
    rows=db.scalars(q.order_by(*ordering).limit(min(max(limit,1),50)+1)).all();more=len(rows)>min(max(limit,1),50);rows=rows[:min(max(limit,1),50)]
    last=rows[-1] if more and rows else None
    next_cursor=(f"{last.published_at.isoformat()}:{last.id}" if tab=="latest" and last and last.published_at else f"{last.rank_score}:{last.id}" if last else None)
    return {"items":[item_json(x) for x in rows],"next_cursor":next_cursor}
@router.get("/feed/reels")
def reels(cursor:str|None=None,limit:int=20,db:Session=Depends(get_db)):
    q=select(FeedItem).where(FeedItem.status=="published",FeedItem.kind=="reel")
    if cursor:
        try:dt=datetime.fromisoformat(cursor);q=q.where(FeedItem.published_at<dt)
        except ValueError:raise HTTPException(400,"Invalid cursor")
    rows=db.scalars(q.order_by(FeedItem.published_at.desc()).limit(min(max(limit,1),50)+1)).all();more=len(rows)>min(max(limit,1),50);rows=rows[:min(max(limit,1),50)]
    return {"items":[item_json(x) for x in rows],"next_cursor":rows[-1].published_at.isoformat() if more and rows else None}

@router.get("/discovery/search")
def discovery_search(q:str="",content_type:str|None=None,region:str|None=None,expedition_id:int|None=None,year_from:int|None=None,year_to:int|None=None,station:str|None=None,theme:str|None=None,page:int=1,page_size:int=20,db:Session=Depends(get_db)):
    allowed={"report","dataset","publication","photo","video","activity","post","carousel","reel","story","article"}
    if content_type and content_type not in allowed:raise HTTPException(422,"Unsupported content_type")
    terms=[word.lower() for word in q.split() if len(word)>1]
    vector=embed(q) if q.strip() else []
    results=[]
    def score_record(title:str,body:str,source_chunks:list[Chunk],published_at:datetime|None,kind:str,record:dict):
        text=f"{title} {body}".lower()
        keyword=sum(1 for term in terms if term in text)/max(len(terms),1)
        semantic=max((cosine(vector,chunk.embedding or []) for chunk in source_chunks),default=0.0) if vector else 0.0
        instant=published_at or now()
        if instant.tzinfo is None:instant=instant.replace(tzinfo=timezone.utc)
        age_days=max((now()-instant).total_seconds()/86400,0);recency=0.5**(age_days/365)
        rank=0.4*keyword+0.5*max(semantic,0)+0.1*recency if terms else recency
        results.append({"kind":kind,"score":round(rank,5),"title":title,"record":record})

    if not content_type or content_type in {"report","dataset","publication","photo","video","activity"}:
        query=select(Asset).where(Asset.status=="ready")
        if content_type:query=query.where(Asset.type==content_type)
        if region:query=query.where(Asset.region.ilike(f"%{region}%"))
        if station:query=query.where(Asset.station.ilike(f"%{station}%"))
        if expedition_id:query=query.where(Asset.expedition_id==expedition_id)
        if year_from:query=query.where(Asset.year>=year_from)
        if year_to:query=query.where(Asset.year<=year_to)
        if theme:
            ids=db.scalars(select(AssetTag.asset_id).join(Tag,Tag.id==AssetTag.tag_id).where(func.lower(Tag.name)==theme.lower())).all()
            query=query.where(Asset.id.in_(ids))
        for asset in db.scalars(query.order_by(Asset.created_at.desc()).limit(300)).all():
            chunks=db.scalars(select(Chunk).where(Chunk.asset_id==asset.id).limit(20)).all()
            record={"id":asset.id,"type":asset.type,"title":asset.title,"description":asset.description,"region":asset.region,"station":asset.station,"year":asset.year,"expedition_id":asset.expedition_id,"external_url":asset.external_url,"file_key":asset.file_key,"thumb_key":asset.thumb_key,"metadata":asset.metadata_json or {}}
            score_record(asset.title,asset.description,chunks,asset.created_at,asset.type,record)

    if not content_type or content_type in {"post","carousel","reel"}:
        query=select(FeedItem).where(FeedItem.status=="published")
        if content_type:query=query.where(FeedItem.kind==content_type)
        if region:query=query.where(FeedItem.region.ilike(f"%{region}%"))
        if station:query=query.where(FeedItem.station.ilike(f"%{station}%"))
        if expedition_id:query=query.where(FeedItem.expedition_id==expedition_id)
        for item in db.scalars(query.order_by(FeedItem.published_at.desc()).limit(300)).all():
            if year_from or year_to:
                year=item.event_at.year if item.event_at else None
                if year is None and item.expedition_id:
                    expedition=db.get(Expedition,item.expedition_id);year=expedition.year if expedition else None
                if year is None or (year_from and year<year_from) or (year_to and year>year_to):continue
            if theme and theme.lower() not in [tag.lower().lstrip("#") for tag in (item.hashtags or [])]:continue
            chunks=[db.get(Chunk,source.chunk_id) for source in item.sources if source.chunk_id]
            chunks=[chunk for chunk in chunks if chunk]
            score_record(item.title or item.caption,item.description+" "+item.caption,chunks,item.published_at,item.kind,item_json(item))

    if not content_type or content_type in {"story","article"}:
        query=select(OutreachStory).where(OutreachStory.status=="published")
        if region:query=query.where(OutreachStory.region.ilike(f"%{region}%"))
        if station:query=query.where(OutreachStory.station.ilike(f"%{station}%"))
        if expedition_id:query=query.where(OutreachStory.expedition_id==expedition_id)
        if content_type=="article":query=query.where(OutreachStory.source_draft_id.is_not(None))
        for story in db.scalars(query.order_by(OutreachStory.published_at.desc()).limit(300)).all():
            if _story_expired(story):continue
            if theme and theme.lower() not in [tag.lower().lstrip("#") for tag in (story.hashtags or [])]:continue
            if year_from or year_to:
                expedition=db.get(Expedition,story.expedition_id) if story.expedition_id else None
                year=expedition.year if expedition else None
                if year is None or (year_from and year<year_from) or (year_to and year>year_to):continue
            chunks=[db.get(Chunk,source.chunk_id) for source in story.citations if source.chunk_id]
            chunks=[chunk for chunk in chunks if chunk]
            body=" ".join(slide.title+" "+slide.body for slide in story.slides)
            score_record(story.title,story.summary+" "+body,chunks,story.published_at,"story",story_json(story))
    if not content_type or content_type=="article":
        query=select(Draft).where(Draft.status=="published",Draft.kind=="article")
        if expedition_id:query=query.where(Draft.expedition_id==expedition_id)
        for article in db.scalars(query.order_by(Draft.published_at.desc()).limit(300)).all():
            if year_from or year_to:
                expedition=db.get(Expedition,article.expedition_id) if article.expedition_id else None
                year=expedition.year if expedition else None
                if year is None or (year_from and year<year_from) or (year_to and year>year_to):continue
            citations=db.scalars(select(DraftCitation).where(DraftCitation.draft_id==article.id)).all()
            chunks=[db.get(Chunk,citation.chunk_id) for citation in citations if citation.chunk_id]
            chunks=[chunk for chunk in chunks if chunk]
            record={"id":article.id,"kind":article.kind,"title":article.title,"body_md":article.body_md,"expedition_id":article.expedition_id,"published_at":article.published_at,"citations":[{"asset_id":cite.asset_id,"chunk_id":cite.chunk_id,"claim_text":cite.claim_text,"span_text":cite.span_text,"supported":cite.supported} for cite in citations]}
            score_record(article.title,article.body_md,chunks,article.published_at,"article",record)
    results.sort(key=lambda entry:entry["score"],reverse=True)
    db.add(SearchLog(query=q,filters_json={"content_type":content_type,"region":region,"expedition_id":expedition_id,"year_from":year_from,"year_to":year_to,"station":station,"theme":theme},n_results=len(results)));db.commit()
    size=min(max(page_size,1),50);start=(max(page,1)-1)*size
    return {"items":results[start:start+size],"total":len(results),"page":max(page,1),"page_size":size,"mode":"keyword + local semantic source chunks + recency"}

@router.get("/feed/{item_id}")
def get_feed_item(item_id:int,db:Session=Depends(get_db)):
    x=db.get(FeedItem,item_id)
    if not x or x.status!="published":raise HTTPException(404,"Feed item not found")
    return item_json(x)
@router.post("/feed/{item_id}/react")
def react(item_id:int,data:ReactionIn,request:Request,response:Response,db:Session=Depends(get_db)):
    enforce_rate_limit(request,"feed-write",30,60)
    x=db.get(FeedItem,item_id)
    if not x or x.status!="published":raise HTTPException(404,"Feed item not found")
    anon=anon_cookie(request,response);prior=db.scalar(select(FeedReaction).where(FeedReaction.item_id==item_id,FeedReaction.anon_id==anon,FeedReaction.type==data.type))
    if prior:
        db.delete(prior)
        if data.type=="like":x.like_count=max(0,x.like_count-1)
        else:x.share_count=max(0,x.share_count-1)
    else:db.add(FeedReaction(item_id=item_id,anon_id=anon,type=data.type));x.like_count+=1 if data.type=="like" else 0;x.share_count+=1 if data.type=="share" else 0
    db.commit();return {"liked":not bool(prior),"like_count":x.like_count,"share_count":x.share_count}
@router.post("/feed/{item_id}/view",status_code=202)
def view(item_id:int,data:ViewIn,request:Request,response:Response,db:Session=Depends(get_db)):
    enforce_rate_limit(request,"feed-write",30,60)
    x=db.get(FeedItem,item_id)
    if not x or x.status!="published":raise HTTPException(404,"Feed item not found")
    db.add(FeedView(item_id=item_id,anon_id=anon_cookie(request,response),watch_ms=data.watch_ms));x.view_count+=1;db.commit();return {"accepted":True}
@router.post("/feed/items",status_code=201)
def create_item(data:FeedIn,db:Session=Depends(get_db),u=Depends(require_roles("admin","editor"))):
    if data.expedition_id and not db.get(Expedition,data.expedition_id):raise HTTPException(422,"Expedition not found")
    if data.primary_asset_id:
        asset=db.get(Asset,data.primary_asset_id)
        if not asset or asset.status!="ready":raise HTTPException(422,"Primary asset is unavailable")
    x=FeedItem(**data.model_dump(),status="draft",created_by=u.id);db.add(x);db.commit();db.refresh(x);return item_json(x)

@router.put("/feed/items/{item_id}/media")
def replace_item_media(item_id:int,items:list[MediaIn],db:Session=Depends(get_db),u=Depends(require_roles("admin","editor"))):
    item=db.get(FeedItem,item_id)
    if not item:raise HTTPException(404,"Feed item not found")
    if item.status not in {"draft","changes_requested"}:raise HTTPException(409,"Media can only be edited on a draft")
    if len(items)>20:raise HTTPException(422,"A post can contain at most 20 media items")
    assets=[]
    for entry in items:
        asset=db.get(Asset,entry.asset_id)
        if not asset or asset.status!="ready":raise HTTPException(422,f"Asset {entry.asset_id} is unavailable")
        if entry.kind=="image" and asset.type!="photo":raise HTTPException(422,"Image media must reference a photo asset")
        if entry.kind=="video" and asset.type!="video":raise HTTPException(422,"Video media must reference a video asset")
        assets.append(asset)
    item.media.clear()
    item.media.extend(FeedMedia(idx=i,asset_id=asset.id,kind=items[i].kind,alt_text=items[i].alt_text) for i,asset in enumerate(assets))
    if assets:
        item.primary_asset_id=assets[0].id
        video=next((asset for asset,entry in zip(assets,items) if entry.kind=="video"),None)
        if video:item.mp4_key=video.file_key
    db.commit();db.refresh(item);return item_json(item)

@router.post("/feed/items/{item_id}/sources",status_code=201)
def add_item_source(item_id:int,data:CitationIn,db:Session=Depends(get_db),u=Depends(require_roles("admin","editor"))):
    item=db.get(FeedItem,item_id)
    if not item:raise HTTPException(404,"Feed item not found")
    if item.status not in {"draft","changes_requested"}:raise HTTPException(409,"Sources can only be edited on a draft")
    if not data.asset_id and not data.source_url:raise HTTPException(422,"A source asset or HTTPS source URL is required")
    row=citation_row(data,item_id=item_id,db=db);db.add(row);db.commit();db.refresh(row)
    return {"id":row.id,"asset_id":row.asset_id,"chunk_id":row.chunk_id,"label":row.label,"source_url":row.source_url,"claim_text":row.claim_text,"span_text":row.span_text,"supported":row.supported}
@router.patch("/feed/items/{item_id}")
def edit_item(item_id:int,data:dict,db:Session=Depends(get_db),u=Depends(require_roles("admin","editor"))):
    x=db.get(FeedItem,item_id)
    if not x:raise HTTPException(404,"Feed item not found")
    if x.status in {"published","rejected"}:raise HTTPException(409,"Cannot edit this item in its current state")
    for k in {"caption","hashtags","primary_asset_id","expedition_id","scheduled_at","editorial_boost"}:
        if k in data:setattr(x,k,data[k])
    db.commit();db.refresh(x);return item_json(x)
@router.post("/feed/items/{item_id}/transition")
def feed_transition(item_id:int,data:dict,db:Session=Depends(get_db),u=Depends(current_user)):
    x=db.get(FeedItem,item_id)
    if not x:raise HTTPException(404,"Feed item not found")
    action=data.get("action");rules={"submit":({"draft","changes_requested"},{"admin","editor"},"in_review"),"approve":({"in_review"},{"admin","reviewer"},"approved"),"request_changes":({"in_review"},{"admin","reviewer"},"changes_requested"),"reject":({"in_review"},{"admin","reviewer"},"rejected"),"schedule":({"approved"},{"admin","editor"},"scheduled"),"publish":({"approved"},{"admin"},"published"),"unpublish":({"published"},{"admin"},"approved"),"archive":({"draft","changes_requested","approved","scheduled","published"},{"admin"},"archived")};r=rules.get(action)
    if not u or not r or x.status not in r[0] or u.role not in r[1]:raise HTTPException(409,"Transition not allowed")
    if action=="submit" and x.ai_assisted and not any(source.supported for source in x.sources):raise HTTPException(422,"AI-assisted posts need at least one citation with a validated source span before review")
    x.status=r[2]
    if action=="schedule":
        if not data.get("scheduled_at"):raise HTTPException(422,"scheduled_at required")
        try:x.scheduled_at=datetime.fromisoformat(data["scheduled_at"].replace("Z","+00:00"))
        except (ValueError,AttributeError):raise HTTPException(422,"scheduled_at must be an ISO-8601 date-time")
        if x.scheduled_at.tzinfo is None or x.scheduled_at<=now():raise HTTPException(422,"scheduled_at must be a future date-time with a timezone")
    if action in {"approve","request_changes","reject"}:x.reviewer_id=u.id
    if action=="approve":x.approved_at=now()
    if x.status=="published":x.published_at=now()
    if action=="unpublish":x.published_at=None;x.scheduled_at=None
    x.updated_at=now()
    db.commit();return item_json(x)
@router.get("/feed/autogen/rules")
def rules(db:Session=Depends(get_db),u=Depends(require_roles("admin"))):return [{"id":x.id,"name":x.name,"trigger":x.trigger,"template":x.template,"enabled":x.enabled,"auto_publish":x.auto_publish,"max_per_day":x.max_per_day} for x in db.scalars(select(AutogenRule))]
@router.put("/feed/autogen/rules")
def replace_rules(payload:list[dict],db:Session=Depends(get_db),u=Depends(require_roles("admin"))):
    db.query(AutogenRule).delete()
    for x in payload:db.add(AutogenRule(name=x["name"],trigger=x["trigger"],template=x.get("template",""),enabled=x.get("enabled",False),auto_publish=x.get("auto_publish",False),max_per_day=min(max(int(x.get("max_per_day",1)),1),10)))
    db.commit();return rules(db,u)
