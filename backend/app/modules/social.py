from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select, or_, and_, func
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from ..core.db import get_db
from ..core.security import current_user, require_roles
from ..models import User, PublicProfile, SocialLike, SocialShare, now, Draft, DraftCitation, Asset
from .feed import FeedItem, OutreachStory, item_json, story_json, _story_expired

router = APIRouter(tags=["social"])

class ProfileUpdate(BaseModel):
    display_name: str | None = Field(None, max_length=120)
    bio: str | None = Field(None)
    avatar_asset_id: int | None = None

class ShareIn(BaseModel):
    recipient_username: str
    feed_item_id: int | None = None
    story_id: int | None = None

@router.get("/users")
def search_users(q: str = "", limit: int = 20, db: Session = Depends(get_db)):
    query = select(PublicProfile).join(User).where(User.is_active == True)
    if q.strip():
        search_term = f"%{q.strip()}%"
        query = query.where(or_(
            PublicProfile.username.ilike(search_term),
            PublicProfile.display_name.ilike(search_term)
        ))
    profiles = db.scalars(query.limit(max(1, min(limit, 50)))).all()
    return [{"username": p.username, "display_name": p.display_name, "bio": p.bio, "avatar_asset_id": p.avatar_asset_id} for p in profiles]

@router.get("/users/{username}")
def get_user_profile(username: str, db: Session = Depends(get_db)):
    profile = db.scalar(select(PublicProfile).where(PublicProfile.username == username))
    if not profile:
        raise HTTPException(404, "Profile not found")
    # Verify user is active
    user = db.get(User, profile.user_id)
    if not user or not user.is_active:
        raise HTTPException(404, "Profile not found")
    return {"username": profile.username, "display_name": profile.display_name, "bio": profile.bio, "avatar_asset_id": profile.avatar_asset_id}

@router.patch("/me/profile")
def update_profile(data: ProfileUpdate, db: Session = Depends(get_db), u = Depends(current_user)):
    if not u or str(u.role) != "public_user":
        raise HTTPException(403, "Only public users have public profiles")
    profile = db.scalar(select(PublicProfile).where(PublicProfile.user_id == u.id))
    if not profile:
        raise HTTPException(404, "Profile not found")
    if data.display_name is not None:
        profile.display_name = data.display_name
    if data.bio is not None:
        profile.bio = data.bio
    if data.avatar_asset_id is not None:
        profile.avatar_asset_id = data.avatar_asset_id
    db.commit()
    return {"username": profile.username, "display_name": profile.display_name, "bio": profile.bio, "avatar_asset_id": profile.avatar_asset_id}

# Like Toggle endpoint
@router.post("/content/{content_type}/{content_id}/like")
def toggle_like(content_type: str, content_id: int, db: Session = Depends(get_db), u = Depends(current_user)):
    if not u:
        raise HTTPException(401, "Authentication required")
    if content_type not in ["feed_item", "story"]:
        raise HTTPException(422, "Invalid content type")
    
    feed_item_id = content_id if content_type == "feed_item" else None
    story_id = content_id if content_type == "story" else None
    
    # Check visibility
    if feed_item_id:
        item = db.get(FeedItem, feed_item_id)
        if not item or item.status != "published":
            raise HTTPException(404, "Content not found")
    if story_id:
        story = db.get(OutreachStory, story_id)
        if not story or story.status != "published" or _story_expired(story):
            raise HTTPException(404, "Content not found")
            
    # Check if already liked
    like_query = select(SocialLike).where(SocialLike.user_id == u.id)
    if feed_item_id:
        like_query = like_query.where(SocialLike.feed_item_id == feed_item_id)
    else:
        like_query = like_query.where(SocialLike.story_id == story_id)
        
    existing = db.scalar(like_query)
    
    if existing:
        db.delete(existing)
        liked = False
        if feed_item_id and item:
            item.like_count = max(0, item.like_count - 1)
    else:
        db.add(SocialLike(user_id=u.id, feed_item_id=feed_item_id, story_id=story_id))
        liked = True
        if feed_item_id and item:
            item.like_count += 1
            
    db.commit()
    
    current_count = 0
    if feed_item_id and item:
        current_count = item.like_count
    elif story_id:
        current_count = db.scalar(select(func.count()).select_from(SocialLike).where(SocialLike.story_id == story_id)) or 0
        
    return {"liked": liked, "like_count": current_count}


