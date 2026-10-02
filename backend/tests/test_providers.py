"""Tests for backend/app/providers.py — generate_openrouter.

Run with:
    python -m pytest backend/tests/test_providers.py -v

All tests use unittest.mock to patch httpx.post so no real network calls are made.
No API keys, prompt text, or source chunks are printed in test output.
"""
import json
import sys
import os
from unittest.mock import MagicMock, patch
import pytest

# Allow import without installing as a package
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.providers import generate_openrouter, _validate_generation, generate_locally

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_FAKE_KEY = "sk-or-test-REDACTED"
_FAKE_MODEL = "test-model/free"

_CONTEXT = [
    {
        "chunk_id": 1,
        "asset_id": 10,
        "asset_title": "Polar Expedition 2024",
        "text": "Sea ice extent reached record lows in 2024.",
    },
    {
        "chunk_id": 2,
        "asset_id": 10,
        "asset_title": "Polar Expedition 2024",
        "text": "Ocean temperatures in the Weddell Sea rose by 0.5°C.",
    },
]


def _make_response(status_code=200, body=None):
    """Build a MagicMock that mimics an httpx.Response."""
    r = MagicMock()
    r.status_code = status_code
    r.is_success = (200 <= status_code < 300)
    r.json.return_value = body or {}
    return r


def _make_valid_draft_body():
    """Return an OpenRouter-shaped body for a valid cited response."""
    content = json.dumps({
        "title": "Polar Warming Trends",
        "sections": [
            {
                "heading": "Sea Ice",
                "paragraphs": [
                    {
                        "text": "Polar regions are warming rapidly.",
                        "citations": [
                            {"chunk_id": 1, "span": "Sea ice extent reached record lows in 2024."}
                        ],
                    }
                ],
            }
        ],
    })
    return {
        "choices": [
            {
                "message": {"content": content, "role": "assistant"},
                "finish_reason": "stop",
            }
        ]
    }


# ---------------------------------------------------------------------------
# Tests: successful generation
# ---------------------------------------------------------------------------


def test_valid_cited_output():
    """A well-formed response with valid citations produces a result dict."""
    with patch("app.providers.httpx.post") as mock_post:
        mock_post.return_value = _make_response(200, _make_valid_draft_body())
        result = generate_openrouter(_FAKE_MODEL, _FAKE_KEY, _CONTEXT, "article", "general_public", "polar ice")
    assert result["title"] == "Polar Warming Trends"
    assert "body_md" in result
    assert isinstance(result["citations"], list)
    assert len(result["citations"]) > 0
    assert result["citations"][0]["span_text"] == "Sea ice extent reached record lows in 2024."


# ---------------------------------------------------------------------------
# Tests: early validation errors (no HTTP call)
# ---------------------------------------------------------------------------


def test_missing_api_key_raises_before_call():
    with patch("app.providers.httpx.post") as mock_post:
        with pytest.raises(ValueError, match="API key"):
            generate_openrouter(_FAKE_MODEL, "", _CONTEXT, "article", "general_public")
        mock_post.assert_not_called()


def test_unconfigured_model_raises_before_call():
    with patch("app.providers.httpx.post") as mock_post:
        with pytest.raises(ValueError, match="MODEL_NAME"):
            generate_openrouter("local-fake", _FAKE_KEY, _CONTEXT, "article", "general_public")
        mock_post.assert_not_called()


# ---------------------------------------------------------------------------
# Tests: HTTP-level errors
# ---------------------------------------------------------------------------


def test_401_authentication_error():
    with patch("app.providers.httpx.post") as mock_post:
        mock_post.return_value = _make_response(401, {})
        with pytest.raises(ValueError, match="authentication failed"):
            generate_openrouter(_FAKE_MODEL, _FAKE_KEY, _CONTEXT, "article", "general_public")


