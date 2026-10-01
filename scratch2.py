with open('d:\\SIH1063_\\backend\\app\\main.py', 'a', encoding='utf-8') as f:
    f.write('''

# Submitter Endpoints
@app.get("/api/submitter/datasets")
def get_submitter_datasets(db:Session=Depends(get_db),u=Depends(require_roles("submitter", "admin", "editor"))):
    return [serialize_asset(a) for a in db.scalars(select(Asset).where(Asset.created_by==u.id).order_by(Asset.updated_at.desc()))]

@app.post("/api/datasets", status_code=201)
def create_dataset_draft(data:AssetIn,db:Session=Depends(get_db),u=Depends(require_roles("submitter", "admin", "editor"))):
    if data.type not in ASSET_TYPES: raise HTTPException(422,"Unsupported asset type")
    a=Asset(**data.model_dump(exclude={"tags","metadata"}),metadata_json=data.metadata,created_by=u.id,status="draft")
    db.add(a);db.flush()
    for name in set(data.tags):
        normalized=name.strip()
        if normalized:
            tag=db.scalar(select(Tag).where(func.lower(Tag.name)==normalized.lower()))
            if not tag:tag=Tag(name=normalized,kind="theme");db.add(tag);db.flush()
            db.add(AssetTag(asset_id=a.id,tag_id=tag.id))
    db.add(AssetVersion(asset_id=a.id,version=1,snapshot_json=data.model_dump(mode="json")))
    db.commit();db.refresh(a)
    return serialize_asset(a)

@app.post("/api/datasets/{id}/upload", status_code=202)
async def upload_dataset_file(id:int,file:UploadFile=File(...),db:Session=Depends(get_db),u=Depends(require_roles("submitter", "admin", "editor"))):
    a = db.get(Asset, id)
    if not a: raise HTTPException(404, "Asset not found")
    if a.created_by != u.id and u.role not in {"admin", "editor"}: raise HTTPException(403, "Not authorized")
    if a.status not in {"draft", "rejected", "failed"}: raise HTTPException(400, "Can only upload to draft, rejected or failed datasets")
    
    suffix=(file.filename or "").lower().rsplit(".",1)[-1] if "." in (file.filename or "") else ""
    allowed={"pdf","docx","csv","nc","nc4","jpg","jpeg","png","webp","tif","tiff","mp4","txt", "xml"}
    if suffix not in allowed: raise HTTPException(415,"Unsupported file extension")
    data=await file.read(settings.max_upload_mb*1024*1024+1)
    if not data or len(data)>settings.max_upload_mb*1024*1024: raise HTTPException(413,"File empty or exceeds upload limit")
    key=store_file(data,suffix,file.content_type or "application/octet-stream")
    a.file_key=key
    a.status="processing"
    a.metadata_json = dict(a.metadata_json or {})
    a.metadata_json.update({"filename":file.filename,"content_type":file.content_type,"size":len(data)})
    db.commit()
    queued=enqueue_ingestion(a.id,key,suffix)
    if not queued:
        try:
            text=extract_text(data,suffix)
            if text:
                for i in range(0,len(text),2500):
                    chunk_text=text[i:i+3000]
                    db.add(Chunk(asset_id=a.id,idx=i//2500,text=chunk_text,embedding=embed(chunk_text)))
            # When upload finishes inline, state returns to draft for submitters to review before submitting
            a.status="draft";db.commit()
        except Exception as e: a.status="failed";a.error=str(e)[:1000];db.commit()
    return {"asset":serialize_asset(a),"job_queued":queued}

@app.post("/api/datasets/{id}/transition")
def transition_dataset(id:int,data:TransitionIn,db:Session=Depends(get_db),u=Depends(require_roles("submitter","admin","editor","reviewer"))):
    a = db.get(Asset, id)
    if not a: raise HTTPException(404, "Asset not found")
    
    rules={
        "submit": ({"draft", "rejected"}, {"submitter", "admin", "editor"}, "in_review"),
        "approve": ({"in_review"}, {"admin", "reviewer"}, "ready"),
        "request_changes": ({"in_review"}, {"admin", "reviewer"}, "rejected"),
        "archive": ({"ready", "draft", "rejected", "in_review"}, {"admin", "editor"}, "archived")
    }
    rule = rules.get(data.action)
    if not rule or a.status not in rule[0] or u.role not in rule[1]: raise HTTPException(409, "Transition not allowed for this state or role")
    if data.action == "submit" and a.created_by != u.id and u.role not in {"admin", "editor"}: raise HTTPException(403, "Not authorized to submit")
    
    a.status = rule[2]
    a.updated_at = now()
    db.commit();db.refresh(a)
    return serialize_asset(a)
''')
