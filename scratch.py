with open('d:\\SIH1063_\\backend\\app\\main.py', 'r', encoding='utf-8') as f:
    content = f.read()

target1 = """class ExpeditionIn(BaseModel): name:str"""
repl1 = """class RegisterIn(BaseModel):
    email: str
    password: str=Field(min_length=12)
    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return normalize_portal_email(value)
class ActivateIn(BaseModel):
    token: str
class ExpeditionIn(BaseModel): name:str"""
content = content.replace(target1, repl1)

target2 = """@app.post("/api/users",status_code=201)"""
repl2 = """@app.post("/api/auth/register",status_code=201)
def register(data:RegisterIn,request:Request,db:Session=Depends(get_db)):
    enforce_rate_limit(request,"register",5,300)
    import secrets, hashlib
    from datetime import timedelta, timezone
    if db.scalar(select(User).where(User.email==data.email.lower())): raise HTTPException(409,"Email already registered")
    u=User(email=data.email.lower(),password_hash=hash_password(data.password),role="submitter",is_active=False)
    db.add(u);db.flush()
    raw_token=secrets.token_urlsafe(32)
    token_hash=hashlib.sha256(raw_token.encode()).hexdigest()
    expires_at=datetime.now(timezone.utc)+timedelta(days=1)
    db.add(ActivationToken(user_id=u.id,token_hash=token_hash,expires_at=expires_at))
    db.commit()
    logging.info('{"event":"activation_email","email":"%s","link":"http://localhost:3000/activate?token=%s"}',u.email,raw_token)
    return {"message":"Check your email for activation link"}

@app.post("/api/auth/activate")
def activate(data:ActivateIn,db:Session=Depends(get_db)):
    import hashlib
    from datetime import timezone
    token_hash=hashlib.sha256(data.token.encode()).hexdigest()
    t=db.scalar(select(ActivationToken).where(ActivationToken.token_hash==token_hash))
    if not t: raise HTTPException(400,"Invalid or expired token")
    if t.expires_at<datetime.now(timezone.utc):
        db.delete(t);db.commit();raise HTTPException(400,"Token expired")
    u=db.get(User,t.user_id)
    if u: u.is_active=True
    db.delete(t);db.commit()
    return {"message":"Account activated successfully"}

@app.post("/api/users",status_code=201)"""
content = content.replace(target2, repl2)

with open('d:\\SIH1063_\\backend\\app\\main.py', 'w', encoding='utf-8') as f:
    f.write(content)
