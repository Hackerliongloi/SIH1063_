import json
with open('feed.json', encoding='utf-8') as f:
    data = json.load(f)
for d in data.get('items', []):
    print(f"ID: {d.get('id')} Type: {d.get('_type')} TS: {d.get('published_at')}")
