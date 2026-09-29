from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from ..core.db import get_db
from ..core.security import current_user, require_roles
from ..core.rate_limit import enforce_rate_limit
from ..models import Base, Asset, Expedition, User, now
from sqlalchemy import String, Text, Integer, Boolean, DateTime, ForeignKey, Float, JSON, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column
from ..core.db import Base

router=APIRouter(tags=["feed"])
class FeedItem(Base):
    __tablename__="feed_items"
    id:Mapped[int]=mapped_column(primary_key=True);kind:Mapped[str]=mapped_column(String(20),index=True);caption:Mapped[str]=mapped_column(Text,default="");hashtags:Mapped[list]=mapped_column(JSON,default=list);expedition_id:Mapped[int|None]=mapped_column(ForeignKey("expeditions.id",ondelete="SET NULL"),nullable=True);primary_asset_id:Mapped[int|None]=mapped_column(ForeignKey("assets.id",ondelete="SET NULL"),nullable=True);poster_key:Mapped[str|None]=mapped_column(String(800),nullable=True);hls_key:Mapped[str|None]=mapped_column(String(800),nullable=True);mp4_key:Mapped[str|None]=mapped_column(String(800),nullable=True);duration_s:Mapped[int|None]=mapped_column(Integer,nullable=True);aspect:Mapped[str|None]=mapped_column(String(20),nullable=True);source:Mapped[str]=mapped_column(String(20),default="staff");origin_draft_id:Mapped[int|None]=mapped_column(Integer,nullable=True);status:Mapped[str]=mapped_column(String(30),default="draft",index=True);scheduled_at:Mapped[datetime|None]=mapped_column(DateTime(timezone=True),nullable=True);published_at:Mapped[datetime|None]=mapped_column(DateTime(timezone=True),nullable=True);editorial_boost:Mapped[float]=mapped_column(Float,default=0);rank_score:Mapped[float]=mapped_column(Float,default=0,index=True);like_count:Mapped[int]=mapped_column(Integer,default=0);view_count:Mapped[int]=mapped_column(Integer,default=0);share_count:Mapped[int]=mapped_column(Integer,default=0);ai_assisted:Mapped[bool]=mapped_column(Boolean,default=False);created_by:Mapped[int|None]=mapped_column(ForeignKey("users.id",ondelete="SET NULL"),nullable=True);created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
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
class AutogenRule(Base):
    __tablename__="autogen_rules"
    id:Mapped[int]=mapped_column(primary_key=True);name:Mapped[str]=mapped_column(String(200));trigger:Mapped[str]=mapped_column(String(30));template:Mapped[str]=mapped_column(Text,default="");enabled:Mapped[bool]=mapped_column(Boolean,default=False);auto_publish:Mapped[bool]=mapped_column(Boolean,default=False);max_per_day:Mapped[int]=mapped_column(Integer,default=1)

class FeedIn(BaseModel):
    kind:str="post";caption:str;hashtags:list[str]=[];expedition_id:int|None=None;primary_asset_id:int|None=None;status:str="draft";scheduled_at:datetime|None=None;editorial_boost:float=Field(default=0,ge=0,le=1)
class ReactionIn(BaseModel): type:str=Field(pattern="^(like|share)$")
class ViewIn(BaseModel): watch_ms:int=Field(default=0,ge=0,le=86400000)
def item_json(x):return {"id":x.id,"kind":x.kind,"caption":x.caption,"hashtags":x.hashtags,"expedition_id":x.expedition_id,"primary_asset_id":x.primary_asset_id,"status":x.status,"scheduled_at":x.scheduled_at,"published_at":x.published_at,"rank_score":x.rank_score,"like_count":x.like_count,"view_count":x.view_count,"share_count":x.share_count,"ai_assisted":x.ai_assisted,"source":x.source}
def anon_cookie(request:Request,response:Response):
    import secrets
    raw=request.cookies.get("polar_anon")
    if raw and len(raw)<128:return raw
    raw=secrets.token_urlsafe(24)
    response.set_cookie("polar_anon",raw,max_age=31536000,httponly=True,samesite="lax",secure=request.url.scheme=="https")
    return raw
