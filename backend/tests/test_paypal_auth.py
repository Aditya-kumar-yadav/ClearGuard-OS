import pytest
import asyncio
import time
import base64
import json
import httpx
from unittest.mock import patch

from core.paypal_client import (
    PayPalOrdersClient,
    PayPalError,
    PayPalConfigurationError,
    PayPalAuthError,
    PayPalNetworkError,
    PayPalTimeoutError,
    PayPalAPIError,
)

TEST_CLIENT_ID = "SANDBOX_CLIENT_ID_987654321"
TEST_CLIENT_SECRET = "SANDBOX_SECRET_KEY_123456789"
TEST_BASE_URL = "https://api-m.sandbox.paypal.com"


@pytest.fixture
def mock_client():
    """Provides a PayPalOrdersClient configured with test sandbox credentials."""
    return PayPalOrdersClient(
        client_id=TEST_CLIENT_ID,
        client_secret=TEST_CLIENT_SECRET,
        base_url=TEST_BASE_URL,
    )


# ---------------------------------------------------------------------------
# TEST 1: Successful OAuth Authentication
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_successful_oauth_authentication(mock_client):
    request_captured = None

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal request_captured
        request_captured = request
        return httpx.Response(
            200,
            json={
                "scope": "https://uri.paypal.com/services/payments",
                "access_token": "TEST_VALID_SANDBOX_TOKEN_A21AA",
                "token_type": "Bearer",
                "app_id": "APP-80W284485P519543T",
                "expires_in": 32400,
                "nonce": "test-nonce-123",
            },
        )

    transport = httpx.MockTransport(handler)
    mock_client._async_client = httpx.AsyncClient(transport=transport)

    token = await mock_client.get_access_token()
    assert token == "TEST_VALID_SANDBOX_TOKEN_A21AA"
    assert mock_client._cached_token == "TEST_VALID_SANDBOX_TOKEN_A21AA"
    assert mock_client._token_expires_at > time.time()


# ---------------------------------------------------------------------------
# TEST 2: Correct Basic Authentication and Grant Type
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_basic_auth_and_grant_type(mock_client):
    captured_request = None

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal captured_request
        captured_request = request
        return httpx.Response(
            200,
            json={
                "access_token": "TOKEN_ABC_XYZ",
                "token_type": "Bearer",
                "expires_in": 3600,
            },
        )

    transport = httpx.MockTransport(handler)
    mock_client._async_client = httpx.AsyncClient(transport=transport)

    await mock_client.get_access_token()

    assert captured_request is not None
    assert str(captured_request.url) == f"{TEST_BASE_URL}/v1/oauth2/token"
    assert captured_request.method == "POST"

    # Verify HTTP Basic Auth header
    auth_header = captured_request.headers.get("Authorization")
    assert auth_header is not None
    assert auth_header.startswith("Basic ")
    encoded_creds = auth_header.split(" ")[1]
    decoded_creds = base64.b64decode(encoded_creds).decode("utf-8")
    assert decoded_creds == f"{TEST_CLIENT_ID}:{TEST_CLIENT_SECRET}"

    # Verify form data contains grant_type=client_credentials
    body = captured_request.read().decode("utf-8")
    assert "grant_type=client_credentials" in body


# ---------------------------------------------------------------------------
# TEST 3: Token Caching - Repeated Requests Reuse Valid Token
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_token_caching_reuses_token(mock_client):
    call_count = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal call_count
        call_count += 1
        return httpx.Response(
            200,
            json={
                "access_token": "CACHED_TOKEN_001",
                "token_type": "Bearer",
                "expires_in": 3600,
            },
        )

    transport = httpx.MockTransport(handler)
    mock_client._async_client = httpx.AsyncClient(transport=transport)

    # First call: triggers HTTP request
    token1 = await mock_client.get_access_token()
    assert token1 == "CACHED_TOKEN_001"
    assert call_count == 1

    # Second call: returns cached token, zero extra HTTP calls
    token2 = await mock_client.get_access_token()
    assert token2 == "CACHED_TOKEN_001"
    assert call_count == 1


