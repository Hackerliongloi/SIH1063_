import re

with open("d:/SIH1063_/src/app/explore/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Fix 1: SearchHit type
content = content.replace("asset_id: number | string;", "id: number | string;")

# Fix 2: SearchImages call
content = content.replace('api.searchImages(query || "polar research")', 'api.searchImages(query)')

# Fix 3: hit.asset_id -> hit.id
content = content.replace("hit.asset_id", "hit.id")

# Fix 4: photo.asset_id -> photo.id
content = content.replace("photo.asset_id", "photo.id")

with open("d:/SIH1063_/src/app/explore/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)
