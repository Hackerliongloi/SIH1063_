import httpx
import json

BASE = "http://127.0.0.1:8000"

def p(label, data):
    print(f"\n=== {label} ===")
    if isinstance(data, list):
        for item in data[:10]:
            print(json.dumps(item, default=str)[:200])
        print(f"  (total shown: {min(len(data),10)} of {len(data)})")
    else:
        print(json.dumps(data, default=str)[:400])

# -- 1. Social Feed (mixed)
r = httpx.get(f"{BASE}/api/social/feed?limit=20", timeout=10)
feed = r.json()
items = feed.get("items", [])
p("SOCIAL FEED ITEMS", items)
print(f"  status={r.status_code}, cursor={feed.get('cursor')}")

# -- 2. Social Stories
r = httpx.get(f"{BASE}/api/social/stories?limit=20", timeout=10)
stories = r.json()
story_items = stories.get("items", [])
p("SOCIAL STORIES", story_items)

# -- 3. Social Reels
r = httpx.get(f"{BASE}/api/social/reels?limit=20", timeout=10)
reels = r.json()
reel_items = reels.get("items", [])
p("SOCIAL REELS", reel_items)

# -- 4. Admin: all drafts via admin endpoint (needs auth - expect 401)
r = httpx.get(f"{BASE}/api/drafts", timeout=10)
print(f"\n=== /api/drafts status: {r.status_code} ===")

# -- 5. Feed item detail for id=1 and id=5 (known IDs from previous test)
for fid in [1, 5]:
    r = httpx.get(f"{BASE}/api/feed/{fid}", timeout=10)
    print(f"\n=== Feed item {fid}: status={r.status_code} ===")
    if r.status_code == 200:
        d = r.json()
        print(f"  kind={d.get('kind')}, status={d.get('status')}, title={str(d.get('title',''))[:60]}")
        print(f"  origin_draft_id={d.get('origin_draft_id')}, primary_asset={d.get('primary_asset_id')}")
        print(f"  media={d.get('media')}, poster_key={d.get('poster_key')}")

# -- 6. Outreach story detail
r = httpx.get(f"{BASE}/api/outreach/stories/1", timeout=10)
print(f"\n=== Outreach story 1: status={r.status_code} ===")
if r.status_code == 200:
    d = r.json()
    print(f"  status={d.get('status')}, slides={len(d.get('slides', []))}")
    print(f"  first_slide_asset={d.get('slides', [{}])[0].get('asset_url','') if d.get('slides') else 'none'}")

# -- 7. Check what /api/social/feed actually returns for known published items
print("\n=== ITEM TYPES IN FEED ===")
type_counts = {}
for item in items:
    t = item.get("_type","?") + "/" + str(item.get("kind","?"))
    type_counts[t] = type_counts.get(t, 0) + 1
print(type_counts)

# -- 8. Check media fields in feed items
print("\n=== MEDIA FIELD ANALYSIS (first 5 feed items) ===")
for item in items[:5]:
    print(f"  id={item.get('id')} kind={item.get('kind')} "
          f"poster_key={item.get('poster_key')} "
          f"primary_asset={item.get('primary_asset')} "
          f"media={item.get('media')}")
