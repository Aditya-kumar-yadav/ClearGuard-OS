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
from core.crypto_ledger import verify_hash_chain
from core.kill_switch import kill_switch
import main
from main import app, TRANSACTIONS_LEDGER, ACTIVE_MANDATE

TEST_CLIENT_ID = "SANDBOX_CLIENT_ID_STAGE4_98765"
TEST_CLIENT_SECRET = "SANDBOX_SECRET_KEY_STAGE4_12345"
TEST_BASE_URL = "https://api-m.sandbox.paypal.com"


@pytest.fixture
def mock_client():
    client = PayPalOrdersClient(
        client_id=TEST_CLIENT_ID,
        client_secret=TEST_CLIENT_SECRET,
        base_url=TEST_BASE_URL,
    )
    client._cached_token = "TEST_AUTH_MOCK_BEARER_TOKEN"
    client._token_expires_at = time.time() + 3600.0
    return client


# ===========================================================================
# 1. PayPalOrdersClient.authorize_order() Unit Tests
# ===========================================================================

@pytest.mark.asyncio
async def test_client_authorize_order_success(mock_client):
    """Verifies successful PayPal Orders v2 authorization returns genuine authorization ID."""
    order_id = "5O_TEST_APPROVED_001"
    auth_id = "2W_GENUINE_AUTH_98765"

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "POST"
        assert f"/v2/checkout/orders/{order_id}/authorize" in str(request.url)
        assert request.headers.get("authorization") == "Bearer TEST_AUTH_MOCK_BEARER_TOKEN"
        assert request.headers.get("paypal-request-id") == "STABLE-IDEMP-KEY-001"

        return httpx.Response(
            201,
            json={
                "id": order_id,
                "status": "COMPLETED",
                "purchase_units": [
                    {
                        "reference_id": "ESCROW-001",
                        "payments": {
                            "authorizations": [
                                {
                                    "id": auth_id,
                                    "status": "CREATED",
                                    "amount": {"currency_code": "USD", "value": "450.00"},
                                    "seller_protection": {
                                        "status": "ELIGIBLE",
                                        "dispute_categories": ["ITEM_NOT_RECEIVED", "UNAUTHORIZED_TRANSACTION"]
                                    },
                                    "expiration_time": "2026-12-08T12:00:00Z",
                                    "create_time": "2026-11-08T12:00:00Z",
                                    "links": []
                                }
                            ]
                        }
                    }
                ]
            }
        )

    mock_client._async_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))

    res = await mock_client.authorize_order(order_id, idempotency_key="STABLE-IDEMP-KEY-001")

    assert res["order_id"] == order_id
    assert res["authorization_id"] == auth_id
    assert res["status"] == "CREATED"
    assert res["amount"] == "450.00"
    assert res["currency"] == "USD"
    assert res["seller_protection"]["status"] == "ELIGIBLE"
    assert res["idempotency_key"] == "STABLE-IDEMP-KEY-001"


@pytest.mark.asyncio
async def test_client_authorize_order_empty_id_raises_validation_error(mock_client):
    """Empty or whitespace order_id must raise PayPalValidationError."""
    with pytest.raises(PayPalValidationError) as exc:
        await mock_client.authorize_order("")
    assert "PayPal Order ID is required" in str(exc.value)

    with pytest.raises(PayPalValidationError):
        await mock_client.authorize_order("   ")


@pytest.mark.asyncio
async def test_client_authorize_order_missing_auth_id_in_response(mock_client):
    """PayPal 201 response missing authorization ID must raise PayPalAPIError."""
    order_id = "5O_TEST_MISSING_AUTH"

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            201,
            json={
                "id": order_id,
                "status": "COMPLETED",
                "purchase_units": [{"payments": {"authorizations": []}}]
            }
        )

    mock_client._async_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))

    with pytest.raises(PayPalAPIError) as exc:
        await mock_client.authorize_order(order_id)
    assert "response missing" in str(exc.value)


@pytest.mark.asyncio
async def test_client_authorize_order_denied_status_raises_error(mock_client):
    """Authorization status of DENIED or VOIDED must raise PayPalAPIError."""
    order_id = "5O_TEST_DENIED"

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "id": order_id,
                "status": "COMPLETED",
                "purchase_units": [
                    {
                        "payments": {
                            "authorizations": [
                                {
                                    "id": "2W_DENIED_AUTH",
                                    "status": "DENIED",
                                    "amount": {"currency_code": "USD", "value": "100.00"}
                                }
                            ]
                        }
                    }
                ]
            }
        )

    mock_client._async_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))

    with pytest.raises(PayPalAPIError) as exc:
        await mock_client.authorize_order(order_id)
    assert "rejected by payment processor with status 'DENIED'" in str(exc.value)


@pytest.mark.asyncio
async def test_client_authorize_order_pending_status(mock_client):
    """Verifies that authorize_order handles PENDING status correctly, returning valid authorization dict."""
    order_id = "5O_TEST_PENDING_001"
    auth_id = "2W_PENDING_AUTH_54321"

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            201,
            json={
                "id": order_id,
                "status": "COMPLETED",
                "purchase_units": [
                    {
                        "payments": {
                            "authorizations": [
                                {
                                    "id": auth_id,
                                    "status": "PENDING",
                                    "amount": {"currency_code": "USD", "value": "420.00"},
                                    "seller_protection": {"status": "NOT_ELIGIBLE"},
                                    "status_details": {"reason": "PENDING_REVIEW"}
                                }
                            ]
                        }
                    }
                ]
            }
        )

    mock_client._async_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    res = await mock_client.authorize_order(order_id)
    assert res["order_id"] == order_id
    assert res["authorization_id"] == auth_id
    assert res["status"] == "PENDING"
    assert res["amount"] == "420.00"
    assert res["currency"] == "USD"


@pytest.mark.asyncio
async def test_client_authorize_order_missing_status_raises_error(mock_client):
    """PayPal authorization response missing a valid 'status' field must raise PayPalAPIError."""
    order_id = "5O_TEST_NO_STATUS"

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            201,
            json={
                "id": order_id,
                "status": "COMPLETED",
                "purchase_units": [
                    {
                        "payments": {
                            "authorizations": [
                                {
                                    "id": "2W_AUTH_NO_STATUS",
                                    # missing 'status'
                                    "amount": {"currency_code": "USD", "value": "420.00"}
                                }
                            ]
                        }
                    }
                ]
            }
        )

    mock_client._async_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    with pytest.raises(PayPalAPIError) as exc:
        await mock_client.authorize_order(order_id)
    assert "missing a valid 'status'" in str(exc.value)


@pytest.mark.asyncio
async def test_client_authorize_order_400_not_approved(mock_client):
    """PayPal 400 response raises typed PayPalAPIError."""
    order_id = "5O_NOT_APPROVED_400"

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            400,
            headers={"content-type": "application/json"},
            json={
                "name": "ORDER_NOT_APPROVED",
                "message": "Payer has not yet approved the order.",
                "details": [{"issue": "ORDER_NOT_APPROVED"}]
            }
        )

    mock_client._async_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))

    with pytest.raises(PayPalAPIError) as exc:
        await mock_client.authorize_order(order_id)
    assert exc.value.status_code == 400
    assert "ORDER_NOT_APPROVED" in str(exc.value)


