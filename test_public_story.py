import httpx
import sys

BASE_URL = "http://127.0.0.1:8000"

def test_api_endpoints():
    print("Testing API endpoints directly against running server...")
    
    # 1. Fetch the editorial feed to find IDs
    try:
        res = httpx.get(f"{BASE_URL}/api/social/feed?limit=50", timeout=5.0)
        res.raise_for_status()
    except Exception as e:
        print(f"Could not connect to {BASE_URL}: {e}")
        return

    feed_data = res.json()
    items = feed_data.get("items", [])
    
    if not items:
        print("No published items found to test.")
        return

    # Find one of each type if possible
    article_id = None
    story_id = None
    reel_id = None
    post_id = None

    for item in items:
        if item.get("_type") == "story":
            story_id = item.get("id")
        elif item.get("_type") == "feed_item":
            if item.get("kind") == "reel":
                reel_id = item.get("id")
            elif item.get("kind") == "post":
                post_id = item.get("id")
        
        if story_id and reel_id and post_id:
            break

    # To test article, we might not have it in the mixed social feed (articles aren't in feed_items or outreach_stories)
    # Wait, social feed includes stories, but what about articles? Articles are accessed via /api/stories/{id}
    # Let's just try ID 1, 2, 3 for articles
    for i in range(1, 10):
        r = httpx.get(f"{BASE_URL}/api/stories/{i}")
        if r.status_code == 200:
            article_id = i
            break

    print(f"Found IDs -> Article: {article_id}, Story: {story_id}, Reel: {reel_id}, Post: {post_id}")

    # Test Article
    if article_id:
        print(f"Testing Article {article_id}...")
        r = httpx.get(f"{BASE_URL}/api/stories/{article_id}")
        assert r.status_code == 200
        data = r.json()
        assert "body_md" in data
        assert "sources" in data
        assert "slides" not in data
        print("Article payload validated.")
    
    # Test Story
    if story_id:
        print(f"Testing Story {story_id}...")
        r = httpx.get(f"{BASE_URL}/api/outreach/stories/{story_id}")
        assert r.status_code == 200
        data = r.json()
        assert "slides" in data
        assert isinstance(data["slides"], list)
        print("Story payload validated.")

    # Test Reel
    if reel_id:
        print(f"Testing Reel {reel_id}...")
        r = httpx.get(f"{BASE_URL}/api/feed/{reel_id}")
        assert r.status_code == 200
        data = r.json()
        assert "id" in data
        assert data.get("kind") == "reel"
        print("Reel payload validated.")

    # Test Post
    if post_id:
        print(f"Testing Post {post_id}...")
        r = httpx.get(f"{BASE_URL}/api/feed/{post_id}")
        assert r.status_code == 200
        data = r.json()
        assert "id" in data
        assert data.get("kind") == "post"
        print("Post payload validated.")

    # Test 404
    print("Testing 404 for non-existent item...")
    r = httpx.get(f"{BASE_URL}/api/stories/999999")
    assert r.status_code == 404
    print("404 Not Found validated.")
    
    print("\nAll tests passed successfully!")

if __name__ == "__main__":
    test_api_endpoints()