# Shares endpoint
@router.post("/shares", status_code=201)
def share_content(data: ShareIn, db: Session = Depends(get_db), u = Depends(current_user)):
    if not u:
        raise HTTPException(401, "Authentication required")
    
    if not data.feed_item_id and not data.story_id:
        raise HTTPException(422, "Must share a feed_item or a story")
        
    if data.feed_item_id and data.story_id:
        raise HTTPException(422, "Cannot share both at once")
        
    recipient = db.scalar(select(PublicProfile).where(PublicProfile.username == data.recipient_username))
    if not recipient:
        raise HTTPException(404, "Recipient not found")
        
    recip_user = db.get(User, recipient.user_id)
    if not recip_user or not recip_user.is_active:
        raise HTTPException(404, "Recipient is inactive")
        
    if data.feed_item_id:
        item = db.get(FeedItem, data.feed_item_id)
        if not item or item.status != "published":
            raise HTTPException(404, "Content not found")
    if data.story_id:
        story = db.get(OutreachStory, data.story_id)
        if not story or story.status != "published" or _story_expired(story):
            raise HTTPException(404, "Content not found")
            
    share = SocialShare(
        sender_id=u.id,
        recipient_id=recip_user.id,
        feed_item_id=data.feed_item_id,
        story_id=data.story_id
    )
    db.add(share)
    db.commit()
    return {"status": "ok", "message": "Shared successfully"}

@router.get("/inbox")
def get_inbox(cursor: str | None = None, limit: int = 20, db: Session = Depends(get_db), u = Depends(current_user)):
    if not u:
        raise HTTPException(401, "Authentication required")
        
    query = select(SocialShare).where(SocialShare.recipient_id == u.id).order_by(SocialShare.created_at.desc(), SocialShare.id.desc())
    
    if cursor:
        try:
            time_str, id_str = cursor.split(":", 1)
            dt = datetime.fromisoformat(time_str)
            share_id = int(id_str)
            query = query.where(
                or_(
                    SocialShare.created_at < dt,
                    and_(SocialShare.created_at == dt, SocialShare.id < share_id)
                )
            )
        except Exception:
            raise HTTPException(400, "Invalid cursor")
            
    shares = db.scalars(query.limit(max(1, min(limit, 50)) + 1)).all()
    more = len(shares) > limit
    shares = shares[:limit]
    
    results = []
    for share in shares:
        sender_profile = db.scalar(select(PublicProfile).where(PublicProfile.user_id == share.sender_id))
        sender_username = sender_profile.username if sender_profile else "unknown"
        
        content = None
        if share.feed_item_id:
            item = db.get(FeedItem, share.feed_item_id)
            if item and item.status == "published":
                content = item_json(item)
                content["_type"] = "feed_item"
        elif share.story_id:
            story = db.get(OutreachStory, share.story_id)
            if story and story.status == "published" and not _story_expired(story):
                content = story_json(story)
                content["_type"] = "story"
                
        if content:
            results.append({
                "share_id": share.id,
                "sender_username": sender_username,
                "shared_at": share.created_at.isoformat(),
                "content": content
            })
            
    next_cursor = None
    if more and shares:
        next_cursor = f"{shares[-1].created_at.isoformat()}:{shares[-1].id}"
        
    return {"items": results, "next_cursor": next_cursor}

def article_json(d, db):
    sources = []
    for citation in db.scalars(select(DraftCitation).where(DraftCitation.draft_id==d.id)):
        asset = db.get(Asset, citation.asset_id) if citation.asset_id else None
        sources.append({"asset_id":citation.asset_id,"chunk_id":citation.chunk_id,"title":asset.title if asset else None,"url":asset.external_url if asset else None,"claim_text":citation.claim_text,"span_text":citation.span_text,"supported":citation.supported})
    return {"id":d.id,"kind":d.kind,"title":d.title,"body_md":d.body_md,"tone":d.tone,"status":d.status,"ai_assisted":d.ai_assisted,"expedition_id":d.expedition_id,"scheduled_at":d.scheduled_at,"approved_at":d.approved_at,"published_at":d.published_at,"reviewer_id":d.reviewer_id,"created_at":d.created_at,"updated_at":d.updated_at,"public_story_id": d.id, "sources": sources}

