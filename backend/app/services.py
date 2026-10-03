import hashlib, logging, os, uuid
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

def file_size(key:str)->int:
    if key.startswith("local:"):
        return (Path(os.getenv("LOCAL_MEDIA_DIR","./media"))/key.removeprefix("local:")).stat().st_size
    import boto3
    client=boto3.client("s3",endpoint_url=settings.storage_endpoint,aws_access_key_id=settings.storage_access_key,aws_secret_access_key=settings.storage_secret_key,region_name=settings.storage_region)
    return int(client.head_object(Bucket=settings.storage_bucket,Key=key)["ContentLength"])

def stream_file(key:str,start:int,end:int):
    """Yield a bounded byte range without buffering an entire video in memory."""
    if key.startswith("local:"):
        path=Path(os.getenv("LOCAL_MEDIA_DIR","./media"))/key.removeprefix("local:")
        def local_chunks():
            with path.open("rb") as source:
                source.seek(start);remaining=end-start+1
                while remaining>0:
                    chunk=source.read(min(1024*1024,remaining))
                    if not chunk:break
                    remaining-=len(chunk);yield chunk
        return local_chunks()
    import boto3
    client=boto3.client("s3",endpoint_url=settings.storage_endpoint,aws_access_key_id=settings.storage_access_key,aws_secret_access_key=settings.storage_secret_key,region_name=settings.storage_region)
    body=client.get_object(Bucket=settings.storage_bucket,Key=key,Range=f"bytes={start}-{end}")["Body"]
    def s3_chunks():
        try:yield from body.iter_chunks(chunk_size=1024*1024)
        finally:body.close()
    return s3_chunks()

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

def generate_video_poster(file_data: bytes, suffix: str) -> bytes | None:
    try:
        import av
        import io
        container = av.open(io.BytesIO(file_data))
        video = next((s for s in container.streams if s.type == "video"), None)
        if not video:
            return None
        for frame in container.decode(video):
            img = frame.to_image()
            img.thumbnail((640, 640))
            out = io.BytesIO()
            img.save(out, format='JPEG')
            return out.getvalue()
    except Exception as e:
        logging.warning("Video poster generation failed: %s", e)
    return None

def enqueue_ingestion(asset_id:int,key:str,suffix:str)->str|None:
    try:
        from redis import Redis
        from rq import Queue
        from rq import Retry
        job_id=f"polar-ingest-{asset_id}-{uuid.uuid4().hex}"
        q=Queue("ingestion",connection=Redis.from_url(settings.redis_url))
        q.enqueue("app.worker.process_asset",asset_id,key,suffix,job_id=job_id,retry=Retry(max=3,interval=[30,120,300]),job_timeout="30m",result_ttl=86400, failure_ttl=604800)
        return job_id
    except Exception as e:
        logging.warning("Could not enqueue asset %s for ingestion: %s",asset_id,e);return None

def send_activation_email(to_email: str, token: str) -> bool:
    if not settings.smtp_host:
        logging.error("SMTP configuration is missing. Cannot deliver activation emails.")
        return False
        
    import smtplib
    from email.message import EmailMessage
    
    msg = EmailMessage()
    msg['Subject'] = "Activate your Polar Portal account"
    msg['From'] = settings.smtp_from_email
    msg['To'] = to_email
    msg.set_content(f"Please activate your account by clicking the following link:\n\nhttp://localhost:3000/activate?token={token}")
    
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            if settings.smtp_user and settings.smtp_password:
                server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)
        return True
    except Exception as e:
        logging.error("SMTP delivery failed: %s", e)
        return False
