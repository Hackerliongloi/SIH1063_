import re

with open("d:/SIH1063_/backend/app/main.py", "r", encoding="utf-8") as f:
    content = f.read()

new_endpoint = """
@app.get("/api/storage/{key:path}")
def stream_storage_file(key: str):
    try:
        total = file_size(key)
    except Exception:
        raise HTTPException(404, "File not found")
    if total <= 0:
        raise HTTPException(404, "File is empty")
    
    import mimetypes
    content_type, _ = mimetypes.guess_type(key)
    if not content_type:
        content_type = "application/octet-stream"
        
    try:
        body = stream_file(key, 0, total - 1)
    except Exception:
        raise HTTPException(404, "File is unavailable")
        
    return StreamingResponse(body, status_code=200, media_type=content_type, headers={"Cache-Control": "public, max-age=3600"})

@app.get("/api/assets/{aid}/media")
"""

content = content.replace("@app.get(\"/api/assets/{aid}/media\")\n", new_endpoint)

with open("d:/SIH1063_/backend/app/main.py", "w", encoding="utf-8") as f:
    f.write(content)