def test_402_payment_required():
    with patch("app.providers.httpx.post") as mock_post:
        mock_post.return_value = _make_response(402, {})
        with pytest.raises(ValueError, match="insufficient credits"):
            generate_openrouter(_FAKE_MODEL, _FAKE_KEY, _CONTEXT, "article", "general_public")


def test_429_rate_limit():
    with patch("app.providers.httpx.post") as mock_post:
        mock_post.return_value = _make_response(429, {})
        with pytest.raises(ValueError, match="rate limit"):
            generate_openrouter(_FAKE_MODEL, _FAKE_KEY, _CONTEXT, "article", "general_public")


def test_503_unavailable():
    with patch("app.providers.httpx.post") as mock_post:
        mock_post.return_value = _make_response(503, {})
        with pytest.raises(ValueError, match="unavailable"):
            generate_openrouter(_FAKE_MODEL, _FAKE_KEY, _CONTEXT, "article", "general_public")


def test_generic_5xx_error():
    with patch("app.providers.httpx.post") as mock_post:
        mock_post.return_value = _make_response(500, {})
        with pytest.raises(ValueError, match="HTTP 500"):
            generate_openrouter(_FAKE_MODEL, _FAKE_KEY, _CONTEXT, "article", "general_public")


# ---------------------------------------------------------------------------
# Tests: OpenRouter error envelope (HTTP 200 but with top-level "error" key)
# ---------------------------------------------------------------------------


def test_openrouter_error_envelope_no_provider():
    """OpenRouter returns HTTP 200 but error.message mentions no provider."""
    body = {"error": {"code": 400, "message": "No provider found for the requested parameters"}}
    with patch("app.providers.httpx.post") as mock_post:
        mock_post.return_value = _make_response(200, body)
        with pytest.raises(ValueError, match="eligible provider"):
            generate_openrouter(_FAKE_MODEL, _FAKE_KEY, _CONTEXT, "article", "general_public")


def test_openrouter_error_envelope_generic():
    """OpenRouter returns HTTP 200 but has a generic error key."""
    body = {"error": {"code": "model_error", "message": "some upstream error"}}
    with patch("app.providers.httpx.post") as mock_post:
        mock_post.return_value = _make_response(200, body)
        with pytest.raises(ValueError, match="OpenRouter API error"):
            generate_openrouter(_FAKE_MODEL, _FAKE_KEY, _CONTEXT, "article", "general_public")


def test_error_message_does_not_contain_api_key():
    """Error messages must not echo the API key."""
    body = {"error": {"code": 401, "message": f"Invalid key {_FAKE_KEY}"}}
    with patch("app.providers.httpx.post") as mock_post:
        mock_post.return_value = _make_response(200, body)
        try:
            generate_openrouter(_FAKE_MODEL, _FAKE_KEY, _CONTEXT, "article", "general_public")
        except ValueError as exc:
            assert _FAKE_KEY not in str(exc), "API key must not appear in error messages"


# ---------------------------------------------------------------------------
# Tests: Malformed envelope (choices issues)
# ---------------------------------------------------------------------------


def test_empty_choices_array():
    body = {"choices": []}
    with patch("app.providers.httpx.post") as mock_post:
        mock_post.return_value = _make_response(200, body)
        with pytest.raises(ValueError, match="empty choices"):
            generate_openrouter(_FAKE_MODEL, _FAKE_KEY, _CONTEXT, "article", "general_public")


def test_choices_missing_entirely():
    body = {"id": "chatcmpl-xxx"}  # no "choices" key at all
    with patch("app.providers.httpx.post") as mock_post:
        mock_post.return_value = _make_response(200, body)
        with pytest.raises(ValueError, match="empty choices"):
            generate_openrouter(_FAKE_MODEL, _FAKE_KEY, _CONTEXT, "article", "general_public")


def test_message_missing_from_choice():
    body = {"choices": [{"finish_reason": "stop"}]}  # no "message" key
    with patch("app.providers.httpx.post") as mock_post:
        mock_post.return_value = _make_response(200, body)
        with pytest.raises(ValueError, match="missing 'message'"):
            generate_openrouter(_FAKE_MODEL, _FAKE_KEY, _CONTEXT, "article", "general_public")