# ---------------------------------------------------------------------------
# TEST 4: Token Expiration - Expired Token Triggers Refresh
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_token_expiration_refreshes_token(mock_client):
    call_count = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal call_count
        call_count += 1
        return httpx.Response(
            200,
            json={
                "access_token": f"TOKEN_VERSION_{call_count}",
                "token_type": "Bearer",
                "expires_in": 3600,
            },
        )

    transport = httpx.MockTransport(handler)
    mock_client._async_client = httpx.AsyncClient(transport=transport)

    token1 = await mock_client.get_access_token()
    assert token1 == "TOKEN_VERSION_1"
    assert call_count == 1

    # Force expiration by backdating the expiry timestamp
    mock_client._token_expires_at = time.time() - 10.0

    # Next call must detect expired token and refresh
    token2 = await mock_client.get_access_token()
    assert token2 == "TOKEN_VERSION_2"
    assert call_count == 2


# ---------------------------------------------------------------------------
# TEST 5: Concurrent Requests - Token Generation is Synchronized
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_concurrent_requests_synchronized(mock_client):
    call_count = 0

    async def async_handler(request: httpx.Request) -> httpx.Response:
        nonlocal call_count
        call_count += 1
        # Add slight artificial delay to test concurrency race conditions
        await asyncio.sleep(0.05)
        return httpx.Response(
            200,
            json={
                "access_token": "SYNCHRONIZED_CONCURRENT_TOKEN",
                "token_type": "Bearer",
                "expires_in": 3600,
            },
        )

    transport = httpx.MockTransport(async_handler)
    mock_client._async_client = httpx.AsyncClient(transport=transport)

    # Launch 10 concurrent requests at the exact same moment
    results = await asyncio.gather(
        *(mock_client.get_access_token() for _ in range(10))
    )

    # All 10 tasks must receive the exact same token
    assert all(r == "SYNCHRONIZED_CONCURRENT_TOKEN" for r in results)
    # The async lock must ensure exactly 1 HTTP call occurred
    assert call_count == 1


# ---------------------------------------------------------------------------
# TEST 6: Missing Credentials Produce Explicit Configuration Error
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_missing_credentials_produces_error():
    empty_client = PayPalOrdersClient(client_id="", client_secret="")
    with pytest.raises(PayPalConfigurationError) as exc_info:
        await empty_client.get_access_token()
    assert "Missing" in str(exc_info.value) or "credentials" in str(exc_info.value).lower()

    placeholder_client = PayPalOrdersClient(
        client_id="your_paypal_sandbox_client_id",
        client_secret="your_paypal_sandbox_client_secret"
    )
    with pytest.raises(PayPalConfigurationError):
        await placeholder_client.get_access_token()


# ---------------------------------------------------------------------------
# TEST 7: Invalid Credentials Produce Authentication Error (HTTP 401)
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_invalid_credentials_produces_auth_error(mock_client):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            401,
            json={
                "error": "invalid_client",
                "error_description": "Client Authentication failed"
            },
        )

    transport = httpx.MockTransport(handler)
    mock_client._async_client = httpx.AsyncClient(transport=transport)

    with pytest.raises(PayPalAuthError) as exc_info:
        await mock_client.get_access_token()

    assert exc_info.value.status_code == 401
    assert "401" in str(exc_info.value)


# ---------------------------------------------------------------------------
# TEST 8: Network Failure is Handled Correctly
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_network_failure_handled(mock_client):
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.NetworkError("Connection refused by peer (DNS failure)")

    transport = httpx.MockTransport(handler)
    mock_client._async_client = httpx.AsyncClient(transport=transport)

    with pytest.raises(PayPalNetworkError) as exc_info:
        await mock_client.get_access_token()

    assert "Network error" in str(exc_info.value) or "Connection refused" in str(exc_info.value)


# ---------------------------------------------------------------------------
# TEST 9: Request Timeout is Handled Correctly
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_timeout_handled(mock_client):
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.TimeoutException("Read timeout after 5.0s")

    transport = httpx.MockTransport(handler)
    mock_client._async_client = httpx.AsyncClient(transport=transport)

    with pytest.raises(PayPalTimeoutError) as exc_info:
        await mock_client.get_access_token()

    assert "timed out" in str(exc_info.value).lower()


