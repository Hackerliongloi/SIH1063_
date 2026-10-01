import re

with open("d:/SIH1063_/backend/app/main.py", "r", encoding="utf-8") as f:
    content = f.read()

# Fix 1: SQLite fallback
old_logic = """    if q.strip() and db.bind.dialect.name=="postgresql":
        lexical_ids=db.scalars(select(Chunk.asset_id).join(Asset,Asset.id==Chunk.asset_id).where(Asset.status=="ready",func.to_tsvector("english",Chunk.text).op("@@")(func.plainto_tsquery("english",q))).limit(50)).all()
        distance=type_coerce(Chunk.embedding,Vector(384)).cosine_distance(vector)
        semantic_ids=db.scalars(select(Chunk.asset_id).join(Asset,Asset.id==Chunk.asset_id).where(Asset.status=="ready",Chunk.embedding.is_not(None)).order_by(distance).limit(50)).all()
        title_ids=db.scalars(select(Asset.id).where(Asset.status=="ready",or_(*[or_(Asset.title.ilike(f"%{t}%"),Asset.description.ilike(f"%{t}%")) for t in terms])).limit(50)).all() if terms else []
        candidate_ids=set(lexical_ids)|set(semantic_ids)|set(title_ids)
        stmt=stmt.where(Asset.id.in_(candidate_ids))"""

new_logic = """    if q.strip():
        if db.bind.dialect.name=="postgresql":
            lexical_ids=db.scalars(select(Chunk.asset_id).join(Asset,Asset.id==Chunk.asset_id).where(Asset.status=="ready",func.to_tsvector("english",Chunk.text).op("@@")(func.plainto_tsquery("english",q))).limit(50)).all()
            distance=type_coerce(Chunk.embedding,Vector(384)).cosine_distance(vector)
            semantic_ids=db.scalars(select(Chunk.asset_id).join(Asset,Asset.id==Chunk.asset_id).where(Asset.status=="ready",Chunk.embedding.is_not(None)).order_by(distance).limit(50)).all()
            title_ids=db.scalars(select(Asset.id).where(Asset.status=="ready",or_(*[or_(Asset.title.ilike(f"%{t}%"),Asset.description.ilike(f"%{t}%")) for t in terms])).limit(50)).all() if terms else []
            candidate_ids=set(lexical_ids)|set(semantic_ids)|set(title_ids)
            stmt=stmt.where(Asset.id.in_(candidate_ids))
        else:
            title_ids=db.scalars(select(Asset.id).where(Asset.status=="ready",or_(*[or_(Asset.title.ilike(f"%{t}%"),Asset.description.ilike(f"%{t}%")) for t in terms]))).all() if terms else []
            stmt=stmt.where(Asset.id.in_(title_ids))"""

content = content.replace(old_logic, new_logic)

# Fix 2: /api/search/images
old_image = """@app.get("/api/search/images")
def image_search(q:str,db:Session=Depends(get_db)):
    if not q.strip(): raise HTTPException(422,"Query required")
    items=db.scalars(select(Asset).where(Asset.type=="photo",Asset.status=="ready",or_(Asset.title.ilike(f"%{q}%"),Asset.description.ilike(f"%{q}%"))).limit(50)).all()
    return {"items":[serialize_asset(a) for a in items],"total":len(items),"mode":"text fallback; configure a local CLIP provider for semantic image retrieval"}"""

new_image = """@app.get("/api/search/images")
def image_search(q:str="",db:Session=Depends(get_db)):
    stmt = select(Asset).where(Asset.type=="photo",Asset.status=="ready")
    if q.strip():
        stmt = stmt.where(or_(Asset.title.ilike(f"%{q}%"),Asset.description.ilike(f"%{q}%")))
    items=db.scalars(stmt.order_by(Asset.created_at.desc()).limit(50)).all()
    return {"items":[serialize_asset(a) for a in items],"total":len(items),"mode":"text fallback; configure a local CLIP provider for semantic image retrieval"}"""

content = content.replace(old_image, new_image)

with open("d:/SIH1063_/backend/app/main.py", "w", encoding="utf-8") as f:
    f.write(content)
