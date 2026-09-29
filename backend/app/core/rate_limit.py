"""Best-effort shared Redis rate limits with a process-local development fallback."""
import hashlib, time
from collections import defaultdict, deque
from fastapi import HTTPException, Request
from redis import Redis
from .config import settings

_local=defaultdict(deque)
_redis=Redis.from_url(settings.redis_url,socket_connect_timeout=0.15,socket_timeout=0.15)
def enforce_rate_limit(request:Request,scope:str,limit:int,window_seconds:int):
    ip=request.client.host if request.client else "unknown"
    key=hashlib.sha256(f"{scope}:{ip}".encode()).hexdigest()
    try:
        redis_key=f"polar:rate:{key}"
        count=_redis.incr(redis_key)
        if count==1:_redis.expire(redis_key,window_seconds)
        blocked=count>limit
    except Exception:
        now=time.monotonic();events=_local[key]
        while events and events[0]<=now-window_seconds:events.popleft()
        events.append(now);blocked=len(events)>limit
    if blocked:raise HTTPException(429,"Too many requests; try again shortly",headers={"Retry-After":str(window_seconds)})
