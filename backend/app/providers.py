"""LLM provider adapters for local Ollama and hosted OpenRouter inference."""
import json
import httpx

_DRAFT_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "sections": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "heading": {"type": "string"},
                    "paragraphs": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "citations": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "chunk_id": {"type": "integer"},
                                            "span": {"type": "string"},
                                        },
                                        "required": ["chunk_id", "span"],
                                        "additionalProperties": False,
                                    },
                                },
                            },
                            "required": ["text", "citations"],
                            "additionalProperties": False,
                        },
                    },
                },
                "required": ["heading", "paragraphs"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["title", "sections"],
    "additionalProperties": False,
}


def generate_locally(model: str, base_url: str, context: list[dict], kind: str, tone: str, theme: str = "") -> dict:
    prompt = _generation_prompt(context, kind, tone, theme)
    response = httpx.post(
        base_url.rstrip("/") + "/api/generate",
        json={"model": model, "prompt": prompt, "stream": False, "format": "json", "options": {"temperature": 0.2}},
        timeout=180,
    )
    response.raise_for_status()
    result = json.loads(response.json()["response"])
    return _validate_generation(result, context)


def generate_openrouter(model: str, api_key: str, context: list[dict], kind: str, tone: str, theme: str = "") -> dict:
    """Generate a cited draft through OpenRouter's OpenAI-compatible API.

    Parses the response envelope defensively, distinguishing between:
    - Provider/routing errors (no eligible provider for requested parameters)
    - Model refusal (explicit refusal field or content_filter finish_reason)
    - Truncated output (finish_reason=length)
    - Empty provider output (content is null or empty string)
    - Malformed response envelope (missing choices, missing message)
    - JSON parse failures (model output was not valid JSON)

    Never includes raw source text, chunk content, API key, or authorization
    headers in raised errors.
    """
    if not api_key:
        raise ValueError("OpenRouter API key is not configured (MODEL_API_KEY)")
    if not model or model == "local-fake":
        raise ValueError(
            "No OpenRouter model is configured. Set MODEL_NAME to a valid OpenRouter model identifier "
            "(e.g. 'meta-llama/llama-3.1-8b-instruct:free' or 'google/gemini-flash-1.5')."
        )

    prompt = _generation_prompt(context, kind, tone, theme)

    def _call_openrouter(instructions: str) -> dict:
        """Make one OpenRouter API call and return the parsed JSON dict.

        Raises ValueError with a sanitized, actionable message on any failure.
        Raises httpx.HTTPStatusError for HTTP-level errors (non-2xx) that the
        caller may choose to handle distinctly.
        """
        try:
            response = httpx.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    # OpenRouter recommends setting these for attribution
                    "X-Title": "Polar Portal AI Studio",
                },
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": instructions}],
                    "response_format": {
                        "type": "json_schema",
                        "json_schema": {
                            "name": "cited_outreach_draft",
                            "strict": True,
                            "schema": _DRAFT_SCHEMA,
                        },
                    },
                    # NOTE: require_parameters=True restricts routing only to providers
                    # that natively support json_schema. Many free models do not; removing
                    # this flag allows OpenRouter to use its own JSON enforcement while
                    # still sending the schema as a hint. Change back if you use a paid
                    # model known to support native structured outputs.
                    "temperature": 0.1,
                    "max_tokens": 3000,
                },
                timeout=180,
            )
        except httpx.TimeoutException:
            raise ValueError(
                "OpenRouter request timed out after 180 s. "
                "The model may be overloaded. Try again or select a faster model."
            )
        except httpx.RequestError as exc:
            # Network-level error; safe to report type but not the URL (no key in URL for OpenRouter)
            raise ValueError(f"Network error contacting OpenRouter: {type(exc).__name__}") from exc

        # --- HTTP-level errors ---
        if response.status_code == 401:
            raise ValueError("OpenRouter authentication failed. Check that MODEL_API_KEY is correct.")
        if response.status_code == 402:
            raise ValueError("OpenRouter payment required: your account has insufficient credits.")
        if response.status_code == 429:
            raise ValueError(
                "OpenRouter rate limit or quota exceeded. Wait before retrying, or upgrade your plan."
            )
        if response.status_code == 503:
            raise ValueError("OpenRouter reports the selected model is unavailable (503). Try again later.")
        if not response.is_success:
            # Deliberately do not include the raw body (may contain prompt excerpts).
            raise ValueError(
                f"OpenRouter returned HTTP {response.status_code}. "
                "Check your model name, API key, and account status."
            )

        # --- Parse envelope ---
        try:
            body = response.json()
        except Exception:
            raise ValueError("OpenRouter returned a non-JSON response body.")

        # OpenRouter wraps API-level errors as {"error": {"message": ..., "code": ...}}
        # even when the HTTP status is 200. Check for this before accessing choices.
        if "error" in body:
            err = body["error"]
            code = err.get("code", "")
            msg = err.get("message", "")
            # Sanitize: do not forward arbitrary server messages that may echo the prompt.
            safe_code = str(code)[:60] if code else "unknown"
            if "provider" in str(msg).lower() or "no provider" in str(msg).lower():
                raise ValueError(
                    f"OpenRouter could not find an eligible provider for model '{model}' "
                    f"with the requested parameters (error code: {safe_code}). "
                    "This often means the selected model does not support structured JSON output. "
                    "Try a different model or remove the json_schema constraint."
                )
            raise ValueError(
                f"OpenRouter API error (code: {safe_code}). "
                "Check that your model name and API key are correct and that the model supports the requested format."
            )

        # --- Validate choices array ---
        choices = body.get("choices")
        if not isinstance(choices, list) or len(choices) == 0:
            raise ValueError(
                "OpenRouter returned an empty choices array. "
                "The model may have been routed to a provider that returned no output."
            )

        choice = choices[0]
        message = choice.get("message") if isinstance(choice, dict) else None
        finish_reason = choice.get("finish_reason") if isinstance(choice, dict) else None

        if not isinstance(message, dict):
            raise ValueError(
                "OpenRouter response missing 'message' in choices[0]. "
                "The response envelope is malformed."
            )

        # --- Diagnose finish_reason ---
        if finish_reason == "length":
            raise ValueError(
                "OpenRouter output was truncated (finish_reason=length). "
                "The draft exceeded max_tokens=3000. Try reducing the number of source chunks "
                "or requesting fewer formats at once."
            )
        if finish_reason == "content_filter":
            raise ValueError(
                "OpenRouter generation was blocked by a content filter (finish_reason=content_filter). "
                "The model refused to generate output for this content."
            )
        if finish_reason == "error":
            raise ValueError(
                "OpenRouter returned finish_reason=error. "
                "This usually means the selected model is incompatible with the requested parameters. "
                f"Check that model '{model}' supports json_schema structured output."
            )

        # --- Check for explicit refusal ---
        refusal = message.get("refusal")
        if refusal is not None:
            # Do not echo refusal text (may contain prompt fragments)
            raise ValueError(
                "The model explicitly refused to generate the requested content. "
                "This may be a safety guardrail. Try rephrasing the source selection or theme."
            )

        # --- Tool calls without content ---
        if message.get("tool_calls") and not message.get("content"):
            raise ValueError(
                "OpenRouter returned tool_calls but no message content. "
                "The model attempted to call a tool rather than generating the draft text."
            )

        # --- Extract and validate content ---
        content = message.get("content")
        if content is None:
            raise ValueError(
                "OpenRouter returned null content with no error or refusal. "
                f"finish_reason={finish_reason!r}. "
                "The model or provider may have produced no output. Try again or select a different model."
            )
        if not isinstance(content, str):
            raise ValueError(
                f"OpenRouter message.content has unexpected type {type(content).__name__!r}; expected str."
            )
        if not content.strip():
            raise ValueError(
                "OpenRouter returned an empty string as message content. "
                "The model produced no output. Try again or select a different model."
            )

        # --- Parse JSON ---
        try:
            return json.loads(content)
        except json.JSONDecodeError as exc:
            # Do not include content in the error (it may echo source text)
            raise ValueError(
                f"OpenRouter returned content that is not valid JSON (parse error at position {exc.pos}). "
                "This may indicate that the model does not honour json_schema mode. "
                "Try a model with documented structured-output support."
            ) from exc

    # First attempt
    result = _call_openrouter(prompt)
    try:
        return _validate_generation(result, context)
    except ValueError as exc:
        if "exact source citation" not in str(exc):
            raise  # Not a citation error — do not retry

    # Single bounded retry for citation validation failures only
    correction = (
        prompt
        + "\n\nCORRECTION: The previous draft failed because a citation quote did not exactly match its source. "
        "Regenerate the complete draft. For every paragraph, choose a chunk_id from the supplied chunks and copy its span "
        "verbatim, character-for-character, from that chunk. Keep each span short (one complete source sentence). "
        "Do not paraphrase, edit, or add punctuation to a span. Keep the paragraph itself limited to facts supported by that quote."
    )
    return _validate_generation(_call_openrouter(correction), context)