# ---------------------------------------------------------------------------
# Tests: finish_reason-based failures
# ---------------------------------------------------------------------------


def test_finish_reason_length_truncated():
    body = {"choices": [{"message": {"content": '{"title": "incomplete"'}, "finish_reason": "length"}]}
    with patch("app.providers.httpx.post") as mock_post:
        mock_post.return_value = _make_response(200, body)
        with pytest.raises(ValueError, match="truncated"):
            generate_openrouter(_FAKE_MODEL, _FAKE_KEY, _CONTEXT, "article", "general_public")


def test_finish_reason_content_filter():
    body = {"choices": [{"message": {"content": None}, "finish_reason": "content_filter"}]}
    with patch("app.providers.httpx.post") as mock_post:
        mock_post.return_value = _make_response(200, body)
        with pytest.raises(ValueError, match="content filter"):
            generate_openrouter(_FAKE_MODEL, _FAKE_KEY, _CONTEXT, "article", "general_public")


def test_finish_reason_error():
    body = {"choices": [{"message": {"content": None}, "finish_reason": "error"}]}
    with patch("app.providers.httpx.post") as mock_post:
        mock_post.return_value = _make_response(200, body)
        with pytest.raises(ValueError, match="finish_reason=error"):
            generate_openrouter(_FAKE_MODEL, _FAKE_KEY, _CONTEXT, "article", "general_public")


# ---------------------------------------------------------------------------
# Tests: Refusal and tool calls
# ---------------------------------------------------------------------------


def test_model_refusal():
    body = {
        "choices": [{
            "message": {"content": None, "refusal": "I cannot generate this content.", "role": "assistant"},
            "finish_reason": "stop",
        }]
    }
    with patch("app.providers.httpx.post") as mock_post:
        mock_post.return_value = _make_response(200, body)
        with pytest.raises(ValueError, match="refused"):
            generate_openrouter(_FAKE_MODEL, _FAKE_KEY, _CONTEXT, "article", "general_public")


def test_refusal_text_not_in_error():
    """The model's refusal text must not be forwarded in the error message."""
    sensitive_refusal = "I refuse because the prompt contains: SECRET-POLAR-DATA"
    body = {
        "choices": [{
            "message": {"content": None, "refusal": sensitive_refusal},
            "finish_reason": "stop",
        }]
    }
    with patch("app.providers.httpx.post") as mock_post:
        mock_post.return_value = _make_response(200, body)
        try:
            generate_openrouter(_FAKE_MODEL, _FAKE_KEY, _CONTEXT, "article", "general_public")
        except ValueError as exc:
            assert "SECRET-POLAR-DATA" not in str(exc)


def test_tool_calls_without_content():
    body = {
        "choices": [{
            "message": {"content": None, "tool_calls": [{"id": "call_1", "type": "function"}]},
            "finish_reason": "tool_calls",
        }]
    }
    with patch("app.providers.httpx.post") as mock_post:
        mock_post.return_value = _make_response(200, body)
        with pytest.raises(ValueError, match="tool_calls"):
            generate_openrouter(_FAKE_MODEL, _FAKE_KEY, _CONTEXT, "article", "general_public")


# ---------------------------------------------------------------------------
# Tests: content field issues
# ---------------------------------------------------------------------------


def test_null_content():
    body = {"choices": [{"message": {"content": None}, "finish_reason": "stop"}]}
    with patch("app.providers.httpx.post") as mock_post:
        mock_post.return_value = _make_response(200, body)
        with pytest.raises(ValueError, match="null content"):
            generate_openrouter(_FAKE_MODEL, _FAKE_KEY, _CONTEXT, "article", "general_public")


