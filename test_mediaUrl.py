import json

with open('feed.json') as f:
    data = json.load(f)

for item in data.get('items', []):
    isStory = item.get('_type') == 'story'
    isReel = item.get('kind') == 'reel'
    
    # Simulate JS: item.slides?.[0]?.thumb_key || item.slides?.[0]?.file_key || item.slides?.[0]?.asset_url
    def get_story_key(item):
        slides = item.get('slides')
        if not slides: return None
        s = slides[0]
        return s.get('thumb_key') or s.get('file_key') or s.get('asset_url')
        
    # Simulate JS: item.poster_key || item.primary_asset?.thumb_key || item.primary_asset?.file_key || item.primary_asset?.external_url || item.media?.[0]?.thumb_key || item.media?.[0]?.file_key || item.media?.[0]?.external_url
    def get_feed_key(item):
        k = item.get('poster_key')
        if k: return k
        
        pa = item.get('primary_asset') or {}
        k = pa.get('thumb_key') or pa.get('file_key') or pa.get('external_url')
        if k: return k
        
        media = item.get('media')
        if media and len(media) > 0:
            m = media[0]
            k = m.get('thumb_key') or m.get('file_key') or m.get('external_url')
            if k: return k
            
        return None

    key = get_story_key(item) if isStory else get_feed_key(item)
    
    # getMediaUrl simulation
    mediaUrl = None
    if key:
        if str(key).startswith("http://") or str(key).startswith("https://") or str(key).startswith("/api/storage"):
            mediaUrl = key
        else:
            mediaUrl = f"/api/storage/{key}"
            
    video_url = item.get('video_url') or (f"/api/storage/{item.get('mp4_key')}" if item.get('mp4_key') else None)
    if isStory: video_url = None
    
    hasMedia = bool(mediaUrl or video_url)
    
    print(f"ID: {item.get('id')} Type: {item.get('_type')} Kind: {item.get('kind')}")
    print(f"  mediaUrl: {mediaUrl}")
    print(f"  videoUrl: {video_url}")
    print(f"  hasMedia: {hasMedia}")
    
