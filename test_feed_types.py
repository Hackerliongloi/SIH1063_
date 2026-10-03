import urllib.request
import json
url = 'http://localhost:8000/api/social/feed?limit=50'
req = urllib.request.Request(url)
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read())
    for d in data.get('items', []):
        print(f"ID: {d.get('id')} Type: {d.get('_type')}")
