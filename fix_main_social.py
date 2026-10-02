import re

with open("d:/SIH1063_/backend/app/main.py", "r", encoding="utf-8") as f:
    content = f.read()

# Add public_user registration
register_code = """
@app.post("/api/auth/register",status_code=201)
"""

public_register_code = """
@app.post("/api/auth/public/register",status_code=201)
def public_register(data:RegisterIn,request:Request,db:Session=Depends(get_db)):
    enforce_rate_limit(request,"register",5,300)
    import secrets, hashlib
    from datetime import timedelta, timezone
    if db.scalar(select(User).where(User.email==data.email.lower())): raise HTTPException(409,"Email already registered")
    u=User(email=data.email.lower(),password_hash=hash_password(data.password),role="public_user",is_active=False)
    db.add(u);db.flush()
    # Create an empty public profile for the user
    from .models import PublicProfile
    # username derived from email or a random string, let's use part of email and a random suffix
    import string
    import random
    base_name = data.email.lower().split("@")[0]
    base_name = re.sub(r'[^a-z0-9_]', '', base_name)[:20]
    suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=5))
    username = f"{base_name}_{suffix}"
    profile = PublicProfile(user_id=u.id, username=username, display_name=base_name)
    db.add(profile)
    
    raw_token=secrets.token_urlsafe(32)
    token_hash=hashlib.sha256(raw_token.encode()).hexdigest()
    expires_at=datetime.now(timezone.utc)+timedelta(days=1)
    db.add(ActivationToken(user_id=u.id,token_hash=token_hash,expires_at=expires_at))
    db.commit()
    logging.info('{"event":"activation_email","email":"%s","link":"http://localhost:3000/activate?token=%s"}',u.email,raw_token)
    return {"message":"Check your email for activation link"}

@app.post("/api/auth/register",status_code=201)
"""

if "@app.post(\"/api/auth/public/register\"" not in content:
    content = content.replace(register_code, public_register_code)

# Add social router
router_code = """
from .modules import feed
app.include_router(feed.router,prefix="/api")
"""

social_router_code = """
from .modules import feed, social
app.include_router(feed.router,prefix="/api")
app.include_router(social.router,prefix="/api/social")
"""

if "social.router" not in content:
    content = content.replace(router_code, social_router_code)
    
with open("d:/SIH1063_/backend/app/main.py", "w", encoding="utf-8") as f:
    f.write(content)