def _generation_prompt(context: list[dict], kind: str, tone: str, theme: str) -> str:
    sources = "\n\n".join(
        f"CHUNK {row['chunk_id']} | SOURCE {row['asset_title']}\n{row['text']}" for row in context
    )
    return (
        f"Create a {kind} for a polar science outreach portal in a {tone} tone. "
        f"Topic: {theme or 'selected polar science sources'}.\n"
        f'Use only the source chunks below. Return only valid JSON with this exact shape: '
        f'{{"title":"...","sections":[{{"heading":"...","paragraphs":[{{"text":"...","citations":[{{"chunk_id":123,"span":"an exact substring from that chunk"}}]}}]}}]}}.\n'
        f"Every factual paragraph must have at least one citation. Each span must be copied exactly from its cited chunk. "
        f"Do not invent facts or citations.\n"
        f"SOURCES:\n{sources}"
    )


def _validate_generation(result: dict, context: list[dict]) -> dict:
    if (
        not isinstance(result, dict)
        or not isinstance(result.get("title"), str)
        or not isinstance(result.get("sections"), list)
    ):
        raise ValueError("Model returned an invalid content structure; expected a title and sections array")

    allowed = {int(row["chunk_id"]): row for row in context}
    validated = []

    for section in result["sections"]:
        if not isinstance(section, dict) or not isinstance(section.get("paragraphs"), list):
            raise ValueError("Model returned a malformed section")
        for paragraph in section["paragraphs"]:
            if not isinstance(paragraph, dict) or not isinstance(paragraph.get("citations"), list):
                raise ValueError("Model returned a malformed paragraph")
            claims = paragraph["citations"]
            supported = False
            for citation in claims:
                chunk = allowed.get(int(citation.get("chunk_id", -1)))
                span = str(citation.get("span", "")).strip()
                if chunk and span and span in chunk["text"]:
                    validated.append({
                        "claim_text": paragraph.get("text", ""),
                        "chunk_id": chunk["chunk_id"],
                        "asset_id": chunk["asset_id"],
                        "span_text": span,
                        "supported": True,
                    })
                    supported = True
            if not supported:
                raise ValueError("A generated paragraph lacked an exact source citation")

    if not validated:
        raise ValueError("Model generated no validated citations")

    body = "\n\n".join(
        "## " + section.get("heading", "") + "\n\n" + "\n\n".join(
            p["text"] for p in section.get("paragraphs", [])
        )
        for section in result["sections"]
    )
    return {"title": result["title"], "body_md": body, "citations": validated}
