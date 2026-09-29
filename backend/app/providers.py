"""Optional Ollama integration; network calls remain on the operator's own host."""
import json
import httpx

def generate_locally(model:str,base_url:str,context:list[dict],kind:str,tone:str,theme:str="") -> dict:
    sources="\n\n".join(f"CHUNK {row['chunk_id']} | SOURCE {row['asset_title']}\n{row['text']}" for row in context)
    prompt=f"""Create a {kind} for a polar science outreach portal in a {tone} tone. Topic: {theme or 'selected polar science sources'}.
Use only the source chunks below. Return only valid JSON with this exact shape: {{"title":"...","sections":[{{"heading":"...","paragraphs":[{{"text":"...","citations":[{{"chunk_id":123,"span":"an exact substring from that chunk"}}]}}]}}]}}.
Every factual paragraph must have at least one citation. Each span must be copied exactly from its cited chunk. Do not invent facts or citations.
SOURCES:\n{sources}"""
    response=httpx.post(base_url.rstrip("/")+"/api/generate",json={"model":model,"prompt":prompt,"stream":False,"format":"json","options":{"temperature":0.2}},timeout=180)
    response.raise_for_status()
    result=json.loads(response.json()["response"])
    if not isinstance(result.get("title"),str) or not isinstance(result.get("sections"),list):raise ValueError("Model returned an invalid content structure")
    allowed={int(row["chunk_id"]):row for row in context};validated=[]
    for section in result["sections"]:
        for paragraph in section.get("paragraphs",[]):
            claims=paragraph.get("citations",[]);supported=False
            for citation in claims:
                chunk=allowed.get(int(citation.get("chunk_id",-1)));span=str(citation.get("span","")).strip()
                if chunk and span and span in chunk["text"]:
                    validated.append({"claim_text":paragraph.get("text",""),"chunk_id":chunk["chunk_id"],"asset_id":chunk["asset_id"],"span_text":span,"supported":True});supported=True
            if not supported:raise ValueError("A generated paragraph lacked an exact source citation")
    if not validated:raise ValueError("Model generated no validated citations")
    body="\n\n".join("## "+section.get("heading","")+"\n\n"+"\n\n".join(p["text"] for p in section.get("paragraphs",[])) for section in result["sections"])
    return {"title":result["title"],"body_md":body,"citations":validated}