def test_empty_string_content():
    body = {"choices": [{"message": {"content": "   "}, "finish_reason": "stop"}]}
    with patch("app.providers.httpx.post") as mock_post:
        mock_post.return_value = _make_response(200, body)
        with pytest.raises(ValueError, match="empty string"):
            generate_openrouter(_FAKE_MODEL, _FAKE_KEY, _CONTEXT, "article", "general_public")


def test_non_string_content():
    body = {"choices": [{"message": {"content": 12345}, "finish_reason": "stop"}]}
    with patch("app.providers.httpx.post") as mock_post:
        mock_post.return_value = _make_response(200, body)
        with pytest.raises(ValueError, match="unexpected type"):
            generate_openrouter(_FAKE_MODEL, _FAKE_KEY, _CONTEXT, "article", "general_public")


def test_invalid_json_content():
    body = {"choices": [{"message": {"content": "not json at all {"}, "finish_reason": "stop"}]}
    with patch("app.providers.httpx.post") as mock_post:
        mock_post.return_value = _make_response(200, body)
        with pytest.raises(ValueError, match="not valid JSON"):
            generate_openrouter(_FAKE_MODEL, _FAKE_KEY, _CONTEXT, "article", "general_public")


def test_invalid_json_does_not_contain_source_text():
    """Source chunk text must not appear in JSON parse error messages."""
    # _CONTEXT contains "Sea ice extent reached record lows in 2024."
    body = {"choices": [{"message": {"content": "{bad json here}"}, "finish_reason": "stop"}]}
    with patch("app.providers.httpx.post") as mock_post:
        mock_post.return_value = _make_response(200, body)
        try:
            generate_openrouter(_FAKE_MODEL, _FAKE_KEY, _CONTEXT, "article", "general_public")
        except ValueError as exc:
            assert "Sea ice" not in str(exc)
            assert "2024" not in str(exc)


# ---------------------------------------------------------------------------
# Tests: citation validation
# ---------------------------------------------------------------------------


def test_invalid_citation_rejected():
    """Citations that do not appear verbatim in the chunk text are rejected."""
    content = json.dumps({
        "title": "Bad Citation",
        "sections": [{
            "heading": "Section",
            "paragraphs": [{
                "text": "Some claim.",
                "citations": [{"chunk_id": 1, "span": "this span does not exist in the source text"}],
            }],
        }],
    })
    body = {"choices": [{"message": {"content": content}, "finish_reason": "stop"}]}
    with patch("app.providers.httpx.post") as mock_post:
        mock_post.return_value = _make_response(200, body)
        with pytest.raises(ValueError, match="exact source citation"):
            generate_openrouter(_FAKE_MODEL, _FAKE_KEY, _CONTEXT, "article", "general_public")


def test_citation_retry_is_bounded():
    """Citation validation failure triggers exactly ONE retry, not infinite retries."""
    bad_content = json.dumps({
        "title": "Retry Test",
        "sections": [{
            "heading": "Section",
            "paragraphs": [{
                "text": "claim",
                "citations": [{"chunk_id": 1, "span": "NONEXISTENT SPAN"}],
            }],
        }],
    })
    body = {"choices": [{"message": {"content": bad_content}, "finish_reason": "stop"}]}
    with patch("app.providers.httpx.post") as mock_post:
        mock_post.return_value = _make_response(200, body)
        with pytest.raises(ValueError, match="exact source citation"):
            generate_openrouter(_FAKE_MODEL, _FAKE_KEY, _CONTEXT, "article", "general_public")
        # Should have been called exactly twice: initial + one correction retry
        assert mock_post.call_count == 2


