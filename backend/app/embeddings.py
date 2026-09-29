"""Free local embeddings: Ollama when configured, deterministic hashing fallback otherwise."""
import hashlib, math
from .core.config import settings

def embed(text:str,dimensions:int=384)->list[float]:
    if settings.model_base_url and settings.llm_provider=="ollama":
        try:
            import httpx
            response=httpx.post(settings.model_base_url.rstrip("/")+"/api/embed",json={"model":settings.model_name,"input":text},timeout=60)
            response.raise_for_status();vector=response.json()["embeddings"][0]
            return vector[:dimensions] if len(vector)>=dimensions else vector+[0.0]*(dimensions-len(vector))
        except Exception:
            pass
    vector=[0.0]*dimensions
    for token in text.lower().split():
        digest=hashlib.blake2b(token.encode(),digest_size=8).digest();idx=int.from_bytes(digest[:4],"little")%dimensions
        vector[idx]+=1.0 if digest[4]&1 else -1.0
    norm=math.sqrt(sum(x*x for x in vector)) or 1.0
    return [x/norm for x in vector]

def cosine(a:list[float],b:list[float])->float:
    if not a or not b:return 0.0
    n=min(len(a),len(b));den=math.sqrt(sum(x*x for x in a[:n])*sum(x*x for x in b[:n]))
    return sum(x*y for x,y in zip(a[:n],b[:n]))/den if den else 0.0
