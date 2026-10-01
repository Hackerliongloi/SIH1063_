import re

with open("d:/SIH1063_/backend/app/main.py", "r", encoding="utf-8") as f:
    content = f.read()

# Fix numpy float serialization issue in /api/search
old_line = """    return {"items":[{**serialize_asset(a),"score":round(s,4)} for s,a in scored[start:start+20]],"total":len(scored),"page":page,"page_size":20,"mode":"keyword+local semantic hashing embeddings+recency"}"""
new_line = """    return {"items":[{**serialize_asset(a),"score":round(float(s),4)} for s,a in scored[start:start+20]],"total":len(scored),"page":page,"page_size":20,"mode":"keyword+local semantic hashing embeddings+recency"}"""

content = content.replace(old_line, new_line)

with open("d:/SIH1063_/backend/app/main.py", "w", encoding="utf-8") as f:
    f.write(content)