@pytest.mark.asyncio
async def test_client_authorize_order_401_unauthorized(mock_client):
    """PayPal 401 response raises typed PayPalAuthError."""
    order_id = "5O_AUTH_401"

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"error": "invalid_token"})

    mock_client._async_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))

    with pytest.raises(PayPalAuthError) as exc:
        await mock_client.authorize_order(order_id)
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_client_authorize_order_404_not_found(mock_client):
    """PayPal 404 response raises typed PayPalNotFoundError."""
    order_id = "5O_NOT_FOUND_404"

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404, headers={"content-type": "application/json"}, json={"message": "Order not found"})

    mock_client._async_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))

    with pytest.raises(PayPalNotFoundError) as exc:
        await mock_client.authorize_order(order_id)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_client_authorize_order_500_server_error(mock_client):
    """PayPal 500 response raises typed PayPalAPIError with 500 status."""
    order_id = "5O_SERVER_ERR_500"

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, text="Internal Server Error")

    mock_client._async_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))

    with pytest.raises(PayPalAPIError) as exc:
        await mock_client.authorize_order(order_id)
    assert exc.value.status_code == 500


@pytest.mark.asyncio
async def test_client_authorize_order_timeout(mock_client):
    """Network timeout during authorization raises PayPalTimeoutError."""
    order_id = "5O_TIMEOUT_TEST"

    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.TimeoutException("Authorization timed out")

    mock_client._async_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))

    with pytest.raises(PayPalTimeoutError) as exc:
        await mock_client.authorize_order(order_id)
    assert "timed out" in str(exc.value)


@pytest.mark.asyncio
async def test_client_authorize_order_network_error(mock_client):
    """Network connection failure raises PayPalNetworkError."""
    order_id = "5O_NET_FAIL"

    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.NetworkError("Connection refused")

    mock_client._async_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))

    with pytest.raises(PayPalNetworkError) as exc:
        await mock_client.authorize_order(order_id)
    assert "Network error" in str(exc.value)


@pytest.mark.asyncio
async def test_client_authorize_order_unconfigured():
    """Client without credentials raises PayPalConfigurationError before any HTTP request."""
    client = PayPalOrdersClient(client_id="", client_secret="", base_url="https://api-m.sandbox.paypal.com")
    with pytest.raises(PayPalConfigurationError):
        await client.authorize_order("5O_UNCONFIGURED")


# ===========================================================================
# 2. FastAPI Endpoint Integration Tests (/api/paypal/orders/{order_id}/authorize)
# ===========================================================================

@pytest.fixture
def clean_ledger_transaction():
    """Helper to create a fresh test transaction in ORDER_CREATED status in TRANSACTIONS_LEDGER."""
    tx_id = f"TX-STAGE4-{uuid.uuid4().hex[:6].upper()}"
    order_id = f"5O-TEST-ORDER-{uuid.uuid4().hex[:6].upper()}"
    test_tx = {
        "id": tx_id,
        "item_name": "OnePlus 12 5G Test Phone",
        "category": "electronics",
        "amount": 420.00,
        "currency": "USD",
        "merchant_name": "OnePlus Direct Corporate",
        "status": "ORDER_CREATED",
        "payment_status": "PENDING_BUYER_APPROVAL",
        "paypal_order_id": order_id,
        "paypal_auth_id": None,
        "paypal_capture_id": None,
        "paypal_dispute_id": None,
        "approval_url": f"https://www.sandbox.paypal.com/checkoutnow?token={order_id}",
        "idempotency_key": f"IDEM-{tx_id}",
        "tracking_number": "TRK-TEST-999",
        "carrier": "BlueDart Express",
        "delivery_status": "AWAITING_APPROVAL",
        "created_at": "2026-11-08T12:00:00Z"
    }
    main.insert_ledger_transaction(test_tx)
    return test_tx


@pytest.mark.asyncio
async def test_endpoint_successful_authorization(clean_ledger_transaction):
    """
    Complete end-to-end authorization flow:
    1. Buyer returns from PayPal.
    2. Backend verifies buyer approval from PayPal get_order (status: 'APPROVED').
    3. Backend verifies amount and currency match internal transaction.
    4. Backend re-verifies mandate constraints.
    5. Backend calls authorize_order and extracts genuine authorization ID.
    6. Transaction transitions to AUTHORIZED with payment_status: PAYMENT_AUTHORIZED.
    7. Cryptographic SHA-256 state chain is updated and verified unbroken.
    """
    test_client = TestClient(app)
    tx = clean_ledger_transaction
    order_id = tx["paypal_order_id"]
    auth_id = f"2W_GENUINE_AUTH_{uuid.uuid4().hex[:8].upper()}"

    mock_paypal_order = {
        "id": order_id,
        "status": "APPROVED",
        "intent": "AUTHORIZE",
        "purchase_units": [
            {
                "reference_id": "ESCROW-001",
                "amount": {"currency_code": "USD", "value": "420.00"}
            }
        ]
    }

    mock_auth_res = {
        "order_id": order_id,
        "authorization_id": auth_id,
        "status": "CREATED",
        "order_status": "COMPLETED",
        "amount": "420.00",
        "currency": "USD",
        "seller_protection": {"status": "ELIGIBLE"},
        "expiration_time": "2026-12-08T12:00:00Z",
        "idempotency_key": tx["idempotency_key"],
        "raw_response": {}
    }

    with patch.object(main.paypal_client, "get_order", new_callable=AsyncMock, return_value=mock_paypal_order) as mock_get:
        with patch.object(main.paypal_client, "authorize_order", new_callable=AsyncMock, return_value=mock_auth_res) as mock_auth:
            res = test_client.post(f"/api/paypal/orders/{order_id}/authorize")

            assert res.status_code == 200
            data = res.json()

            # Verify response structure
            assert data["status"] == "AUTHORIZED"
            assert data["payment_status"] == "PAYMENT_AUTHORIZED"
            assert data["paypal_order_id"] == order_id
            assert data["paypal_auth_id"] == auth_id
            assert data["live_call"] is True

            # Verify server-side get_order was called before authorize_order
            mock_get.assert_called_once_with(order_id)
            mock_auth.assert_called_once()

            # Verify internal transaction state was updated
            assert tx["status"] == "AUTHORIZED"
            assert tx["payment_status"] == "PAYMENT_AUTHORIZED"
            assert tx["paypal_auth_id"] == auth_id
            assert tx["delivery_status"] == "AWAITING_DELIVERY"

            # Verify cryptographic SHA-256 state chain integrity
            is_valid, reason, chain_history = verify_hash_chain(tx["state_chain"], tx["state_hash"], tx["amount"], tx["status"])
            assert is_valid is True, f"Cryptographic state hash chain must be verified unbroken: {reason}"
            assert len(chain_history) >= 2


