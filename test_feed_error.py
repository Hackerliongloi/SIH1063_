import urllib.request
import json
url = 'http://localhost:8000/api/social/feed?limit=50'
try:
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as response:
        print("Success:", response.status)
        # only print the first few items
        data = json.loads(response.read())
        print("Items:", len(data.get('items', [])))
except urllib.error.HTTPError as e:
    print("HTTPError:", e.code)
    print(e.read().decode())
