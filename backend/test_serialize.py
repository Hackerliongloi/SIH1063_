from app.core.db import SessionLocal
from app.models import Draft
from app.main import serialize_draft

with SessionLocal() as db:
    drafts = db.query(Draft).all()
    for d in drafts:
        if d.status == 'published':
            res = serialize_draft(d)
            print(f"Draft {d.id} status={d.status} public_story_id={res.get('public_story_id')}")
