import pytest
import asyncio
import time
import json
import uuid
from decimal import Decimal
from unittest.mock import patch, AsyncMock
import httpx
from fastapi.testclient import TestClient

from core.paypal_client import (
    PayPalOrdersClient,
    PayPalError,
    PayPalConfigurationError,
    PayPalValidationError,
    PayPalAuthError,
    PayPalNetworkError,
    PayPalTimeoutError,
    PayPalAPIError,
    PayPalNotFoundError,
)
import main
from main import app

TEST_CLIENT_ID = "SANDBOX_CLIENT_ID_987654321"
TEST_CLIENT_SECRET = "SANDBOX_SECRET_KEY_123456789"
TEST_BASE_URL = "https://api-m.sandbox.paypal.com"


@pytest.fixture
def mock_client():
    client = PayPalOrdersClient(
        client_id=TEST_CLIENT_ID,
        client_secret=TEST_CLIENT_SECRET,
        base_url=TEST_BASE_URL,
    )
    # Pre-cache a valid token so tests focus on order endpoints
    client._cached_token = "TEST_ORDERS_MOCK_BEARER_TOKEN"
    client._token_expires_at = time.time() + 3600.0
    return client


# ---------------------------------------------------------------------------
# TEST 1: Successful Order Creation
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_successful_order_creation(mock_client):
    order_id = "5O1234567890ABCDE"
    approval_href = f"https://www.sandbox.paypal.com/checkoutnow?token={order_id}"

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            201,
            json={
                "id": order_id,
                "status": "CREATED",
                "intent": "AUTHORIZE",
                "purchase_units": [
                    {
                        "reference_id": "ESCROW-001",
                        "amount": {"currency_code": "USD", "value": "450.00"}
                    }
                ],
                "create_time": "2026-11-08T12:00:00Z",
                "links": [
                    {"href": f"{TEST_BASE_URL}/v2/checkout/orders/{order_id}", "rel": "self", "method": "GET"},
                    {"href": approval_href, "rel": "approve", "method": "GET"},
                    {"href": f"{TEST_BASE_URL}/v2/checkout/orders/{order_id}/authorize", "rel": "authorize", "method": "POST"}
                ]
            }
        )

    mock_client._async_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))

    res = await mock_client.create_order(
        item_name="Dell UltraSharp 4K Monitor",
        amount=Decimal("450.00"),
        currency="USD",
        idempotency_key="TEST-REQ-ID-001"
    )

    assert res["order_id"] == order_id
    assert res["status"] == "CREATED"
    assert res["intent"] == "AUTHORIZE"
    assert res["approval_url"] == approval_href
    assert res["amount"] == "450.00"
    assert res["currency"] == "USD"
    assert res["idempotency_key"] == "TEST-REQ-ID-001"


# ---------------------------------------------------------------------------
# TEST 2: Correct Intent AUTHORIZE
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_order_creation_intent_authorize(mock_client):
    captured_body = None

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal captured_body
        captured_body = json.loads(request.read().decode("utf-8"))
        return httpx.Response(
            201,
            json={"id": "5O_TEST_INTENT", "status": "CREATED", "intent": "AUTHORIZE", "links": []}
        )

    mock_client._async_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))

    await mock_client.create_order(item_name="Laptop", amount="800.00", currency="USD")

    assert captured_body is not None
    assert captured_body.get("intent") == "AUTHORIZE"


# ---------------------------------------------------------------------------
# TEST 3: Correct Purchase-Unit Amount and Currency (Strict Decimal Precision)
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_purchase_unit_amount_and_currency(mock_client):
    captured_body = None

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal captured_body
        captured_body = json.loads(request.read().decode("utf-8"))
        return httpx.Response(
            201,
            json={"id": "5O_TEST_AMOUNT", "status": "CREATED", "links": []}
        )

    mock_client._async_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))

    # Pass 499.999 which must round half up strictly to 500.00
    await mock_client.create_order(
        item_name="Workstation Device",
        amount=Decimal("499.999"),
        currency="USD"
    )

    pu = captured_body["purchase_units"][0]
    assert pu["amount"]["currency_code"] == "USD"
    assert pu["amount"]["value"] == "500.00"


