import logging, time
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from .core.db import SessionLocal
from .models import Asset, Chunk, Draft, now
from .services import read_file, extract_text
from .embeddings import embed
# Register feed models before any worker thread or RQ job triggers mapper setup.
# WebhookOutbox and FeedItem have foreign keys/queries that depend on these tables.
from .modules.feed import FeedItem, OutreachStory

def process_asset(asset_id:int,key:str,suffix:str):
    with SessionLocal() as db:
        asset=db.get(Asset,asset_id)
        if not asset:return
        try:
            asset.processing_status="processing";asset.error=None;asset.updated_at=now();db.commit()
            data=read_file(key);text=extract_text(data,suffix)
            db.query(Chunk).filter(Chunk.asset_id==asset_id).delete()
            for i in range(0,len(text),2500):
                chunk_text=text[i:i+3000]
                db.add(Chunk(asset_id=asset_id,idx=i//2500,text=chunk_text,embedding=embed(chunk_text)))

            if asset.type == "video" and not asset.thumb_key:
                from .services import generate_video_poster, store_file
                poster_data = generate_video_poster(data, suffix)
                if poster_data:
                    thumb_key = store_file(poster_data, "jpg", "image/jpeg")
                    asset.thumb_key = thumb_key

            asset.processing_status="ready";asset.error=None;db.commit()
        except Exception as e:
            db.rollback()
            asset=db.get(Asset,asset_id)
            if asset:
                asset.processing_status="failed";asset.error=str(e)[:1000];db.commit()
            raise

def recover_stale_ingestion():
    """Turn abandoned RQ jobs into actionable failures instead of infinite processing."""
    from redis import Redis
    from rq.job import Job
    from rq.exceptions import NoSuchJobError
    from .core.config import settings

    current=now()
    stale_cutoff=current-timedelta(seconds=30)
    connection=Redis.from_url(settings.redis_url)
    with SessionLocal() as db:
        stale=db.scalars(select(Asset).where(
            Asset.processing_status=="processing",
            Asset.updated_at<stale_cutoff,
        ).order_by(Asset.updated_at.asc()).limit(200)).all()
        changed=False
        for asset in stale:
            job_id=(asset.metadata_json or {}).get("_ingestion_job_id")
            job_status="missing"
            if job_id:
                try:
                    job=Job.fetch(job_id,connection=connection)
                    raw_status=job.get_status(refresh=True)
                    job_status=str(getattr(raw_status,"value",raw_status)).rsplit(".",1)[-1].lower()
                except NoSuchJobError:
                    job_status="missing"
                except Exception:
                    logging.exception("Could not inspect ingestion job for asset %s",asset.id)
                    continue
            last_update=asset.updated_at
            if last_update and last_update.tzinfo is None:
                last_update=last_update.replace(tzinfo=timezone.utc)
            age=current-last_update if last_update else timedelta.max
            if job_status == "started" and age < timedelta(minutes=45):
                continue
            if job_status in {"queued", "deferred", "scheduled", "missing", "unknown"} and age < timedelta(minutes=15):
                continue
            if job_status not in {"started", "queued", "deferred", "scheduled", "missing", "unknown", "failed", "finished", "stopped", "canceled", "cancelled"}:
                if age < timedelta(minutes=15):
                    continue
            asset.processing_status="failed"
            asset.error="Indexing did not complete because its worker job stopped or was not consumed. Check the worker and retry indexing."
            asset.updated_at=current
            changed=True
        if changed:
            db.commit()

def scheduler_tick():
    with SessionLocal() as db:
        now=datetime.now(timezone.utc)
        rows=db.scalars(select(Draft).where(Draft.status=="scheduled",Draft.scheduled_at<=now)).all()
        for d in rows:
            d.status="published";d.published_at=now;d.updated_at=now
            if d.kind in {"post","carousel","reel","instagram","twitter","facebook"}:
                linked=db.scalar(select(FeedItem).where(FeedItem.origin_draft_id==d.id))
                if linked and linked.status=="scheduled":
                    from .modules.webhook import publish_feed_item
                    publish_feed_item(db,linked)
        feed_rows=db.scalars(select(FeedItem).where(FeedItem.status=="scheduled",FeedItem.scheduled_at<=now)).all()
        for item in feed_rows:
            from .modules.webhook import publish_feed_item
            publish_feed_item(db, item)
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
            try:
                recover_stale_ingestion()
                scheduler_tick()
            except Exception:logging.exception("Background maintenance tick failed")
            time.sleep(60)
    threading.Thread(target=schedule_loop,daemon=True,name="polar-scheduler").start()

    def webhook_loop():
        from .modules.webhook import poll_webhooks
        from .core.db import SessionLocal
        while True:
            try:
                with SessionLocal() as db:
                    poll_webhooks(db)
            except Exception:
                logging.exception("Webhook polling failed")
            time.sleep(5)

    threading.Thread(target=webhook_loop,daemon=True,name="polar-webhook").start()
    conn=Redis.from_url(settings.redis_url);Worker([Queue("ingestion",connection=conn)],connection=conn).work(with_scheduler=True)
if __name__=="__main__":main()
