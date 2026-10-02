import sqlite3
import sys

db = sqlite3.connect("backend/polar.db")
c = db.cursor()

# Check what the data says
c.execute("SELECT id, status, title FROM drafts WHERE status='published'")
drafts = c.fetchall()

print("Published Drafts:")
for d in drafts:
    did = d[0]
    title = d[2]
    # check outreach stories
    c.execute("SELECT id FROM outreach_stories WHERE source_draft_id=?", (did,))
    s_ids = c.fetchall()
    
    # check feed items
    c.execute("SELECT id FROM feed_items WHERE origin_draft_id=?", (did,))
    f_ids = c.fetchall()
    
    print(f"Draft {did}: {title} | Stories: {s_ids} | FeedItems: {f_ids}")

