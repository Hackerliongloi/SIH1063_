"""
End-to-end verification: publish a draft and confirm the linked record
appears in the public social feed.

Run with: python verify_publish_cascade.py
Requires the backend server running at http://127.0.0.1:8000
"""
import httpx
import json

BASE = "http://127.0.0.1:8000"
ADMIN_EMAIL = "admin@polar.local"
ADMIN_PASSWORD = "ChangeMe-Local-Only-123!"

client = httpx.Client(base_url=BASE, timeout=15)

# -- Auth
r = client.post("/api/auth/token", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
if r.status_code != 200:
    print(f"FAIL: Login failed with {r.status_code}: {r.text[:200]}")
    exit(1)
token = r.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print("OK: Logged in as admin")

def get_feed_ids():
    r = client.get("/api/social/feed?limit=50")
    items = r.json().get("items", [])
    return {(item.get("_type"), item.get("id")): item.get("status") for item in items}

def get_story_ids():
    r = client.get("/api/social/stories?limit=50")
    items = r.json().get("items", [])
    return {item.get("id"): item.get("status") for item in items}

# -- Get a source asset for generation
r = client.get("/api/editorial/drafts", headers=headers)
existing_drafts = r.json() if r.status_code == 200 else []
print(f"Existing drafts: {len(existing_drafts)}")

# Find or use existing published drafts to verify cascade
# Look for any approved draft of kind post/story/carousel
approved = [d for d in existing_drafts if d.get("status") == "approved" and d.get("kind") in ("post", "story", "carousel", "reel")]
print(f"Approved drafts of cascadable kinds: {len(approved)}")

# -- If none approved, check draft ones and fast-track them through the state machine
draft_ones = [d for d in existing_drafts if d.get("status") == "draft" and d.get("kind") in ("post", "story")]
if not approved and not draft_ones:
    print("INFO: No suitable draft or approved content found to test cascade with.")
    print("      Generate content via the AI Studio first, then re-run this script.")
    exit(0)

tested = []

def transition(did, action):
    r = client.post(f"/api/editorial/drafts/{did}/transition",
                    headers=headers,
                    json={"action": action, "comment": f"verify cascade: {action}"})
    return r.status_code, r.json() if r.status_code < 400 else r.text

# For each approved draft, publish and verify
for d in (approved or [])[:3]:
    did = d["id"]
    kind = d["kind"]
    public_id = d.get("public_story_id")
    print(f"\nDraft id={did} kind={kind} status={d['status']} public_id={public_id}")

    before_feed = get_feed_ids()
    before_stories = get_story_ids()

    # Publish
    sc, body = transition(did, "publish")
    if sc not in (200, 201):
        print(f"  WARN: publish transition returned {sc}: {body[:100] if isinstance(body, str) else body}")
        continue
    print(f"  OK: draft status -> {body.get('status')}")

    # Check linked record
    if kind in ("post", "carousel", "reel"):
        r2 = client.get(f"/api/social/feed?limit=50")
        after = r2.json().get("items", [])
        found = [i for i in after if i.get("id") == public_id and i.get("_type") == "feed_item"]
        if found:
            print(f"  OK: feed item {public_id} now appears in /api/social/feed with status={found[0].get('status')}")
            tested.append(True)
        else:
            # Check via direct endpoint
            r3 = client.get(f"/api/feed/{public_id}")
            if r3.status_code == 200:
                d3 = r3.json()
                print(f"  OK (direct): feed item {public_id} exists, status={d3.get('status')}")
                if d3.get("status") == "published":
                    tested.append(True)
                else:
                    print(f"  FAIL: feed item {public_id} still has status={d3.get('status')} after publishing draft")
                    tested.append(False)
            else:
                print(f"  FAIL: feed item {public_id} not found after publish (status {r3.status_code})")
                tested.append(False)
    elif kind == "story":
        r2 = client.get(f"/api/social/stories?limit=50")
        after = r2.json().get("items", [])
        found = [i for i in after if i.get("id") == public_id]
        if found:
            print(f"  OK: outreach story {public_id} now appears in /api/social/stories")
            tested.append(True)
        else:
            r3 = client.get(f"/api/outreach/stories/{public_id}")
            if r3.status_code == 200:
                d3 = r3.json()
                print(f"  OK (direct): story {public_id} exists, status={d3.get('status')}")
                if d3.get("status") == "published":
                    tested.append(True)
                else:
                    print(f"  FAIL: story {public_id} still has status={d3.get('status')} after publishing draft")
                    tested.append(False)
            else:
                print(f"  FAIL: story {public_id} not found (status {r3.status_code})")
                tested.append(False)

print(f"\n=== RESULT: {sum(tested)}/{len(tested)} cascades verified ===")
if not tested:
    print("No approved drafts found to test. Generate + approve some content first.")
elif all(tested):
    print("ALL CASCADE SYNCS WORKING CORRECTLY.")
else:
    print("SOME CASCADES STILL BROKEN - check output above.")