@pytest.mark.asyncio
async def test_endpoint_unapproved_order_rejected(clean_ledger_transaction):
    """Order with status 'CREATED' (not 'APPROVED') must be rejected with 400 Bad Request."""
    test_client = TestClient(app)
    tx = clean_ledger_transaction
    order_id = tx["paypal_order_id"]

    mock_paypal_order = {
        "id": order_id,
        "status": "CREATED",  # Buyer has NOT approved yet
        "purchase_units": [{"amount": {"currency_code": "USD", "value": "420.00"}}]
    }

    with patch.object(main.paypal_client, "get_order", new_callable=AsyncMock, return_value=mock_paypal_order):
        with patch.object(main.paypal_client, "authorize_order", new_callable=AsyncMock) as mock_auth:
            res = test_client.post(f"/api/paypal/orders/{order_id}/authorize")

            assert res.status_code == 400
            data = res.json()
            assert data["detail"]["error"] == "OrderNotApproved"
            assert "Buyer must approve" in data["detail"]["message"]

            # Authorize API must NOT be called
            mock_auth.assert_not_called()
            assert tx["status"] == "ORDER_CREATED"
            assert tx["paypal_auth_id"] is None


@pytest.mark.asyncio
async def test_endpoint_cancelled_or_voided_order_rejected(clean_ledger_transaction):
    """Order with status 'VOIDED' cannot be authorized."""
    test_client = TestClient(app)
    tx = clean_ledger_transaction
    order_id = tx["paypal_order_id"]

    mock_paypal_order = {
        "id": order_id,
        "status": "VOIDED",
        "purchase_units": [{"amount": {"currency_code": "USD", "value": "420.00"}}]
    }

    with patch.object(main.paypal_client, "get_order", new_callable=AsyncMock, return_value=mock_paypal_order):
        with patch.object(main.paypal_client, "authorize_order", new_callable=AsyncMock) as mock_auth:
            res = test_client.post(f"/api/paypal/orders/{order_id}/authorize")

            assert res.status_code == 400
            data = res.json()
            assert data["detail"]["error"] == "OrderNotApproved"
            mock_auth.assert_not_called()


@pytest.mark.asyncio
async def test_endpoint_mismatched_amount_rejected(clean_ledger_transaction):
    """If PayPal order amount does not match internal transaction amount, authorization must be rejected."""
    test_client = TestClient(app)
    tx = clean_ledger_transaction
    order_id = tx["paypal_order_id"]

    mock_paypal_order = {
        "id": order_id,
        "status": "APPROVED",
        "purchase_units": [
            {
                # PayPal reports 999.00 while transaction is 420.00
                "amount": {"currency_code": "USD", "value": "999.00"}
            }
        ]
    }

    with patch.object(main.paypal_client, "get_order", new_callable=AsyncMock, return_value=mock_paypal_order):
        with patch.object(main.paypal_client, "authorize_order", new_callable=AsyncMock) as mock_auth:
            res = test_client.post(f"/api/paypal/orders/{order_id}/authorize")

            assert res.status_code == 400
            data = res.json()
            assert data["detail"]["error"] == "AmountMismatch"
            mock_auth.assert_not_called()


@pytest.mark.asyncio
async def test_endpoint_mismatched_currency_rejected(clean_ledger_transaction):
    """If PayPal order currency differs from internal transaction currency, authorization must be rejected."""
    test_client = TestClient(app)
    tx = clean_ledger_transaction
    order_id = tx["paypal_order_id"]

    mock_paypal_order = {
        "id": order_id,
        "status": "APPROVED",
        "purchase_units": [
            {
                # PayPal reports EUR while transaction is USD
                "amount": {"currency_code": "EUR", "value": "420.00"}
            }
        ]
    }

    with patch.object(main.paypal_client, "get_order", new_callable=AsyncMock, return_value=mock_paypal_order):
        with patch.object(main.paypal_client, "authorize_order", new_callable=AsyncMock) as mock_auth:
            res = test_client.post(f"/api/paypal/orders/{order_id}/authorize")

            assert res.status_code == 400
            data = res.json()
            assert data["detail"]["error"] == "CurrencyMismatch"
            mock_auth.assert_not_called()


@pytest.mark.asyncio
async def test_endpoint_unknown_order_404():
    """Authorization for non-existent PayPal order ID returns 404 TransactionNotFound."""
    test_client = TestClient(app)
    res = test_client.post("/api/paypal/orders/5O_UNKNOWN_ORDER_9999/authorize")

    assert res.status_code == 404
    data = res.json()
    assert data["detail"]["error"] == "TransactionNotFound"


@pytest.mark.asyncio
async def test_endpoint_idempotency_already_authorized(clean_ledger_transaction):
    """Calling authorize on an already AUTHORIZED transaction returns existing result without calling PayPal again."""
    test_client = TestClient(app)
    tx = clean_ledger_transaction
    order_id = tx["paypal_order_id"]

    # Pre-mark transaction as AUTHORIZED with genuine auth ID
    tx["status"] = "AUTHORIZED"
    tx["paypal_auth_id"] = "2W_PRE_EXISTING_AUTH_123"

    with patch.object(main.paypal_client, "get_order", new_callable=AsyncMock) as mock_get:
        with patch.object(main.paypal_client, "authorize_order", new_callable=AsyncMock) as mock_auth:
            res = test_client.post(f"/api/paypal/orders/{order_id}/authorize")

            assert res.status_code == 200
            data = res.json()
            assert data["status"] == "AUTHORIZED"
            assert data["paypal_auth_id"] == "2W_PRE_EXISTING_AUTH_123"
            assert data["already_authorized"] is True
            assert data["live_call"] is False

            # Zero PayPal calls made on idempotent repeat
            mock_get.assert_not_called()
            mock_auth.assert_not_called()


@pytest.mark.asyncio
async def test_endpoint_idempotency_key_preserved_on_retry(clean_ledger_transaction):
    """Retried authorization call passes the identical stable idempotency key to authorize_order."""
    test_client = TestClient(app)
    tx = clean_ledger_transaction
    order_id = tx["paypal_order_id"]
    stable_key = tx["idempotency_key"]

    mock_paypal_order = {
        "id": order_id,
        "status": "APPROVED",
        "purchase_units": [{"amount": {"currency_code": "USD", "value": "420.00"}}]
    }
    mock_auth_res = {
        "order_id": order_id,
        "authorization_id": "2W_AUTH_RETRY",
        "status": "CREATED",
        "order_status": "COMPLETED",
        "amount": "420.00",
        "currency": "USD"
    }

    captured_idemp = None

    async def mock_authorize(oid, idempotency_key=None):
        nonlocal captured_idemp
        captured_idemp = idempotency_key
        return mock_auth_res

    with patch.object(main.paypal_client, "get_order", new_callable=AsyncMock, return_value=mock_paypal_order):
        with patch.object(main.paypal_client, "authorize_order", side_effect=mock_authorize):
            res = test_client.post(f"/api/paypal/orders/{order_id}/authorize")
            assert res.status_code == 200
            assert captured_idemp == stable_key