# ---------------------------------------------------------------------------
# TEST 4: Correct Bearer Token Usage
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_correct_bearer_token_usage(mock_client):
    captured_auth = None

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal captured_auth
        captured_auth = request.headers.get("Authorization")
        return httpx.Response(201, json={"id": "5O_TOKEN_TEST", "status": "CREATED", "links": []})

    mock_client._async_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))

    await mock_client.create_order(item_name="Server Reserve", amount="120.00", currency="USD")

    assert captured_auth == "Bearer TEST_ORDERS_MOCK_BEARER_TOKEN"


# ---------------------------------------------------------------------------
# TEST 5: Approval URL Extraction
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_approval_url_extraction(mock_client):
    expected_approve = "https://www.sandbox.paypal.com/checkoutnow?token=APPROVE_TOKEN_999"

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            201,
            json={
                "id": "5O_APPROVE_EXTRACT",
                "status": "CREATED",
                "links": [
                    {"href": "https://api-m.sandbox.paypal.com/self", "rel": "self"},
                    {"href": expected_approve, "rel": "approve"},
                ]
            }
        )

    mock_client._async_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))

    res = await mock_client.create_order(item_name="Tablet", amount="300.00", currency="USD")
    assert res["approval_url"] == expected_approve


# ---------------------------------------------------------------------------
# TEST 6: Successful Order Retrieval (GET /v2/checkout/orders/{id})
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_successful_order_retrieval(mock_client):
    target_id = "5O_EXISTING_ORDER_77"

    def handler(request: httpx.Request) -> httpx.Response:
        assert str(request.url).endswith(f"/v2/checkout/orders/{target_id}")
        assert request.method == "GET"
        return httpx.Response(
            200,
            json={
                "id": target_id,
                "status": "APPROVED",
                "intent": "AUTHORIZE",
                "purchase_units": [{"amount": {"currency_code": "USD", "value": "250.00"}}],
                "create_time": "2026-11-08T14:00:00Z",
                "links": [
                    {"href": f"{TEST_BASE_URL}/v2/checkout/orders/{target_id}", "rel": "self"},
                    {"href": "https://www.sandbox.paypal.com/approve", "rel": "approve"}
                ]
            }
        )

    mock_client._async_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))

    order = await mock_client.get_order(target_id)
    assert order["order_id"] == target_id
    assert order["status"] == "APPROVED"
    assert order["intent"] == "AUTHORIZE"
    assert order["approval_url"] == "https://www.sandbox.paypal.com/approve"


# ---------------------------------------------------------------------------
# TEST 7: Invalid Order ID (HTTP 404)
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_invalid_order_id_404(mock_client):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404, json={"name": "RESOURCE_NOT_FOUND", "message": "The specified resource does not exist."})

    mock_client._async_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))

    with pytest.raises(PayPalNotFoundError) as exc_info:
        await mock_client.get_order("NON_EXISTENT_ORDER_ID")
    assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------
# TEST 8: PayPal Authentication Failure
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_auth_failure_on_orders(mock_client):
    # Expire token and have OAuth endpoint return 401
    mock_client._cached_token = None
    mock_client._token_expires_at = 0.0

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"error": "invalid_client"})

    mock_client._async_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))

    with pytest.raises(PayPalAuthError):
        await mock_client.create_order(item_name="Item", amount="100.00", currency="USD")

    with pytest.raises(PayPalAuthError):
        await mock_client.get_order("ORDER_ID_ANY")


# ---------------------------------------------------------------------------
# TEST 9: PayPal Rate Limiting (HTTP 429)
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_paypal_rate_limiting_orders(mock_client):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(429, json={"error": "RATE_LIMIT_EXCEEDED"})

    mock_client._async_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))

    with pytest.raises(PayPalAPIError) as exc_info:
        await mock_client.create_order(item_name="Item", amount="100.00", currency="USD")
    assert exc_info.value.status_code == 429


