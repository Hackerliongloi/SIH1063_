import hashlib, logging, os
from pathlib import Path
from .core.config import settings

def store_file(data:bytes,suffix:str,content_type:str)->str:
    key=f"{hashlib.sha256(data).hexdigest()}.{suffix}"
    try:
        import boto3
        client=boto3.client("s3",endpoint_url=settings.storage_endpoint,aws_access_key_id=settings.storage_access_key,aws_secret_access_key=settings.storage_secret_key,region_name=settings.storage_region)
        try: client.head_bucket(Bucket=settings.storage_bucket)
        except Exception: client.create_bucket(Bucket=settings.storage_bucket)
        client.put_object(Bucket=settings.storage_bucket,Key=key,Body=data,ContentType=content_type)
    except Exception as exc:
        logging.warning("S3-compatible storage unavailable, using local development storage: %s",exc)
        root=Path(os.getenv("LOCAL_MEDIA_DIR","./media"));root.mkdir(parents=True,exist_ok=True);(root/key).write_bytes(data)
        return f"local:{key}"
    return key

def read_file(key:str)->bytes:
    if key.startswith("local:"):
        return (Path(os.getenv("LOCAL_MEDIA_DIR","./media"))/key.removeprefix("local:")).read_bytes()
    import boto3
    client=boto3.client("s3",endpoint_url=settings.storage_endpoint,aws_access_key_id=settings.storage_access_key,aws_secret_access_key=settings.storage_secret_key,region_name=settings.storage_region)
    return client.get_object(Bucket=settings.storage_bucket,Key=key)["Body"].read()

def extract_text(data:bytes,suffix:str)->str:
    if suffix=="txt":return data.decode("utf-8",errors="replace")
    if suffix=="csv":return data.decode("utf-8",errors="replace")[:5_000_000]
    if suffix=="pdf":
        import fitz
        doc=fitz.open(stream=data,filetype="pdf");return "\n".join(p.get_text() for p in doc)
    if suffix=="docx":
        import docx,io
        return "\n".join(p.text for p in docx.Document(io.BytesIO(data)).paragraphs)
    if suffix in {"jpg","jpeg","png","webp","tif","tiff"}:
        from PIL import Image
        import io
        im=Image.open(io.BytesIO(data));return f"Image dimensions: {im.width} x {im.height}. Format: {im.format}."
    if suffix in {"nc","nc4"}:
        import xarray as xr,io
        ds=xr.open_dataset(io.BytesIO(data));return f"NetCDF variables: {', '.join(ds.data_vars)}\nDimensions: {dict(ds.sizes)}"
    return ""

def enqueue_ingestion(asset_id:int,key:str,suffix:str)->bool:
    try:
        from redis import Redis
        from rq import Queue
        from rq import Retry
        q=Queue("ingestion",connection=Redis.from_url(settings.redis_url))
        q.enqueue("app.worker.process_asset",asset_id,key,suffix,retry=Retry(max=3,interval=[30,120,300]),job_timeout="30m",result_ttl=86400, failure_ttl=604800)
        return True
    except Exception as e:
        logging.info("RQ unavailable; running ingestion inline: %s",e);return False