@pytest.mark.asyncio
async def test_endpoint_budget_cap_breached_rejected(clean_ledger_transaction):
    """If mandate budget cap is reduced below purchase amount, authorization is rejected with 403."""
    test_client = TestClient(app)
    tx = clean_ledger_transaction
    order_id = tx["paypal_order_id"]

    mock_paypal_order = {
        "id": order_id,
        "status": "APPROVED",
        "purchase_units": [{"amount": {"currency_code": "USD", "value": "420.00"}}]
    }

    # Temporarily set max_budget below 420.00
    orig_max = ACTIVE_MANDATE["max_budget"]
    ACTIVE_MANDATE["max_budget"] = Decimal("300.00")
    try:
        with patch.object(main.paypal_client, "get_order", new_callable=AsyncMock, return_value=mock_paypal_order):
            with patch.object(main.paypal_client, "authorize_order", new_callable=AsyncMock) as mock_auth:
                res = test_client.post(f"/api/paypal/orders/{order_id}/authorize")
                assert res.status_code == 403
                data = res.json()
                assert data["detail"]["error"] == "BudgetCapBreached"
                mock_auth.assert_not_called()
    finally:
        ACTIVE_MANDATE["max_budget"] = orig_max


@pytest.mark.asyncio
async def test_endpoint_insufficient_pool_rejected(clean_ledger_transaction):
    """If remaining pool balance is lower than purchase amount, authorization is rejected with 403."""
    test_client = TestClient(app)
    tx = clean_ledger_transaction
    order_id = tx["paypal_order_id"]

    mock_paypal_order = {
        "id": order_id,
        "status": "APPROVED",
        "purchase_units": [{"amount": {"currency_code": "USD", "value": "420.00"}}]
    }

    orig_pool = ACTIVE_MANDATE["remaining_pool"]
    ACTIVE_MANDATE["remaining_pool"] = Decimal("100.00")
    try:
        with patch.object(main.paypal_client, "get_order", new_callable=AsyncMock, return_value=mock_paypal_order):
            with patch.object(main.paypal_client, "authorize_order", new_callable=AsyncMock) as mock_auth:
                res = test_client.post(f"/api/paypal/orders/{order_id}/authorize")
                assert res.status_code == 403
                data = res.json()
                assert data["detail"]["error"] == "InsufficientEscrowPool"
                mock_auth.assert_not_called()
    finally:
        ACTIVE_MANDATE["remaining_pool"] = orig_pool


@pytest.mark.asyncio
async def test_endpoint_kill_switch_active_rejected(clean_ledger_transaction):
    """If autonomous kill switch is triggered, authorization is locked with 423 Locked."""
    test_client = TestClient(app)
    tx = clean_ledger_transaction
    order_id = tx["paypal_order_id"]

    mock_paypal_order = {
        "id": order_id,
        "status": "APPROVED",
        "purchase_units": [{"amount": {"currency_code": "USD", "value": "420.00"}}]
    }

    kill_switch.trigger_manual_lockdown("SECURITY TEST LOCKDOWN")
    try:
        with patch.object(main.paypal_client, "get_order", new_callable=AsyncMock, return_value=mock_paypal_order):
            with patch.object(main.paypal_client, "authorize_order", new_callable=AsyncMock) as mock_auth:
                res = test_client.post(f"/api/paypal/orders/{order_id}/authorize")
                assert res.status_code == 423
                data = res.json()
                assert data["detail"]["error"] == "AutonomousKillSwitchActive"
                mock_auth.assert_not_called()
    finally:
        kill_switch.reset_lockdown()


@pytest.mark.asyncio
async def test_endpoint_convenience_alias_tx_id(clean_ledger_transaction):
    """POST /api/transactions/{tx_id}/authorize resolves order_id and authorizes."""
    test_client = TestClient(app)
    tx = clean_ledger_transaction
    order_id = tx["paypal_order_id"]
    auth_id = f"2W_ALIAS_AUTH_{uuid.uuid4().hex[:6].upper()}"

    mock_paypal_order = {
        "id": order_id,
        "status": "APPROVED",
        "purchase_units": [{"amount": {"currency_code": "USD", "value": "420.00"}}]
    }
    mock_auth_res = {
        "order_id": order_id,
        "authorization_id": auth_id,
        "status": "CREATED",
        "order_status": "COMPLETED",
        "amount": "420.00",
        "currency": "USD"
    }

    with patch.object(main.paypal_client, "get_order", new_callable=AsyncMock, return_value=mock_paypal_order):
        with patch.object(main.paypal_client, "authorize_order", new_callable=AsyncMock, return_value=mock_auth_res):
            res = test_client.post(f"/api/transactions/{tx['id']}/authorize")
            assert res.status_code == 200
            assert res.json()["paypal_auth_id"] == auth_id