@router.get("/feed")
def feed(cursor:str|None=None,tab:str="for_you",expedition:int|None=None,tag:str|None=None,limit:int=20,db:Session=Depends(get_db)):
    q=select(FeedItem).where(FeedItem.status=="published")
    if expedition:q=q.where(FeedItem.expedition_id==expedition)
    if tag:q=q.where(FeedItem.hashtags.contains([tag]))
    if cursor:
        try:score,item_id=cursor.split(":",1);q=q.where((FeedItem.rank_score<float(score))|((FeedItem.rank_score==float(score))&(FeedItem.id<int(item_id))))
        except ValueError:raise HTTPException(400,"Invalid cursor")
    ordering=(FeedItem.published_at.desc(),FeedItem.id.desc()) if tab=="latest" else (FeedItem.rank_score.desc(),FeedItem.id.desc())
    rows=db.scalars(q.order_by(*ordering).limit(min(max(limit,1),50)+1)).all();more=len(rows)>min(max(limit,1),50);rows=rows[:min(max(limit,1),50)]
    return {"items":[item_json(x) for x in rows],"next_cursor":f"{rows[-1].rank_score}:{rows[-1].id}" if more and rows else None}
@router.get("/feed/reels")
def reels(cursor:str|None=None,limit:int=20,db:Session=Depends(get_db)):
    q=select(FeedItem).where(FeedItem.status=="published",FeedItem.kind=="reel")
    if cursor:
        try:dt=datetime.fromisoformat(cursor);q=q.where(FeedItem.published_at<dt)
        except ValueError:raise HTTPException(400,"Invalid cursor")
    rows=db.scalars(q.order_by(FeedItem.published_at.desc()).limit(min(max(limit,1),50)+1)).all();more=len(rows)>min(max(limit,1),50);rows=rows[:min(max(limit,1),50)]
    return {"items":[item_json(x) for x in rows],"next_cursor":rows[-1].published_at.isoformat() if more and rows else None}
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
    if data.kind not in {"post","carousel","reel"}:raise HTTPException(422,"Invalid feed item kind")
    if data.primary_asset_id and not db.get(Asset,data.primary_asset_id):raise HTTPException(422,"Asset not found")
    status=data.status if data.status in {"draft","in_review","approved","scheduled"} else "draft"
    x=FeedItem(**data.model_dump(exclude={"status"}),status=status,created_by=u.id);db.add(x);db.commit();db.refresh(x);return item_json(x)
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
    action=data.get("action");rules={"submit":({"draft","changes_requested"},{"admin","editor"},"in_review"),"approve":({"in_review"},{"admin","reviewer"},"approved"),"request_changes":({"in_review"},{"admin","reviewer"},"changes_requested"),"reject":({"in_review"},{"admin","reviewer"},"rejected"),"schedule":({"approved"},{"admin","editor"},"scheduled"),"publish":({"approved"},{"admin"},"published")};r=rules.get(action)
    if not u or not r or x.status not in r[0] or u.role not in r[1]:raise HTTPException(409,"Transition not allowed")
    x.status=r[2]
    if action=="schedule":
        if not data.get("scheduled_at"):raise HTTPException(422,"scheduled_at required")
        x.scheduled_at=datetime.fromisoformat(data["scheduled_at"].replace("Z","+00:00"))
    if x.status=="published":x.published_at=now()
    db.commit();return item_json(x)
@router.get("/feed/autogen/rules")
def rules(db:Session=Depends(get_db),u=Depends(require_roles("admin"))):return [{"id":x.id,"name":x.name,"trigger":x.trigger,"template":x.template,"enabled":x.enabled,"auto_publish":x.auto_publish,"max_per_day":x.max_per_day} for x in db.scalars(select(AutogenRule))]
@router.put("/feed/autogen/rules")
def replace_rules(payload:list[dict],db:Session=Depends(get_db),u=Depends(require_roles("admin"))):
    db.query(AutogenRule).delete()
    for x in payload:db.add(AutogenRule(name=x["name"],trigger=x["trigger"],template=x.get("template",""),enabled=x.get("enabled",False),auto_publish=x.get("auto_publish",False),max_per_day=min(max(int(x.get("max_per_day",1)),1),10)))
    db.commit();return rules(db,u)
