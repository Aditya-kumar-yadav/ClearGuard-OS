import io
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient
from PIL import Image

import main
from core.paypal_client import PayPalAuthError


client = TestClient(main.app)


def _make_png_bytes(color=(30, 180, 90), size=(64, 64)) -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGB", size, color=color)
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_health_endpoint_reports_status():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ONLINE"
    assert "paypal_configured" in data
    assert "gemini_configured" in data


def test_inspect_photo_requires_file():
    resp = client.post("/api/vision/inspect-photo", json={})
    assert resp.status_code == 400
    assert resp.json()["detail"]["error"] == "MissingPhotoPayload"


def test_inspect_photo_requires_gemini_key_when_unconfigured(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.setattr(main.vision_arbiter, "api_key", "")
    png_bytes = _make_png_bytes()
    resp = client.post(
        "/api/vision/inspect-photo",
        files={"file": ("parcel.png", png_bytes, "image/png")},
    )
    assert resp.status_code == 503
    assert resp.json()["detail"]["error"] == "GeminiConfigurationError"


def test_inspect_photo_multipart_with_real_pil_and_mocked_gemini(monkeypatch):
    monkeypatch.setattr(main.vision_arbiter, "api_key", "AIza_TEST_KEY")
    monkeypatch.setattr(main.vision_arbiter, "_genai_client", None)
    main.kill_switch.reset_lockdown()

    tx_id = "TX-REALPHOTO-1"
    test_tx = {
        "id": tx_id,
        "item_name": "Keychron Q1 Keyboard",
        "category": "electronics",
        "amount": 150.0,
        "currency": "USD",
        "status": "AUTHORIZED",
        "delivery_status": "AWAITING_DELIVERY",
        "paypal_auth_id": "AUTH-LIVE-999",
        "tracking_number": "TRK999111",
    }
    main.TRANSACTIONS_LEDGER.insert(0, test_tx)

    fake_gemini_payload = {
        "verdict": "DELIVERY_VERIFIED_INTACT",
        "condition": "INTACT_UNOPENED",
        "integrity_score": 0.96,
        "deformation_score": 0.04,
        "recommended_action": "CAPTURE_ESCROW",
        "ocr_extracted": {
            "carrier": "BlueDart Express",
            "tracking_number": "TRK999111",
            "destination_address": "Bengaluru 560001",
            "tamper_tape_intact": True,
        },
        "vision_reasoning": ["Sealed box intact cleanly.", "Shipping label clearly legible."],
    }

    mock_models = MagicMock()
    mock_models.generate_content.return_value = SimpleNamespace(text=json.dumps(fake_gemini_payload))
    mock_client = SimpleNamespace(models=mock_models)

    try:
        with patch("core.vision_arbiter.genai.Client", return_value=mock_client):
            resp = client.post(
                "/api/vision/inspect-photo",
                data={"transaction_id": tx_id},
                files={"file": ("parcel.png", _make_png_bytes(), "image/png")},
            )
        assert resp.status_code == 200
        body = resp.json()
        assert body["live_gemini_call"] is True
        assert body["paypal_capture_id"] is None  # Stage 5B: never auto-capture
        assert body["inspection"]["photo_mime_type"] == "image/png"
        assert body["inspection"]["photo_bytes"] > 0
        assert len(body["inspection"]["photo_sha256"]) == 64
        assert body["delivery_status"] == "DELIVERY_REVIEW_PENDING"
    finally:
        main.TRANSACTIONS_LEDGER[:] = [t for t in main.TRANSACTIONS_LEDGER if t.get("id") != tx_id]


def test_capture_and_void_transaction_endpoints(monkeypatch):
    main.kill_switch.reset_lockdown()
    tx_cap_id = "TX-CAP-TEST-1"
    tx_void_id = "TX-VOID-TEST-1"

    main.TRANSACTIONS_LEDGER.insert(
        0,
        {
            "id": tx_cap_id,
            "item_name": "Monitor",
            "category": "electronics",
            "amount": 100.0,
            "currency": "USD",
            "status": "AUTHORIZED",
            "delivery_status": "DELIVERY_VERIFIED",
            "paypal_auth_id": "AUTH-CAP-123",
        },
    )
    main.TRANSACTIONS_LEDGER.insert(
        0,
        {
            "id": tx_void_id,
            "item_name": "Broken Mouse",
            "category": "electronics",
            "amount": 50.0,
            "currency": "USD",
            "status": "AUTHORIZED",
            "delivery_status": "AWAITING_DELIVERY",
            "paypal_auth_id": "AUTH-VOID-456",
        },
    )

    try:
        cap_mock = AsyncMock(
            return_value={
                "capture_id": "CAP-SANDBOX-777",
                "status": "COMPLETED",
                "authorization_id": "AUTH-CAP-123",
                "live_call": True,
            }
        )
        void_mock = AsyncMock(
            return_value={
                "status": "VOIDED",
                "authorization_id": "AUTH-VOID-456",
                "live_call": True,
            }
        )
        monkeypatch.setattr(main.paypal_client, "capture_authorization_async", cap_mock)
        monkeypatch.setattr(main.paypal_client, "void_authorization", void_mock)

        cap_resp = client.post(f"/api/transactions/{tx_cap_id}/capture", json={})
        assert cap_resp.status_code == 200
        assert cap_resp.json()["status"] == "CAPTURED"
        assert cap_resp.json()["paypal_capture_id"] == "CAP-SANDBOX-777"
        cap_mock.assert_awaited_once()

        # Re-capturing already captured tx fails with 400
        recap_resp = client.post(f"/api/transactions/{tx_cap_id}/capture", json={})
        assert recap_resp.status_code == 400

        void_resp = client.post(f"/api/transactions/{tx_void_id}/void", json={"reason": "Damaged box"})
        assert void_resp.status_code == 200
        assert void_resp.json()["status"] == "VOIDED"
        void_mock.assert_awaited_once()
    finally:
        main.TRANSACTIONS_LEDGER[:] = [
            t for t in main.TRANSACTIONS_LEDGER if t.get("id") not in (tx_cap_id, tx_void_id)
        ]


def test_agent_procure_blocks_over_budget_before_paypal(monkeypatch):
    main.kill_switch.reset_lockdown()
    monkeypatch.setattr(main.vision_arbiter, "api_key", "AIza_TEST_KEY")

    fake_agent_output = {
        "model_used": "gemini-2.5-flash",
        "live_gemini_call": True,
        "analysis": {
            "item_name": "Luxury Watch",
            "category": "electronics",
            "estimated_amount_inr": 90000.0,
            "merchant": "Swiss Vault",
            "recommended_action": "PROCEED",
            "reasoning": "User asked for luxury item",
        },
    }
    monkeypatch.setattr(main.vision_arbiter, "analyze_procurement_prompt", MagicMock(return_value=fake_agent_output))
    create_order_spy = AsyncMock()
    monkeypatch.setattr(main.paypal_client, "create_order", create_order_spy)

    resp = client.post("/api/agent/procure", json={"prompt": "Buy luxury item 90000", "execute": True})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "GUARDRAIL_BLOCKED"
    assert data["order"] is None
    create_order_spy.assert_not_awaited()


def test_paypal_connect_rejects_invalid_oauth(monkeypatch):
    monkeypatch.setattr(
        main.paypal_client,
        "get_access_token",
        AsyncMock(side_effect=PayPalAuthError("Invalid client credentials")),
    )
    monkeypatch.setattr(main.paypal_client, "client_id", main.paypal_client.client_id)
    monkeypatch.setattr(main.paypal_client, "client_secret", main.paypal_client.client_secret)
    resp = client.post(
        "/api/paypal/connect",
        json={"client_id": "bad_id", "client_secret": "bad_secret", "email": "x@y.com"},
    )
    assert resp.status_code == 401
    assert resp.json()["detail"]["error"] == "PayPalAuthError"


def test_vision_mismatch_allows_3_attempts_before_void(monkeypatch):
    main.kill_switch.reset_lockdown()
    monkeypatch.setattr(main.vision_arbiter, "api_key", "AIza_TEST_KEY")
    monkeypatch.setattr(main.vision_arbiter, "_genai_client", None)
    monkeypatch.setattr(main, "_persist_ledger_cache", lambda: None)
    monkeypatch.setattr(main, "_save_vision_evidence", lambda **kw: None)

    tx_id = "TX-MISMATCH-GRACE-1"
    main.TRANSACTIONS_LEDGER.insert(
        0,
        {
            "id": tx_id,
            "item_name": "OnePlus 12 5G (16GB RAM, 512GB)",
            "category": "electronics",
            "amount": 494.12,
            "currency": "USD",
            "status": "AUTHORIZED",
            "delivery_status": "AWAITING_DELIVERY",
            "paypal_auth_id": "AUTH-GRACE-111",
            "tracking_number": "TRKGRACE01",
            "state_chain": [],
        },
    )

    mismatch_payload = {
        "verdict": "ITEM_MISMATCH_SUSPECTED_FRAUD",
        "condition": "MISMATCHED_ITEM",
        "integrity_score": 0.0,
        "deformation_score": 0.0,
        "detected_item": "Mechanical keyboard",
        "item_matches_order": False,
        "order_no_match_status": "ITEM_MISMATCH",
        "recommended_action": "VOID_ESCROW",
        "ocr_extracted": {"tamper_tape_intact": False},
        "vision_reasoning": ["Photo shows a keyboard instead of a OnePlus 12 5G phone."],
    }
    void_mock = AsyncMock(
        return_value={"status": "VOIDED", "authorization_id": "AUTH-GRACE-111", "live_call": True}
    )
    monkeypatch.setattr(main.paypal_client, "void_authorization", void_mock)

    mock_models = MagicMock()
    mock_models.generate_content.return_value = SimpleNamespace(text=json.dumps(mismatch_payload))
    mock_client = SimpleNamespace(models=mock_models)

    try:
        with patch("core.vision_arbiter.genai.Client", return_value=mock_client):
            # Attempt 1: mismatch -> keep AUTHORIZED hold intact (2 retries remaining)
            r1 = client.post(
                "/api/vision/inspect-photo",
                data={"transaction_id": tx_id, "auto_settle": "true"},
                files={"file": ("kbd1.png", _make_png_bytes((200, 40, 40)), "image/png")},
            )
            assert r1.status_code == 200
            d1 = r1.json()
            assert d1["status"] == "AUTHORIZED"
            assert d1["delivery_status"] == "VISION_MISMATCH_RETRY_PENDING"
            assert d1["grace_hold_active"] is True
            assert d1["mismatch_attempts"] == 1
            assert d1["attempts_remaining"] == 2
            void_mock.assert_not_awaited()

            # Attempt 2: mismatch -> keep AUTHORIZED hold intact (1 retry remaining)
            r2 = client.post(
                "/api/vision/inspect-photo",
                data={"transaction_id": tx_id, "auto_settle": "true"},
                files={"file": ("kbd2.png", _make_png_bytes((210, 50, 50)), "image/png")},
            )
            assert r2.status_code == 200
            d2 = r2.json()
            assert d2["status"] == "AUTHORIZED"
            assert d2["grace_hold_active"] is True
            assert d2["mismatch_attempts"] == 2
            assert d2["attempts_remaining"] == 1
            void_mock.assert_not_awaited()

            # Attempt 3: 3rd consecutive mismatch -> auto-void PayPal hold
            r3 = client.post(
                "/api/vision/inspect-photo",
                data={"transaction_id": tx_id, "auto_settle": "true"},
                files={"file": ("kbd3.png", _make_png_bytes((220, 60, 60)), "image/png")},
            )
            assert r3.status_code == 200
            d3 = r3.json()
            assert d3["status"] == "VOIDED"
            assert d3["grace_hold_active"] is False
            assert d3["auto_settled"] is True
            assert d3["mismatch_attempts"] == 3
            assert d3["attempts_remaining"] == 0
            void_mock.assert_awaited_once()
    finally:
        main.TRANSACTIONS_LEDGER[:] = [t for t in main.TRANSACTIONS_LEDGER if t.get("id") != tx_id]

