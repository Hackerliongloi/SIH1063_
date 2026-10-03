import urllib.request
import json
url = 'http://localhost:8000/api/social/feed?limit=50'
req = urllib.request.Request(url)
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read())
    with open('feed.json', 'w', encoding='utf-8') as f:
        json.dump(data, f)