# ---------------------------------------------------------------------------
# TEST 10: Network Failure and Timeout Handling
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_network_failure_and_timeout_orders(mock_client):
    def timeout_handler(request: httpx.Request) -> httpx.Response:
        raise httpx.TimeoutException("Read timed out after 5.0s")

    mock_client._async_client = httpx.AsyncClient(transport=httpx.MockTransport(timeout_handler))
    with pytest.raises(PayPalTimeoutError):
        await mock_client.create_order(item_name="Item", amount="100.00", currency="USD")

    def network_handler(request: httpx.Request) -> httpx.Response:
        raise httpx.NetworkError("Connection reset by peer")

    mock_client._async_client = httpx.AsyncClient(transport=httpx.MockTransport(network_handler))
    with pytest.raises(PayPalNetworkError):
        await mock_client.get_order("ORDER_TEST")


# ---------------------------------------------------------------------------
# TEST 11: Invalid PayPal Response (Malformed JSON or Missing ID)
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_invalid_paypal_response(mock_client):
    # Missing ID in 201 response
    def missing_id_handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(201, json={"status": "CREATED"})

    mock_client._async_client = httpx.AsyncClient(transport=httpx.MockTransport(missing_id_handler))
    with pytest.raises(PayPalAPIError) as exc_info:
        await mock_client.create_order(item_name="Item", amount="100.00", currency="USD")
    assert "missing 'id'" in str(exc_info.value).lower()

    # Non-JSON HTML response
    def html_handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text="<html>502 Server Error</html>")

    mock_client._async_client = httpx.AsyncClient(transport=httpx.MockTransport(html_handler))
    with pytest.raises(PayPalAPIError):
        await mock_client.get_order("ORDER_123")


# ---------------------------------------------------------------------------
# TEST 12: Guardrail Rejection Prevents PayPal API Calls (Zero Calls)
# ---------------------------------------------------------------------------
def test_guardrail_rejection_prevents_paypal_calls():
    test_client = TestClient(app)

    # Attempt to procure an item exceeding the single-spend cap (₹100,000 > ₹55,000 cap)
    with patch.object(main.paypal_client, "create_order", new_callable=AsyncMock) as mock_create_order:
        response = test_client.post(
            "/api/procure-item",
            json={
                "name": "Rolex Submariner Oystersteel Watch",
                "category": "luxury",
                "amount": "100000.00",
                "currency": "INR",
                "merchant": "Swiss Chrono Vault Dealers"
            }
        )

        # Must return HTTP 403 Forbidden
        assert response.status_code == 403
        # Strict invariant: ZERO calls made to PayPal
        mock_create_order.assert_not_called()


# ---------------------------------------------------------------------------
# TEST 13: Idempotency Key Stability & Retry Reuse
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_idempotency_key_stability(mock_client):
    captured_headers = []

    def handler(request: httpx.Request) -> httpx.Response:
        captured_headers.append(request.headers.get("PayPal-Request-Id"))
        return httpx.Response(201, json={"id": "5O_IDEMPOTENT", "status": "CREATED", "links": []})

    mock_client._async_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))

    stable_key = "MY-STABLE-PURCHASE-KEY-12345"

    # Attempt 1
    await mock_client.create_order(item_name="Item A", amount="50.00", currency="USD", idempotency_key=stable_key)
    # Attempt 2 (Retry of same logical purchase)
    await mock_client.create_order(item_name="Item A", amount="50.00", currency="USD", idempotency_key=stable_key)

    # Both calls must send the exact same PayPal-Request-Id
    assert len(captured_headers) == 2
    assert captured_headers[0] == stable_key
    assert captured_headers[1] == stable_key

    # Two separate calls without explicit key must generate two DIFFERENT keys
    captured_headers.clear()
    await mock_client.create_order(item_name="Item A", amount="50.00", currency="USD")
    await mock_client.create_order(item_name="Item A", amount="50.00", currency="USD")
    assert captured_headers[0] != captured_headers[1]