# ---------------------------------------------------------------------------
# TEST 10: Invalid/Unexpected OAuth Responses are Rejected
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_invalid_oauth_response_rejected(mock_client):
    # Malformed response missing access_token
    def missing_token_handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"scope": "read", "token_type": "Bearer"})

    transport = httpx.MockTransport(missing_token_handler)
    mock_client._async_client = httpx.AsyncClient(transport=transport)

    with pytest.raises(PayPalAuthError) as exc_info:
        await mock_client.get_access_token()
    assert "missing" in str(exc_info.value).lower()

    # Malformed non-JSON response
    def non_json_handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text="<html><body>502 Bad Gateway</body></html>")

    mock_client._async_client = httpx.AsyncClient(transport=httpx.MockTransport(non_json_handler))
    with pytest.raises(PayPalAuthError) as exc_info2:
        await mock_client.get_access_token()
    assert "Invalid JSON" in str(exc_info2.value)


# ---------------------------------------------------------------------------
# BONUS TESTS: Rate Limiting (429) & Server Error (500)
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_rate_limiting_429(mock_client):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(429, json={"error": "rate_limit_exceeded"})

    transport = httpx.MockTransport(handler)
    mock_client._async_client = httpx.AsyncClient(transport=transport)

    with pytest.raises(PayPalAPIError) as exc_info:
        await mock_client.get_access_token()
    assert exc_info.value.status_code == 429


@pytest.mark.asyncio
async def test_server_error_500(mock_client):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, json={"error": "internal_server_error"})

    transport = httpx.MockTransport(handler)
    mock_client._async_client = httpx.AsyncClient(transport=transport)

    with pytest.raises(PayPalAPIError) as exc_info:
        await mock_client.get_access_token()
    assert exc_info.value.status_code == 500


# ---------------------------------------------------------------------------
# STAGE 2 BUG FIX TESTS: Authentication Failure Prevents Downstream Requests
# ---------------------------------------------------------------------------
def test_auth_failure_prevents_order_creation_request(mock_client):
    """
    Ensures that if authentication fails (e.g. 401 Unauthorized),
    create_authorized_order does NOT swallow the error, does NOT fall back
    to an invalid token, and zero order creation HTTP requests are sent.
    """
    with patch.object(mock_client, "get_access_token_sync", side_effect=PayPalAuthError("Invalid credentials", status_code=401)):
        with patch("httpx.Client.post") as mock_http_post:
            with pytest.raises(PayPalAuthError) as exc_info:
                mock_client.create_authorized_order(
                    item_name="Dell Business Laptop",
                    amount="50000.00",
                    currency="INR"
                )
            assert exc_info.value.status_code == 401
            # Verify that POST /v2/checkout/orders was NEVER invoked
            mock_http_post.assert_not_called()


def test_auth_failure_prevents_capture_request(mock_client):
    """
    Ensures that if authentication fails (e.g. 401 Unauthorized),
    capture_authorization does NOT swallow the error, does NOT fall back
    to an invalid token, and zero capture HTTP requests are sent.
    """
    with patch.object(mock_client, "get_access_token_sync", side_effect=PayPalAuthError("Invalid credentials", status_code=401)):
        with patch("httpx.Client.post") as mock_http_post:
            with pytest.raises(PayPalAuthError) as exc_info:
                mock_client.capture_authorization(
                    authorization_id="AUTH_9988776655",
                    amount="50000.00",
                    currency="INR"
                )
            assert exc_info.value.status_code == 401
            # Verify that POST /v2/payments/authorizations/.../capture was NEVER invoked
            mock_http_post.assert_not_called()


def test_unconfigured_credentials_prevent_order_and_capture():
    """
    Ensures that if credentials are not configured or contain placeholder values,
    order creation and capture immediately raise PayPalConfigurationError without
    initiating any HTTP traffic.
    """
    unconfigured_client = PayPalOrdersClient(client_id="", client_secret="")
    with patch("httpx.Client.post") as mock_http_post:
        with pytest.raises(PayPalConfigurationError):
            unconfigured_client.create_authorized_order(
                item_name="Test Item",
                amount="100.00"
            )
        mock_http_post.assert_not_called()

        with pytest.raises(PayPalConfigurationError):
            unconfigured_client.capture_authorization(
                authorization_id="AUTH_123",
                amount="100.00"
            )
        mock_http_post.assert_not_called()


