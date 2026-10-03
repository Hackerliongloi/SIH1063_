import asyncio
from app.core.db import SessionLocal
from app.modules.social import mixed_feed

db = SessionLocal()
try:
    result = mixed_feed(cursor=None, limit=50, db=db, u=None)
    for item in result['items']:
        print(f"ID: {item.get('id')} Type: {item.get('_type')} TS: {item.get('published_at') or item.get('created_at')}")
finally:
    db.close()
