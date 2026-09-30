import logging, time
from datetime import datetime, timezone
from sqlalchemy import select
from .core.db import SessionLocal
from .models import Asset, Chunk, Draft
from .services import read_file, extract_text
from .embeddings import embed

def process_asset(asset_id:int,key:str,suffix:str):
    with SessionLocal() as db:
        asset=db.get(Asset,asset_id)
        if not asset:return
        try:
            data=read_file(key);text=extract_text(data,suffix)
            db.query(Chunk).filter(Chunk.asset_id==asset_id).delete()
            for i in range(0,len(text),2500):
                chunk_text=text[i:i+3000]
                db.add(Chunk(asset_id=asset_id,idx=i//2500,text=chunk_text,embedding=embed(chunk_text)))
            asset.status="ready";asset.error=None;db.commit()
        except Exception as e:
            asset.status="failed";asset.error=str(e)[:1000];db.commit();raise

def scheduler_tick():
    from .modules.feed import FeedItem, OutreachStory
    with SessionLocal() as db:
        now=datetime.now(timezone.utc)
        rows=db.scalars(select(Draft).where(Draft.status=="scheduled",Draft.scheduled_at<=now)).all()
        for d in rows:d.status="published";d.published_at=now
        feed_rows=db.scalars(select(FeedItem).where(FeedItem.status=="scheduled",FeedItem.scheduled_at<=now)).all()
        for item in feed_rows:item.status="published";item.published_at=now
        story_rows=db.scalars(select(OutreachStory).where(OutreachStory.status=="scheduled",OutreachStory.scheduled_at<=now)).all()
        for story in story_rows:story.status="published";story.published_at=now;story.updated_at=now
        published=db.scalars(select(FeedItem).where(FeedItem.status=="published")).all()
        for item in published:
            age=max((now-item.published_at.replace(tzinfo=timezone.utc)).total_seconds()/86400,0) if item.published_at else 0
            recency=0.5**(age/3)
            engagement=min((item.like_count+2*item.share_count)/max(item.view_count,20),1.0)
            item.rank_score=0.5*recency+0.3*engagement+0.2*item.editorial_boost
        db.commit()
        return len(rows)+len(feed_rows)+len(story_rows)

def main():
    import threading
    from redis import Redis
    from rq import Worker, Queue
    from .core.config import settings
    def schedule_loop():
        while True:
            try:scheduler_tick()
            except Exception:logging.exception("Scheduler tick failed")
            time.sleep(60)
    threading.Thread(target=schedule_loop,daemon=True,name="polar-scheduler").start()
    conn=Redis.from_url(settings.redis_url);Worker([Queue("ingestion",connection=conn)],connection=conn).work(with_scheduler=True)
if __name__=="__main__":main()
