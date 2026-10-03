import urllib.request, json
url = 'http://localhost:8000/api/stories'
req = urllib.request.Request(url)
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read())
    for d in data: print(f"ID: {d['id']}, published_at: {d['published_at']}")
