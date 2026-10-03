import urllib.request
import json
url = 'http://localhost:8000/api/social/feed?limit=50'
req = urllib.request.Request(url)
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read())
    for item in data.get('items', []):
        print(f"ID: {item.get('id')} Kind: {item.get('kind')} Type: {item.get('_type')}")
        print(f"  poster_key: {item.get('poster_key')}")
        if item.get('primary_asset'):
            pa = item['primary_asset']
            print(f"  primary_asset: thumb={pa.get('thumb_key')} file={pa.get('file_key')} ext={pa.get('external_url')}")
        else:
            print("  primary_asset: None")
        if item.get('media'):
            for m in item['media']:
                print(f"  media: type={m.get('type')} thumb={m.get('thumb_key')} file={m.get('file_key')} ext={m.get('external_url')}")
        else:
            print("  media: None")
        if item.get('_type') == 'story':
            for s in item.get('slides', []):
                print(f"  slide: thumb={s.get('thumb_key')} file={s.get('file_key')} asset_url={s.get('asset_url')}")
        print('-'*40)