@pytest.mark.asyncio
async def test_endpoint_return_callback(clean_ledger_transaction):
    """GET /api/paypal/return verifies with PayPal and returns BUYER_APPROVED when confirmed."""
    test_client = TestClient(app)
    tx = clean_ledger_transaction
    order_id = tx["paypal_order_id"]

    mock_paypal_order = {"id": order_id, "status": "APPROVED"}

    with patch.object(main.paypal_client, "get_order", new_callable=AsyncMock, return_value=mock_paypal_order):
        res = test_client.get(
            f"/api/paypal/return?token={order_id}&PayerID=PAYER_9999",
            headers={"Accept": "application/json"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "BUYER_APPROVED"
        assert data["verified_with_paypal"] is True
        assert data["paypal_order_id"] == order_id
        assert data["payer_id"] == "PAYER_9999"


@pytest.mark.asyncio
async def test_endpoint_return_callback_unapproved_rejected(clean_ledger_transaction):
    """GET /api/paypal/return rejects approval claim if PayPal reports order as unapproved."""
    test_client = TestClient(app)
    tx = clean_ledger_transaction
    order_id = tx["paypal_order_id"]

    mock_paypal_order = {"id": order_id, "status": "CREATED"}  # Buyer has NOT approved

    with patch.object(main.paypal_client, "get_order", new_callable=AsyncMock, return_value=mock_paypal_order):
        res = test_client.get(
            f"/api/paypal/return?token={order_id}&PayerID=PAYER_9999",
            headers={"Accept": "application/json"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ORDER_CREATED"
        assert data["verified_with_paypal"] is False
        assert "could not be verified" in data["message"]


@pytest.mark.asyncio
async def test_endpoint_cancel_callback():
    """GET /api/paypal/cancel returns APPROVAL_CANCELLED."""
    test_client = TestClient(app)
    res = test_client.get(
        "/api/paypal/cancel?token=5O_CANCELLED_ORDER",
        headers={"Accept": "application/json"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "APPROVAL_CANCELLED"
    assert data["paypal_order_id"] == "5O_CANCELLED_ORDER"


@pytest.mark.asyncio
async def test_endpoint_timeout_reconciliation_failure(clean_ledger_transaction):
    """
    When authorize_order times out and PayPal order status cannot confirm authorization,
    transaction is left in PENDING_RECONCILIATION and returns 504 Gateway Timeout.
    """
    test_client = TestClient(app)
    tx = clean_ledger_transaction
    order_id = tx["paypal_order_id"]

    mock_paypal_order_approved = {
        "id": order_id,
        "status": "APPROVED",
        "purchase_units": [{"amount": {"currency_code": "USD", "value": "420.00"}}]
    }

    # First call to get_order succeeds (APPROVED).
    # Then authorize_order times out.
    # Recheck get_order still reports APPROVED (not completed).
    with patch.object(main.paypal_client, "get_order", new_callable=AsyncMock, return_value=mock_paypal_order_approved):
        with patch.object(main.paypal_client, "authorize_order", side_effect=PayPalTimeoutError("PayPal timeout")):
            res = test_client.post(f"/api/paypal/orders/{order_id}/authorize")
            assert res.status_code == 504
            data = res.json()
            assert data["detail"]["error"] == "AuthorizationTimeout"
            assert data["detail"]["action"] == "REQUIRES_RECONCILIATION"
            assert tx["payment_status"] == "PENDING_RECONCILIATION"
            assert tx["status"] == "ORDER_CREATED"


@pytest.mark.asyncio
async def test_endpoint_timeout_reconciliation_success(clean_ledger_transaction):
    """
    When authorize_order times out but re-checking PayPal order reveals status is COMPLETED
    with a valid authorization, the transaction reconciles successfully to AUTHORIZED.
    """
    test_client = TestClient(app)
    tx = clean_ledger_transaction
    order_id = tx["paypal_order_id"]
    reconciled_auth_id = f"2W_RECONCILED_{uuid.uuid4().hex[:6].upper()}"

    mock_order_approved = {
        "id": order_id,
        "status": "APPROVED",
        "purchase_units": [{"amount": {"currency_code": "USD", "value": "420.00"}}]
    }

    mock_order_completed = {
        "id": order_id,
        "status": "COMPLETED",
        "purchase_units": [
            {
                "payments": {
                    "authorizations": [
                        {
                            "id": reconciled_auth_id,
                            "status": "CREATED",
                            "amount": {"currency_code": "USD", "value": "420.00"}
                        }
                    ]
                }
            }
        ]
    }

    # Call 1: get_order returns APPROVED.
    # Call 2: authorize_order raises PayPalTimeoutError.
    # Call 3: get_order returns COMPLETED with authorizations (reconciliation succeeds).
    get_order_mock = AsyncMock(side_effect=[mock_order_approved, mock_order_completed])

    with patch.object(main.paypal_client, "get_order", get_order_mock):
        with patch.object(main.paypal_client, "authorize_order", side_effect=PayPalTimeoutError("Timeout")):
            res = test_client.post(f"/api/paypal/orders/{order_id}/authorize")
            assert res.status_code == 200
            data = res.json()
            assert data["status"] == "AUTHORIZED"
            assert data["paypal_auth_id"] == reconciled_auth_id
            assert tx["status"] == "AUTHORIZED"
            assert tx["paypal_auth_id"] == reconciled_auth_id


@pytest.mark.asyncio
async def test_hash_chain_not_updated_on_failed_authorization(clean_ledger_transaction):
    """Failed authorization does not append any block to state_chain or modify state_hash."""
    test_client = TestClient(app)
    tx = clean_ledger_transaction
    order_id = tx["paypal_order_id"]

    initial_chain_len = len(tx["state_chain"])
    initial_hash = tx["state_hash"]

    mock_paypal_order = {
        "id": order_id,
        "status": "CREATED",  # Unapproved
        "purchase_units": [{"amount": {"currency_code": "USD", "value": "420.00"}}]
    }

    with patch.object(main.paypal_client, "get_order", new_callable=AsyncMock, return_value=mock_paypal_order):
        res = test_client.post(f"/api/paypal/orders/{order_id}/authorize")
        assert res.status_code == 400

    # Verify cryptographic state chain is unchanged
    assert len(tx["state_chain"]) == initial_chain_len
    assert tx["state_hash"] == initial_hash


@pytest.mark.asyncio
async def test_hash_chain_not_duplicated_on_retry(clean_ledger_transaction):
    """Idempotent retry of an authorized transaction does not append duplicate blocks."""
    test_client = TestClient(app)
    tx = clean_ledger_transaction
    order_id = tx["paypal_order_id"]
    auth_id = f"2W_IDEMP_AUTH_{uuid.uuid4().hex[:6].upper()}"

    mock_paypal_order = {
        "id": order_id,
        "status": "APPROVED",
        "purchase_units": [{"amount": {"currency_code": "USD", "value": "420.00"}}]
    }
    mock_auth_res = {
        "order_id": order_id,
        "authorization_id": auth_id,
        "status": "CREATED",
        "order_status": "COMPLETED",
        "amount": "420.00",
        "currency": "USD"
    }

    with patch.object(main.paypal_client, "get_order", new_callable=AsyncMock, return_value=mock_paypal_order):
        with patch.object(main.paypal_client, "authorize_order", new_callable=AsyncMock, return_value=mock_auth_res):
            # First authorization
            res1 = test_client.post(f"/api/paypal/orders/{order_id}/authorize")
            assert res1.status_code == 200

    authorized_chain_len = len(tx["state_chain"])
    authorized_hash = tx["state_hash"]

    # Second authorization call (idempotent retry)
    res2 = test_client.post(f"/api/paypal/orders/{order_id}/authorize")
    assert res2.status_code == 200
    assert res2.json()["already_authorized"] is True

    # State chain must not have duplicate blocks
    assert len(tx["state_chain"]) == authorized_chain_len
    assert tx["state_hash"] == authorized_hash


@pytest.mark.asyncio
async def test_endpoint_authorization_pending_status(clean_ledger_transaction):
    """
    When PayPal authorization status is PENDING:
    - Endpoint returns HTTP 200 with status AUTHORIZATION_PENDING.
    - Transaction is recorded as AUTHORIZATION_PENDING (never AUTHORIZED).
    - Genuine authorization ID is preserved.
    - Funds are NOT deducted from the active mandate remaining_pool.
    - Cryptographic hash chain does NOT transition to AUTHORIZED.
    """
    test_client = TestClient(app)
    tx = clean_ledger_transaction
    order_id = tx["paypal_order_id"]
    auth_id = f"2W_PENDING_AUTH_{uuid.uuid4().hex[:6].upper()}"

    initial_pool = ACTIVE_MANDATE["remaining_pool"]
    initial_chain_len = len(tx["state_chain"])
    initial_hash = tx["state_hash"]

    mock_paypal_order = {
        "id": order_id,
        "status": "APPROVED",
        "purchase_units": [{"amount": {"currency_code": "USD", "value": "420.00"}}]
    }
    mock_auth_res = {
        "order_id": order_id,
        "authorization_id": auth_id,
        "status": "PENDING",
        "order_status": "COMPLETED",
        "amount": "420.00",
        "currency": "USD",
        "seller_protection": {"status": "NOT_ELIGIBLE"},
        "expiration_time": "2026-12-08T12:00:00Z"
    }

    with patch.object(main.paypal_client, "get_order", new_callable=AsyncMock, return_value=mock_paypal_order):
        with patch.object(main.paypal_client, "authorize_order", new_callable=AsyncMock, return_value=mock_auth_res):
            res = test_client.post(f"/api/paypal/orders/{order_id}/authorize")
            assert res.status_code == 200
            data = res.json()
            assert data["status"] == "AUTHORIZATION_PENDING"
            assert data["payment_status"] == "AUTHORIZATION_PENDING"
            assert data["paypal_auth_id"] == auth_id
            assert data["authorization_status"] == "PENDING"
            assert "PENDING review" in data["message"]

    # Transaction state verification
    assert tx["status"] == "AUTHORIZATION_PENDING"
    assert tx["payment_status"] == "AUTHORIZATION_PENDING"
    assert tx["paypal_auth_id"] == auth_id
    assert tx["delivery_status"] == "AWAITING_APPROVAL"

    # Financial safety: Escrow pool must NOT be deducted for unconfirmed/pending funds
    assert ACTIVE_MANDATE["remaining_pool"] == initial_pool

    # Hash chain integrity: Must NOT record AUTHORIZED transition
    assert len(tx["state_chain"]) == initial_chain_len
    assert tx["state_hash"] == initial_hash


@pytest.mark.asyncio
async def test_endpoint_repeated_request_while_pending(clean_ledger_transaction):
    """
    When a transaction is in AUTHORIZATION_PENDING status, repeated authorization requests:
    - Return HTTP 200 idempotently with already_pending=True.
    - Do NOT invoke PayPal client authorize_order() again.
    - Do NOT modify the transaction or append duplicate hash-chain blocks.
    """
    test_client = TestClient(app)
    tx = clean_ledger_transaction
    order_id = tx["paypal_order_id"]
    pending_auth_id = f"2W_PENDING_REPEAT_{uuid.uuid4().hex[:6].upper()}"

    # Setup transaction in pending authorization state
    tx["status"] = "AUTHORIZATION_PENDING"
    tx["payment_status"] = "AUTHORIZATION_PENDING"
    tx["paypal_auth_id"] = pending_auth_id
    tx["authorization_metadata"] = {
        "authorization_id": pending_auth_id,
        "status": "PENDING",
        "amount": "420.00",
        "currency": "USD"
    }

    initial_chain_len = len(tx["state_chain"])
    initial_hash = tx["state_hash"]

    mock_auth_call = AsyncMock()
    with patch.object(main.paypal_client, "authorize_order", mock_auth_call):
        res = test_client.post(f"/api/paypal/orders/{order_id}/authorize")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "AUTHORIZATION_PENDING"
        assert data["payment_status"] == "AUTHORIZATION_PENDING"
        assert data["already_pending"] is True
        assert data["live_call"] is False
        assert data["paypal_auth_id"] == pending_auth_id

    # Must NOT call PayPal authorize_order again
    mock_auth_call.assert_not_called()

    # State chain unchanged
    assert len(tx["state_chain"]) == initial_chain_len
    assert tx["state_hash"] == initial_hash


@pytest.mark.asyncio
async def test_endpoint_timeout_reconciliation_pending(clean_ledger_transaction):
    """
    When authorize_order times out and recheck of PayPal order indicates authorization is PENDING:
    - Reconciles to AUTHORIZATION_PENDING (not AUTHORIZED).
    - Preserves authorization ID.
    - Does not mark payment authorized or deduct escrow pool.
    """
    test_client = TestClient(app)
    tx = clean_ledger_transaction
    order_id = tx["paypal_order_id"]
    pending_auth_id = f"2W_TIMEOUT_PENDING_{uuid.uuid4().hex[:6].upper()}"

    initial_pool = ACTIVE_MANDATE["remaining_pool"]

    mock_order_approved = {
        "id": order_id,
        "status": "APPROVED",
        "purchase_units": [{"amount": {"currency_code": "USD", "value": "420.00"}}]
    }

    mock_order_recheck_pending = {
        "id": order_id,
        "status": "COMPLETED",
        "purchase_units": [
            {
                "payments": {
                    "authorizations": [
                        {
                            "id": pending_auth_id,
                            "status": "PENDING",
                            "amount": {"currency_code": "USD", "value": "420.00"},
                            "seller_protection": {"status": "NOT_ELIGIBLE"}
                        }
                    ]
                }
            }
        ]
    }

    get_order_mock = AsyncMock(side_effect=[mock_order_approved, mock_order_recheck_pending])

    with patch.object(main.paypal_client, "get_order", get_order_mock):
        with patch.object(main.paypal_client, "authorize_order", side_effect=PayPalTimeoutError("Timeout")):
            res = test_client.post(f"/api/paypal/orders/{order_id}/authorize")
            assert res.status_code == 200
            data = res.json()
            assert data["status"] == "AUTHORIZATION_PENDING"
            assert data["payment_status"] == "AUTHORIZATION_PENDING"
            assert data["paypal_auth_id"] == pending_auth_id
            assert data["authorization_status"] == "PENDING"

    assert tx["status"] == "AUTHORIZATION_PENDING"
    assert tx["paypal_auth_id"] == pending_auth_id
    assert ACTIVE_MANDATE["remaining_pool"] == initial_pool


@pytest.mark.asyncio
async def test_endpoint_order_completed_without_authorization_object(clean_ledger_transaction):
    """
    When PayPal order status is COMPLETED but contains no authorization record in purchase_units[0].payments.authorizations:
    - Must NOT infer authorization or mark transaction AUTHORIZED.
    - Must reject with HTTP 502 Bad Gateway (MissingAuthorizationRecord).
    - Sets payment_status to PENDING_RECONCILIATION.
    """
    test_client = TestClient(app)
    tx = clean_ledger_transaction
    order_id = tx["paypal_order_id"]

    mock_paypal_order_completed_no_auth = {
        "id": order_id,
        "status": "COMPLETED",
        "purchase_units": [
            {
                "amount": {"currency_code": "USD", "value": "420.00"},
                "payments": {
                    # No authorizations list
                }
            }
        ]
    }

    with patch.object(main.paypal_client, "get_order", new_callable=AsyncMock, return_value=mock_paypal_order_completed_no_auth):
        res = test_client.post(f"/api/paypal/orders/{order_id}/authorize")
        assert res.status_code == 502
        data = res.json()
        assert data["detail"]["error"] == "MissingAuthorizationRecord"
        assert "without a confirmed authorization object" in data["detail"]["message"]

    assert tx["status"] != "AUTHORIZED"
    assert tx["payment_status"] == "PENDING_RECONCILIATION"


@pytest.mark.asyncio
async def test_endpoint_missing_authorization_status_returns_502(clean_ledger_transaction):
    """
    When PayPal returns an authorization object missing a valid 'status' field:
    - Endpoint returns HTTP 502 Bad Gateway.
    - Transaction is flagged PENDING_RECONCILIATION.
    - Never treated as success.
    """
    test_client = TestClient(app)
    tx = clean_ledger_transaction
    order_id = tx["paypal_order_id"]

    mock_paypal_order = {
        "id": order_id,
        "status": "APPROVED",
        "purchase_units": [{"amount": {"currency_code": "USD", "value": "420.00"}}]
    }
    # authorize_order returns dict with missing status
    mock_auth_res = {
        "order_id": order_id,
        "authorization_id": "2W_MISSING_STATUS_ID",
        "status": "",  # Empty/missing status
        "amount": "420.00",
        "currency": "USD"
    }

    with patch.object(main.paypal_client, "get_order", new_callable=AsyncMock, return_value=mock_paypal_order):
        with patch.object(main.paypal_client, "authorize_order", new_callable=AsyncMock, return_value=mock_auth_res):
            res = test_client.post(f"/api/paypal/orders/{order_id}/authorize")
            assert res.status_code == 502
            data = res.json()
            assert data["detail"]["error"] == "MissingAuthorizationStatus"

    assert tx["status"] != "AUTHORIZED"
    assert tx["payment_status"] == "PENDING_RECONCILIATION"


@pytest.mark.asyncio
async def test_endpoint_denied_or_voided_authorization_rejected(clean_ledger_transaction):
    """
    When PayPal authorization is DENIED or VOIDED:
    - Endpoint rejects with HTTP 400 Bad Request.
    - Transaction is never marked AUTHORIZED.
    - Escrow pool is NOT deducted.
    """
    test_client = TestClient(app)
    tx = clean_ledger_transaction
    order_id = tx["paypal_order_id"]

    initial_pool = ACTIVE_MANDATE["remaining_pool"]

    mock_paypal_order = {
        "id": order_id,
        "status": "APPROVED",
        "purchase_units": [{"amount": {"currency_code": "USD", "value": "420.00"}}]
    }

    with patch.object(main.paypal_client, "get_order", new_callable=AsyncMock, return_value=mock_paypal_order):
        with patch.object(
            main.paypal_client,
            "authorize_order",
            side_effect=PayPalAPIError("PayPal authorization was rejected by payment processor with status 'DENIED'.", status_code=400)
        ):
            res = test_client.post(f"/api/paypal/orders/{order_id}/authorize")
            assert res.status_code == 400
            data = res.json()
            assert "rejected by payment processor" in data["detail"]["message"]

    assert tx["status"] != "AUTHORIZED"
    assert ACTIVE_MANDATE["remaining_pool"] == initial_pool


# ===========================================================================
# 3. Stage 4 Authorization Reconciliation Tests
# ===========================================================================

@pytest.mark.asyncio
async def test_reconciliation_pending_later_reconciled_to_created(clean_ledger_transaction):
    """
    A transaction in AUTHORIZATION_PENDING when later checked via reconciliation
    and found to be CREATED on PayPal:
    - Safely transitions to AUTHORIZED.
    - Appends exactly one hash-chain transition.
    - Deducts/reserves the mandate pool exactly once.
    - Updates delivery_status to AWAITING_DELIVERY.
    """
    test_client = TestClient(app)
    tx = clean_ledger_transaction
    order_id = tx["paypal_order_id"]
    reconciled_auth_id = f"2W_RECON_CREATED_{uuid.uuid4().hex[:6].upper()}"

    # Setup pending state
    tx["status"] = "AUTHORIZATION_PENDING"
    tx["payment_status"] = "AUTHORIZATION_PENDING"
    tx["paypal_auth_id"] = "2W_PREV_PENDING_AUTH"

    initial_pool = ACTIVE_MANDATE["remaining_pool"]
    initial_chain_len = len(tx["state_chain"])

    mock_paypal_order = {
        "id": order_id,
        "status": "COMPLETED",
        "purchase_units": [
            {
                "payments": {
                    "authorizations": [
                        {
                            "id": reconciled_auth_id,
                            "status": "CREATED",
                            "amount": {"currency_code": "USD", "value": "420.00"},
                            "seller_protection": {"status": "ELIGIBLE"}
                        }
                    ]
                }
            }
        ]
    }

    with patch.object(main.paypal_client, "get_order", new_callable=AsyncMock, return_value=mock_paypal_order):
        res = test_client.post(f"/api/paypal/orders/{order_id}/reconcile")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "AUTHORIZED"
        assert data["authorization_status"] == "CREATED"
        assert data["reconciled"] is True
        assert data["paypal_auth_id"] == reconciled_auth_id

    # Ledger state
    assert tx["status"] == "AUTHORIZED"
    assert tx["payment_status"] == "PAYMENT_AUTHORIZED"
    assert tx["paypal_auth_id"] == reconciled_auth_id
    assert tx["delivery_status"] == "AWAITING_DELIVERY"

    # Pool deducted exactly once
    assert ACTIVE_MANDATE["remaining_pool"] == initial_pool - Decimal("420.00")

    # Hash chain appended exactly once
    assert len(tx["state_chain"]) == initial_chain_len + 1


@pytest.mark.asyncio
async def test_reconciliation_while_still_pending(clean_ledger_transaction):
    """
    When reconciliation checks PayPal and the authorization remains PENDING:
    - Retains AUTHORIZATION_PENDING state.
    - Does NOT claim success or mark AUTHORIZED.
    - Does NOT deduct mandate pool.
    - Does NOT append to hash chain.
    """
    test_client = TestClient(app)
    tx = clean_ledger_transaction
    order_id = tx["paypal_order_id"]
    pending_auth_id = f"2W_STILL_PENDING_{uuid.uuid4().hex[:6].upper()}"

    tx["status"] = "AUTHORIZATION_PENDING"
    tx["payment_status"] = "AUTHORIZATION_PENDING"
    tx["paypal_auth_id"] = pending_auth_id

    initial_pool = ACTIVE_MANDATE["remaining_pool"]
    initial_chain_len = len(tx["state_chain"])
    initial_hash = tx["state_hash"]

    mock_paypal_order = {
        "id": order_id,
        "status": "COMPLETED",
        "purchase_units": [
            {
                "payments": {
                    "authorizations": [
                        {
                            "id": pending_auth_id,
                            "status": "PENDING",
                            "amount": {"currency_code": "USD", "value": "420.00"}
                        }
                    ]
                }
            }
        ]
    }

    with patch.object(main.paypal_client, "get_order", new_callable=AsyncMock, return_value=mock_paypal_order):
        res = test_client.post(f"/api/paypal/orders/{order_id}/reconcile")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "AUTHORIZATION_PENDING"
        assert data["authorization_status"] == "PENDING"
        assert data["reconciled"] is False

    assert tx["status"] == "AUTHORIZATION_PENDING"
    assert ACTIVE_MANDATE["remaining_pool"] == initial_pool
    assert len(tx["state_chain"]) == initial_chain_len
    assert tx["state_hash"] == initial_hash


@pytest.mark.asyncio
async def test_reconciliation_with_missing_authorization_record(clean_ledger_transaction):
    """
    When reconciliation retrieves an order with no authorization records:
    - Rejects with HTTP 502 Bad Gateway (MissingAuthorizationRecord).
    - Sets payment_status to PENDING_RECONCILIATION.
    - Does NOT mark AUTHORIZED.
    - Does NOT deduct pool.
    """
    test_client = TestClient(app)
    tx = clean_ledger_transaction
    order_id = tx["paypal_order_id"]

    initial_pool = ACTIVE_MANDATE["remaining_pool"]

    mock_paypal_order = {
        "id": order_id,
        "status": "COMPLETED",
        "purchase_units": [{"payments": {}}]  # Missing authorizations
    }

    with patch.object(main.paypal_client, "get_order", new_callable=AsyncMock, return_value=mock_paypal_order):
        res = test_client.post(f"/api/paypal/orders/{order_id}/reconcile")
        assert res.status_code == 502
        data = res.json()
        assert data["detail"]["error"] == "MissingAuthorizationRecord"

    assert tx["status"] != "AUTHORIZED"
    assert tx["payment_status"] == "PENDING_RECONCILIATION"
    assert ACTIVE_MANDATE["remaining_pool"] == initial_pool


@pytest.mark.asyncio
async def test_reconciliation_does_not_call_authorization_endpoint(clean_ledger_transaction):
    """
    Reconciliation retrieves latest order status via get_order() and NEVER calls authorize_order().
    """
    test_client = TestClient(app)
    tx = clean_ledger_transaction
    order_id = tx["paypal_order_id"]

    mock_paypal_order = {
        "id": order_id,
        "status": "COMPLETED",
        "purchase_units": [
            {
                "payments": {
                    "authorizations": [
                        {
                            "id": "2W_NO_CALL_AUTH",
                            "status": "CREATED",
                            "amount": {"currency_code": "USD", "value": "420.00"}
                        }
                    ]
                }
            }
        ]
    }

    mock_auth_call = AsyncMock()
    with patch.object(main.paypal_client, "get_order", new_callable=AsyncMock, return_value=mock_paypal_order):
        with patch.object(main.paypal_client, "authorize_order", mock_auth_call):
            res = test_client.post(f"/api/paypal/orders/{order_id}/reconcile")
            assert res.status_code == 200

    # Critical: authorize_order must NOT have been called
    mock_auth_call.assert_not_called()


@pytest.mark.asyncio
async def test_repeated_reconciliation_does_not_duplicate_either_operation(clean_ledger_transaction):
    """
    Calling reconciliation repeatedly on an already-reconciled/authorized transaction:
    - Returns HTTP 200 with already_authorized=True.
    - Does NOT append duplicate hash-chain blocks.
    - Does NOT deduct the mandate pool again.
    """
    test_client = TestClient(app)
    tx = clean_ledger_transaction
    order_id = tx["paypal_order_id"]
    auth_id = f"2W_REPEAT_RECON_{uuid.uuid4().hex[:6].upper()}"

    mock_paypal_order = {
        "id": order_id,
        "status": "COMPLETED",
        "purchase_units": [
            {
                "payments": {
                    "authorizations": [
                        {
                            "id": auth_id,
                            "status": "CREATED",
                            "amount": {"currency_code": "USD", "value": "420.00"}
                        }
                    ]
                }
            }
        ]
    }

    with patch.object(main.paypal_client, "get_order", new_callable=AsyncMock, return_value=mock_paypal_order):
        # First reconciliation: transitions to AUTHORIZED
        res1 = test_client.post(f"/api/paypal/orders/{order_id}/reconcile")
        assert res1.status_code == 200

    pool_after_first = ACTIVE_MANDATE["remaining_pool"]
    chain_len_after_first = len(tx["state_chain"])
    hash_after_first = tx["state_hash"]

    # Second reconciliation: idempotent no-op
    res2 = test_client.post(f"/api/paypal/orders/{order_id}/reconcile")
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["already_authorized"] is True
    assert data2["reconciled"] is True

    # Assert zero duplicate pool deduction and zero duplicate hash-chain block
    assert ACTIVE_MANDATE["remaining_pool"] == pool_after_first
    assert len(tx["state_chain"]) == chain_len_after_first
    assert tx["state_hash"] == hash_after_first


@pytest.mark.asyncio
async def test_reconciliation_unknown_order_cannot_create_transaction_or_chain():
    """
    Stage 4 Architectural Safety:
    Reconciliation with an unknown PayPal order ID MUST NOT manufacture an internal transaction,
    MUST NOT generate a fresh SHA-256 state chain, and MUST NOT deduct from the mandate pool.
    It returns HTTP 404 TransactionNotFound with clear guidance that persistence is deferred to Stage 6.
    """
    test_client = TestClient(app)
    unknown_order_id = f"5O_UNKNOWN_{uuid.uuid4().hex[:6].upper()}"

    initial_ledger_count = len(TRANSACTIONS_LEDGER)
    initial_pool = ACTIVE_MANDATE["remaining_pool"]

    mock_paypal_order = {
        "id": unknown_order_id,
        "status": "COMPLETED",
        "purchase_units": [
            {
                "description": "Manufactured External Item",
                "amount": {"currency_code": "USD", "value": "500.00"},
                "payments": {
                    "authorizations": [
                        {
                            "id": "2W_MANUFACTURED_AUTH",
                            "status": "CREATED",
                            "amount": {"currency_code": "USD", "value": "500.00"}
                        }
                    ]
                }
            }
        ]
    }

    # Even if PayPal reports a valid order on the external gateway:
    with patch.object(main.paypal_client, "get_order", new_callable=AsyncMock, return_value=mock_paypal_order):
        res = test_client.post(f"/api/paypal/orders/{unknown_order_id}/reconcile")
        assert res.status_code == 404
        data = res.json()
        assert data["detail"]["error"] == "TransactionNotFound"
        assert "cannot be recovered" in data["detail"]["message"] or "Stage 6" in data["detail"]["message"]

    # Zero side-effects:
    # 1. No new transaction inserted into ledger
    assert len(TRANSACTIONS_LEDGER) == initial_ledger_count
    assert not any(t.get("paypal_order_id") == unknown_order_id for t in TRANSACTIONS_LEDGER)
    # 2. No pool deduction
    assert ACTIVE_MANDATE["remaining_pool"] == initial_pool