# ---------------------------------------------------------------------------
# TEST 14: Order Creation Does NOT Produce Auth ID or AUTHORIZED Status
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_order_creation_does_not_produce_auth_id(mock_client):
    test_client = TestClient(app)

    # Mock real PayPal order creation returning CREATED status
    mock_order_res = {
        "order_id": "5O_GENUINE_SANDBOX_ORDER",
        "status": "CREATED",
        "intent": "AUTHORIZE",
        "approval_url": "https://www.sandbox.paypal.com/checkoutnow?token=5O_GENUINE_SANDBOX_ORDER",
        "amount": "420.00",
        "currency": "USD",
        "idempotency_key": "IDEM-TEST-44",
        "purchase_units": []
    }

    with patch.object(main.paypal_client, "create_order", new_callable=AsyncMock, return_value=mock_order_res):
        res = test_client.post(
            "/api/procure-item",
            json={
                "name": "OnePlus 12 5G",
                "category": "electronics",
                "amount": "420.00",
                "currency": "USD",
                "merchant": "OnePlus Corporate Direct"
            }
        )

        assert res.status_code == 200
        data = res.json()

        # Strict payment lifecycle checks:
        assert data["status"] == "ORDER_CREATED"
        assert data["payment_status"] == "PENDING_BUYER_APPROVAL"
        assert data["paypal_auth_id"] is None, "paypal_auth_id MUST be None upon order creation"
        assert data["paypal_order_id"] == "5O_GENUINE_SANDBOX_ORDER"
        assert data["approval_url"] == "https://www.sandbox.paypal.com/checkoutnow?token=5O_GENUINE_SANDBOX_ORDER"


# ---------------------------------------------------------------------------
# TEST 15: Currency Validation (No Hardcoded INR Exchange Rate)
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_currency_validation(mock_client):
    # Unsupported currency must raise PayPalValidationError
    with pytest.raises(PayPalValidationError) as exc_info:
        await mock_client.create_order(item_name="Item", amount="100.00", currency="XYZ_UNSUPPORTED")
    assert "Unsupported currency" in str(exc_info.value)

    # Supported currency passes and is transmitted without exchange rate tampering
    captured_body = None

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal captured_body
        captured_body = json.loads(request.read().decode("utf-8"))
        return httpx.Response(201, json={"id": "5O_CURR_TEST", "status": "CREATED", "links": []})

    mock_client._async_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))

    await mock_client.create_order(item_name="Item", amount="250.00", currency="EUR")
    assert captured_body["purchase_units"][0]["amount"]["currency_code"] == "EUR"
    assert captured_body["purchase_units"][0]["amount"]["value"] == "250.00"


# ---------------------------------------------------------------------------
# TEST 16: Zero-Decimal Currency Precision (e.g. JPY, HUF, TWD)
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_zero_decimal_currency_precision(mock_client):
    captured_body = None

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal captured_body
        captured_body = json.loads(request.read().decode("utf-8"))
        return httpx.Response(201, json={"id": "5O_JPY_TEST", "status": "CREATED", "links": []})

    mock_client._async_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))

    # 1. Whole integer JPY must be accepted and formatted without decimals
    res = await mock_client.create_order(item_name="Japanese Component", amount="50000", currency="JPY")
    assert captured_body["purchase_units"][0]["amount"]["currency_code"] == "JPY"
    assert captured_body["purchase_units"][0]["amount"]["value"] == "50000"
    assert res["amount"] == "50000"

    # 2. Fractional amount for zero-decimal currency (e.g. JPY 100.50) MUST be rejected with PayPalValidationError
    with pytest.raises(PayPalValidationError) as exc_info:
        await mock_client.create_order(item_name="Fractional JPY Item", amount="100.50", currency="JPY")
    assert "does not support fractional amounts" in str(exc_info.value)

    # 3. Fractional amount for HUF (e.g. HUF 12500.25) MUST also be rejected
    with pytest.raises(PayPalValidationError) as exc_info_huf:
        await mock_client.create_order(item_name="Fractional HUF Item", amount="12500.25", currency="HUF")
    assert "does not support fractional amounts" in str(exc_info_huf.value)

    # 4. Standard 2-decimal currency (USD) with fractions must remain fully valid
    res_usd = await mock_client.create_order(item_name="Standard USD Item", amount="100.50", currency="USD")
    assert captured_body["purchase_units"][0]["amount"]["currency_code"] == "USD"
    assert captured_body["purchase_units"][0]["amount"]["value"] == "100.50"



