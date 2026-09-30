"""LLM provider adapters for local Ollama and hosted OpenRouter inference."""
import json
import httpx

_DRAFT_SCHEMA={
    "type":"object",
    "properties":{
        "title":{"type":"string"},
        "sections":{"type":"array","items":{
            "type":"object",
            "properties":{
                "heading":{"type":"string"},
                "paragraphs":{"type":"array","items":{
                    "type":"object",
                    "properties":{
                        "text":{"type":"string"},
                        "citations":{"type":"array","items":{
                            "type":"object",
                            "properties":{"chunk_id":{"type":"integer"},"span":{"type":"string"}},
                            "required":["chunk_id","span"],"additionalProperties":False,
                        }},
                    },
                    "required":["text","citations"],"additionalProperties":False,
                }},
            },
            "required":["heading","paragraphs"],"additionalProperties":False,
        }},
    },
    "required":["title","sections"],"additionalProperties":False,
}

def generate_locally(model:str,base_url:str,context:list[dict],kind:str,tone:str,theme:str="") -> dict:
    prompt=_generation_prompt(context,kind,tone,theme)
    response=httpx.post(base_url.rstrip("/")+"/api/generate",json={"model":model,"prompt":prompt,"stream":False,"format":"json","options":{"temperature":0.2}},timeout=180)
    response.raise_for_status()
    result=json.loads(response.json()["response"])
    return _validate_generation(result,context)

def generate_openrouter(model:str,api_key:str,context:list[dict],kind:str,tone:str,theme:str="") -> dict:
    """Generate a cited draft through OpenRouter's OpenAI-compatible API."""
    prompt=_generation_prompt(context,kind,tone,theme)
    def complete(instructions:str)->dict:
        response=httpx.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization":f"Bearer {api_key}","Content-Type":"application/json"},
            json={"model":model,"messages":[{"role":"user","content":instructions}],
                  "response_format":{"type":"json_schema","json_schema":{"name":"cited_outreach_draft","strict":True,"schema":_DRAFT_SCHEMA}},
                  "provider":{"require_parameters":True},"temperature":0.1,"max_tokens":3000},
            timeout=180,
        )
        response.raise_for_status()
        message=response.json()["choices"][0]["message"]
        content=message.get("content")
        if not isinstance(content,str) or not content.strip():
            raise ValueError("OpenRouter returned no draft text")
        return json.loads(content)

    result=complete(prompt)
    try:
        return _validate_generation(result,context)
    except ValueError as exc:
        if "exact source citation" not in str(exc):
            raise
    correction=(prompt+"\n\nCORRECTION: The previous draft failed because a citation quote did not exactly match its source. "
               "Regenerate the complete draft. For every paragraph, choose a chunk_id from the supplied chunks and copy its span "
               "verbatim, character-for-character, from that chunk. Keep each span short (one complete source sentence). "
               "Do not paraphrase, edit, or add punctuation to a span. Keep the paragraph itself limited to facts supported by that quote.")
    return _validate_generation(complete(correction),context)

def _generation_prompt(context:list[dict],kind:str,tone:str,theme:str)->str:
    sources="\n\n".join(f"CHUNK {row['chunk_id']} | SOURCE {row['asset_title']}\n{row['text']}" for row in context)
    return f"""Create a {kind} for a polar science outreach portal in a {tone} tone. Topic: {theme or 'selected polar science sources'}.
Use only the source chunks below. Return only valid JSON with this exact shape: {{"title":"...","sections":[{{"heading":"...","paragraphs":[{{"text":"...","citations":[{{"chunk_id":123,"span":"an exact substring from that chunk"}}]}}]}}]}}.
Every factual paragraph must have at least one citation. Each span must be copied exactly from its cited chunk. Do not invent facts or citations.
SOURCES:\n{sources}"""

def _validate_generation(result:dict,context:list[dict])->dict:
    if not isinstance(result,dict) or not isinstance(result.get("title"),str) or not isinstance(result.get("sections"),list):raise ValueError("Model returned an invalid content structure; expected a title and sections array")
    allowed={int(row["chunk_id"]):row for row in context};validated=[]
    for section in result["sections"]:
        if not isinstance(section,dict) or not isinstance(section.get("paragraphs"),list):raise ValueError("Model returned a malformed section")
        for paragraph in section["paragraphs"]:
            if not isinstance(paragraph,dict) or not isinstance(paragraph.get("citations"),list):raise ValueError("Model returned a malformed paragraph")
            claims=paragraph["citations"];supported=False
            for citation in claims:
                chunk=allowed.get(int(citation.get("chunk_id",-1)));span=str(citation.get("span","")).strip()
                if chunk and span and span in chunk["text"]:
                    validated.append({"claim_text":paragraph.get("text",""),"chunk_id":chunk["chunk_id"],"asset_id":chunk["asset_id"],"span_text":span,"supported":True});supported=True
            if not supported:raise ValueError("A generated paragraph lacked an exact source citation")
    if not validated:raise ValueError("Model generated no validated citations")
    body="\n\n".join("## "+section.get("heading","")+"\n\n"+"\n\n".join(p["text"] for p in section.get("paragraphs",[])) for section in result["sections"])
    return {"title":result["title"],"body_md":body,"citations":validated}