@router.get("/feed")
def mixed_feed(cursor: str | None = None, limit: int = 20, db: Session = Depends(get_db), u = Depends(current_user)):
    # Combine feed items, stories, and articles
    limit = max(1, min(limit, 50))
    
    feed_q = select(FeedItem).where(FeedItem.status == "published")
    story_q = select(OutreachStory).where(OutreachStory.status == "published")
    article_q = select(Draft).where(and_(Draft.kind == "article", Draft.status == "published"))
    
    if cursor:
        try:
            ts_str, type_str, id_str = cursor.split(":", 2)
            dt = datetime.fromisoformat(ts_str)
            item_id = int(id_str)
            
            feed_q = feed_q.where(
                or_(
                    FeedItem.published_at < dt,
                    and_(FeedItem.published_at == dt, type_str == "feed_item", FeedItem.id < item_id)
                )
            )
            story_q = story_q.where(
                or_(
                    OutreachStory.published_at < dt,
                    and_(OutreachStory.published_at == dt, type_str == "story", OutreachStory.id < item_id)
                )
            )
            article_q = article_q.where(
                or_(
                    Draft.published_at < dt,
                    and_(Draft.published_at == dt, type_str == "article", Draft.id < item_id)
                )
            )
        except Exception:
            raise HTTPException(400, "Invalid cursor")
            
    # Fetch from all three
    feed_items = db.scalars(feed_q.order_by(FeedItem.published_at.desc(), FeedItem.id.desc()).limit(limit + 1)).all()
    stories = db.scalars(story_q.order_by(OutreachStory.published_at.desc(), OutreachStory.id.desc()).limit(limit + 1)).all()
    articles = db.scalars(article_q.order_by(Draft.published_at.desc(), Draft.id.desc()).limit(limit + 1)).all()
    
    # Filter expired stories
    stories = [s for s in stories if not _story_expired(s)]
    
    # Merge sort
    combined = []
    for item in feed_items:
        combined.append({
            "ts": item.published_at or item.created_at,
            "type": "feed_item",
            "id": item.id,
            "data": item
        })
    for story in stories:
        combined.append({
            "ts": story.published_at or story.created_at,
            "type": "story",
            "id": story.id,
            "data": story
        })
    for article in articles:
        combined.append({
            "ts": article.published_at or article.created_at,
            "type": "article",
            "id": article.id,
            "data": article
        })
        
    # Sort descending
    combined.sort(key=lambda x: (x["ts"], -x["id"]), reverse=True)
    
    more = len(combined) > limit
    combined = combined[:limit]
    
    results = []
    for item in combined:
        if item["type"] == "feed_item":
            res = item_json(item["data"])
            res["_type"] = "feed_item"
        elif item["type"] == "article":
            res = article_json(item["data"], db)
            res["_type"] = "article"
        else:
            res = story_json(item["data"])
            res["_type"] = "story"
            
        # Add liked status if logged in
        if u:
            if item["type"] == "feed_item":
                liked = db.scalar(select(SocialLike).where(SocialLike.user_id == u.id, SocialLike.feed_item_id == item["id"])) is not None
            elif item["type"] == "story":
                liked = db.scalar(select(SocialLike).where(SocialLike.user_id == u.id, SocialLike.story_id == item["id"])) is not None
            else:
                liked = False
            res["liked_by_me"] = liked
        else:
            res["liked_by_me"] = False
            
        results.append(res)
        
    next_cursor = None
    if more and combined:
        last = combined[-1]
        next_cursor = f"{last['ts'].isoformat()}:{last['type']}:{last['id']}"
        
    return {"items": results, "next_cursor": next_cursor}

@router.get("/reels")
def social_reels(cursor: str | None = None, limit: int = 20, db: Session = Depends(get_db), u = Depends(current_user)):
    limit = max(1, min(limit, 50))
    q = select(FeedItem).where(FeedItem.status == "published", FeedItem.kind == "reel")
    
    if cursor:
        try:
            ts_str, id_str = cursor.split(":", 1)
            dt = datetime.fromisoformat(ts_str)
            item_id = int(id_str)
            q = q.where(
                or_(
                    FeedItem.published_at < dt,
                    and_(FeedItem.published_at == dt, FeedItem.id < item_id)
                )
            )
        except Exception:
            raise HTTPException(400, "Invalid cursor")
            
    items = db.scalars(q.order_by(FeedItem.published_at.desc(), FeedItem.id.desc()).limit(limit + 1)).all()
    more = len(items) > limit
    items = items[:limit]
    
    results = []
    for item in items:
        res = item_json(item)
        res["_type"] = "reel"
        if u:
            res["liked_by_me"] = db.scalar(select(SocialLike).where(SocialLike.user_id == u.id, SocialLike.feed_item_id == item.id)) is not None
        else:
            res["liked_by_me"] = False
        results.append(res)
        
    next_cursor = None
    if more and items:
        last = items[-1]
        next_cursor = f"{last.published_at.isoformat()}:{last.id}"
        
    return {"items": results, "next_cursor": next_cursor}

@router.get("/stories")
def social_stories(cursor: str | None = None, limit: int = 20, db: Session = Depends(get_db), u = Depends(current_user)):
    limit = max(1, min(limit, 50))
    q = select(OutreachStory).where(OutreachStory.status == "published")
    
    if cursor:
        try:
            ts_str, id_str = cursor.split(":", 1)
            dt = datetime.fromisoformat(ts_str)
            item_id = int(id_str)
            q = q.where(
                or_(
                    OutreachStory.published_at < dt,
                    and_(OutreachStory.published_at == dt, OutreachStory.id < item_id)
                )
            )
        except Exception:
            raise HTTPException(400, "Invalid cursor")
            
    items = db.scalars(q.order_by(OutreachStory.published_at.desc(), OutreachStory.id.desc()).limit(limit + 1)).all()
    
    valid_items = []
    for item in items:
        if not _story_expired(item):
            valid_items.append(item)
            
    more = len(valid_items) > limit
    valid_items = valid_items[:limit]
    
    results = []
    for story in valid_items:
        res = story_json(story)
        res["_type"] = "story"
        if u:
            res["liked_by_me"] = db.scalar(select(SocialLike).where(SocialLike.user_id == u.id, SocialLike.story_id == story.id)) is not None
        else:
            res["liked_by_me"] = False
        results.append(res)
        
    next_cursor = None
    if more and valid_items:
        last = valid_items[-1]
        next_cursor = f"{last.published_at.isoformat()}:{last.id}"
        
    return {"items": results, "next_cursor": next_cursor}