def test_citation_retry_succeeds_on_second_attempt():
    """If the first call has bad citations but the retry succeeds, the result is returned."""
    bad_content = json.dumps({
        "title": "Retry Success",
        "sections": [{
            "heading": "Section",
            "paragraphs": [{
                "text": "claim",
                "citations": [{"chunk_id": 1, "span": "NONEXISTENT SPAN"}],
            }],
        }],
    })
    good_content = json.dumps({
        "title": "Retry Success",
        "sections": [{
            "heading": "Section",
            "paragraphs": [{
                "text": "claim",
                "citations": [{"chunk_id": 1, "span": "Sea ice extent reached record lows in 2024."}],
            }],
        }],
    })
    bad_body = {"choices": [{"message": {"content": bad_content}, "finish_reason": "stop"}]}
    good_body = {"choices": [{"message": {"content": good_content}, "finish_reason": "stop"}]}

    with patch("app.providers.httpx.post") as mock_post:
        mock_post.side_effect = [
            _make_response(200, bad_body),
            _make_response(200, good_body),
        ]
        result = generate_openrouter(_FAKE_MODEL, _FAKE_KEY, _CONTEXT, "article", "general_public")
    assert result["title"] == "Retry Success"
    assert mock_post.call_count == 2


def test_no_retry_on_non_citation_validation_error():
    """Structural validation errors (not citation-related) must not trigger a retry."""
    content = json.dumps({"wrong_key": "no title or sections"})
    body = {"choices": [{"message": {"content": content}, "finish_reason": "stop"}]}
    with patch("app.providers.httpx.post") as mock_post:
        mock_post.return_value = _make_response(200, body)
        with pytest.raises(ValueError, match="invalid content structure"):
            generate_openrouter(_FAKE_MODEL, _FAKE_KEY, _CONTEXT, "article", "general_public")
        assert mock_post.call_count == 1


# ---------------------------------------------------------------------------
# Tests: network errors
# ---------------------------------------------------------------------------


def test_timeout_raises_actionable_error():
    import httpx as _httpx
    with patch("app.providers.httpx.post") as mock_post:
        mock_post.side_effect = _httpx.TimeoutException("timed out")
        with pytest.raises(ValueError, match="timed out"):
            generate_openrouter(_FAKE_MODEL, _FAKE_KEY, _CONTEXT, "article", "general_public")


def test_network_error_raises_actionable_error():
    import httpx as _httpx
    with patch("app.providers.httpx.post") as mock_post:
        mock_post.side_effect = _httpx.ConnectError("connection refused")
        with pytest.raises(ValueError, match="Network error"):
            generate_openrouter(_FAKE_MODEL, _FAKE_KEY, _CONTEXT, "article", "general_public")


# ---------------------------------------------------------------------------
# Tests: validate_generation standalone
# ---------------------------------------------------------------------------


def test_validate_generation_empty_sections_raises():
    with pytest.raises(ValueError):
        _validate_generation({"title": "T", "sections": []}, _CONTEXT)


def test_validate_generation_no_citations_raises():
    result = {
        "title": "T",
        "sections": [{"heading": "H", "paragraphs": [{"text": "p", "citations": []}]}],
    }
    with pytest.raises(ValueError):
        _validate_generation(result, _CONTEXT)


def test_validate_generation_wrong_chunk_id_raises():
    result = {
        "title": "T",
        "sections": [{"heading": "H", "paragraphs": [{"text": "p", "citations": [{"chunk_id": 999, "span": "text"}]}]}],
    }
    with pytest.raises(ValueError):
        _validate_generation(result, _CONTEXT)


# ---------------------------------------------------------------------------
# Tests: Ollama path is unaffected
# ---------------------------------------------------------------------------


def test_generate_locally_calls_ollama_endpoint():
    """Ensure Ollama path still works and is not changed by this PR."""
    ollama_result = {"title": "T", "sections": [{"heading": "H", "paragraphs": [{"text": "p", "citations": [{"chunk_id": 1, "span": "Sea ice extent reached record lows in 2024."}]}]}]}
    with patch("app.providers.httpx.post") as mock_post:
        r = _make_response(200, {"response": json.dumps(ollama_result)})
        mock_post.return_value = r
        result = generate_locally("llama3", "http://localhost:11434", _CONTEXT, "article", "general_public")
    assert result["title"] == "T"
    called_url = mock_post.call_args[0][0]
    assert "ollama" in called_url or "11434" in called_url
