from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from .config import settings
from .db import get_db
from ..models import User

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth = HTTPBearer(auto_error=False)
def hash_password(value): return pwd.hash(value)
def verify_password(value, hashed):
    try: return pwd.verify(value, hashed)
    except Exception: return False
def token_for(user, kind="access"):
    ttl = timedelta(minutes=settings.access_token_minutes) if kind == "access" else timedelta(days=settings.refresh_token_days)
    now = datetime.now(timezone.utc)
    return jwt.encode({"sub": str(user.id), "role": user.role, "type": kind, "iat": now, "exp": now + ttl}, settings.secret_key, algorithm="HS256")
def current_user(credentials: HTTPAuthorizationCredentials|None=Depends(oauth), db: Session=Depends(get_db)):
    if not credentials: return None
    token=credentials.credentials
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        if payload.get("type") != "access": raise ValueError()
        user = db.get(User, int(payload["sub"]))
        if not user or not user.is_active: raise ValueError()
        return user
    except (JWTError, ValueError, KeyError): raise HTTPException(status_code=401, detail="Invalid or expired access token", headers={"WWW-Authenticate":"Bearer"})
def require_roles(*roles):
    def guard(user=Depends(current_user)):
        if not user or user.role not in roles: raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return guard
