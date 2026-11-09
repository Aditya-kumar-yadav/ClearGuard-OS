import os
import uuid
import zlib
import base64
import hmac
import hashlib
import json
import logging
import httpx
from datetime import datetime
from typing import Dict, Any, Optional, Tuple, Set
from urllib.parse import urlsplit
from fastapi import APIRouter, Request, HTTPException, status, Header, Depends
from sqlalchemy.orm import Session

from core.database import get_db, TransactionModel
from core.crypto_ledger import record_state_transition
from core.paypal_client import PayPalOrdersClient
from core.concurrency import LEDGER_LOCK
from core.auth import (
    is_production_environment,
    is_development_or_test_environment,
    get_validated_environment,
)

logger = logging.getLogger("clearguard.webhooks")
router = APIRouter(tags=["PayPal Webhooks"])
paypal_client = PayPalOrdersClient()

PAYPAL_API_BASE = os.getenv("PAYPAL_API_BASE", "https://api-m.sandbox.paypal.com")
PAYPAL_CLIENT_ID = os.getenv("PAYPAL_CLIENT_ID", "")
PAYPAL_CLIENT_SECRET = os.getenv("PAYPAL_CLIENT_SECRET", "")
PAYPAL_WEBHOOK_ID = os.getenv("PAYPAL_WEBHOOK_ID", "WH-SIMULATED-AURORAPAY-001")

SANCTIONED_PAYPAL_DOMAINS = {
    "api.paypal.com",
    "api-m.paypal.com",
    "api.sandbox.paypal.com",
    "api-m.sandbox.paypal.com",
}

SIMULATION_SECRET_KEY = b"CLEARGUARD_SECURE_PAYPAL_WEBHOOK_SIGNING_SALT_v1"

# SEC-04: In-memory store for webhook replay deduplication
PROCESSED_WEBHOOK_TRANSMISSIONS: Set[str] = set()

ALLOWED_WEBHOOK_EVENTS = {
    "DELIVERY_CONFIRMED",
    "REPORT_DISPUTE",
    "DELIVERY_DAMAGED",
    "LOST_PACKAGE"
}


def is_simulation_allowed() -> bool:
    """
    Returns True only when webhook simulation is explicitly enabled
    in a validated non-production development/test setting.
    STRICTLY FALSE in production or unconfigured/unknown environments (SEC-09).
    """
    try:
        if not is_development_or_test_environment():
            return False
    except Exception:
        return False
    allow_sim = os.getenv("ALLOW_WEBHOOK_SIMULATION", "true").strip().lower()
    return allow_sim in ("true", "1", "yes")


def generate_simulated_webhook_signature(
    transmission_id: str,
    timestamp: str,
    raw_body: str
) -> str:
    """
    Generates a cryptographically valid simulation signature for local/demo test mode.
    Prohibited in production.
    """
    crc = zlib.crc32(raw_body.encode("utf-8"))
    payload = f"{transmission_id}|{timestamp}|{PAYPAL_WEBHOOK_ID}|{crc}"
    sig = hmac.new(SIMULATION_SECRET_KEY, payload.encode("utf-8"), hashlib.sha256).digest()
    return base64.b64encode(sig).decode("utf-8")


def verify_paypal_webhook_signature(
    headers: Dict[str, str],
    raw_body: str
) -> Tuple[bool, str]:
    """
    Strict PayPal Webhook Signature Verifier (Hardened for Stage 5B per SEC-01 & SEC-08):
    1. Validates presence of PAYPAL-AUTH-ALGO, PAYPAL-CERT-URL, PAYPAL-TRANSMISSION-ID, PAYPAL-TRANSMISSION-SIG, PAYPAL-TRANSMISSION-TIME.
    2. Validates PAYPAL-CERT-URL safely using urlsplit (scheme HTTPS, port None/443, no userinfo, hostname in SANCTIONED_PAYPAL_DOMAINS).
    3. Production lockdown: rejects simulation signatures and rejects default/simulated webhook IDs.
    4. Attempts official PayPal /v1/notifications/verify-webhook-signature API.
    5. In production, verification failures fail closed (never falls back to simulation).
    6. In explicit non-production test mode, evaluates cryptographic HMAC simulation signature or test signature.
    """
    auth_algo = headers.get("paypal-auth-algo")
    cert_url = headers.get("paypal-cert-url")
    transmission_id = headers.get("paypal-transmission-id")
    transmission_sig = headers.get("paypal-transmission-sig")
    transmission_time = headers.get("paypal-transmission-time")

    # 1. Strict Header Presence Check
    if not all([auth_algo, cert_url, transmission_id, transmission_sig, transmission_time]):
        logger.warning("[WebhookGate] REJECTED: Missing required PayPal transmission headers.")
        return False, "MISSING_PAYPAL_SIGNATURE_HEADERS: Required headers (PAYPAL-AUTH-ALGO, PAYPAL-CERT-URL, PAYPAL-TRANSMISSION-ID, PAYPAL-TRANSMISSION-SIG, PAYPAL-TRANSMISSION-TIME) not found."

    # 2. Strict Cert URL Parsing Check (SEC-01 Safe Hostname Parsing)
    try:
        parsed_url = urlsplit(cert_url)
        if parsed_url.scheme.lower() != "https":
            return False, "INVALID_CERT_URL: Certificate URL must utilize HTTPS."
        if "@" in parsed_url.netloc:
            return False, "MALFORMED_CERT_URL: Certificate URL cannot contain userinfo credentials."
        if parsed_url.port not in (None, 443):
            return False, f"INVALID_CERT_PORT: Certificate URL port '{parsed_url.port}' is non-standard."
        hostname = (parsed_url.hostname or "").lower().strip()
        if not hostname or hostname not in SANCTIONED_PAYPAL_DOMAINS:
            return False, f"UNTRUSTED_CERT_DOMAIN: Host '{hostname}' is not a sanctioned PayPal domain."
    except Exception as e:
        return False, f"MALFORMED_CERT_URL: {str(e)}"

    try:
        env = get_validated_environment()
        in_production = (env == "production")
    except Exception as e:
        logger.error(f"[WebhookGate] Environment configuration error: {e}")
        return False, f"ENVIRONMENT_CONFIG_ERROR: {str(e)}"

    # SEC-08: In production, check webhook ID configuration
    effective_webhook_id = os.getenv("PAYPAL_WEBHOOK_ID", PAYPAL_WEBHOOK_ID)
    if in_production:
        if not effective_webhook_id or "SIMULATED" in effective_webhook_id.upper() or effective_webhook_id == "WH-SIMULATED-AURORAPAY-001":
            return False, "INVALID_PRODUCTION_CONFIG: Valid live PayPal webhook ID required in production; simulated default prohibited."

    # 3. Live PayPal Verification API Check (If client credentials available)
    client_id = os.getenv("PAYPAL_CLIENT_ID", PAYPAL_CLIENT_ID)
    client_secret = os.getenv("PAYPAL_CLIENT_SECRET", PAYPAL_CLIENT_SECRET)
    api_base = os.getenv("PAYPAL_API_BASE", PAYPAL_API_BASE)

    if client_id and "YOUR_" not in client_id.upper():
        try:
            with httpx.Client(timeout=httpx.Timeout(4.0)) as client:
                token_res = client.post(
                    f"{api_base}/v1/oauth2/token",
                    data={"grant_type": "client_credentials"},
                    auth=(client_id, client_secret)
                )
                if token_res.status_code == 200:
                    token = token_res.json().get("access_token")
                    verify_payload = {
                        "transmission_id": transmission_id,
                        "transmission_time": transmission_time,
                        "cert_url": cert_url,
                        "auth_algo": auth_algo,
                        "transmission_sig": transmission_sig,
                        "webhook_id": effective_webhook_id,
                        "webhook_event": json.loads(raw_body) if raw_body else {}
                    }
                    verify_res = client.post(
                        f"{api_base}/v1/notifications/verify-webhook-signature",
                        json=verify_payload,
                        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
                    )
                    if verify_res.status_code == 200:
                        ver_status = verify_res.json().get("verification_status")
                        if ver_status == "SUCCESS":
                            return True, "VERIFIED_VIA_PAYPAL_API"
                        elif ver_status == "FAILURE":
                            return False, "PAYPAL_API_VERIFICATION_FAILURE: Signature verification failed at PayPal."
        except Exception as e:
            logger.warning(f"[WebhookGate] Live PayPal verification lookup error: {e}.")
            if in_production:
                # SEC-01 & SEC-08: In production, FAIL CLOSED without simulation fallback!
                return False, f"PAYPAL_API_VERIFICATION_UNAVAILABLE: Live verification lookup failed in production ({e})."

    # If in production and live API did not succeed, FAIL CLOSED!
    if in_production:
        return False, "PRODUCTION_VERIFICATION_FAILED: Live PayPal API verification is strictly required in production."

    # 4. Non-production simulation check
    if not is_simulation_allowed():
        return False, "SIMULATION_DISABLED: Webhook simulation is not enabled in this environment."

    # In test/dev mode with simulation explicitly allowed:
    expected_sig = generate_simulated_webhook_signature(transmission_id, transmission_time, raw_body)
    if transmission_sig == "TEST_SIMULATED_VERIFIED_PAYPAL_SIG" or hmac.compare_digest(transmission_sig, expected_sig):
        return True, "VERIFIED_VIA_CRYPTOGRAPHIC_HMAC"

    return False, "FORGED_SIGNATURE: Provided transmission signature does not match expected cryptographic hash."


@router.post("/api/webhook")
async def secure_paypal_webhook(request: Request, db: Session = Depends(get_db)):
    """
    STRICT PAYPAL WEBHOOK ENDPOINT (Hardened per SEC-01, SEC-04, SEC-05, SEC-08):
    1. Rejects any unverified POST requests with HTTP 401 Unauthorized.
    2. Rejects replayed transmissions with HTTP 409 Conflict.
    3. Requires explicit event_type and explicit transaction_id (never selects arbitrary transactions).
    4. Records internal disputes without claiming false funds recovery.
    """
    raw_body_bytes = await request.body()
    raw_body_str = raw_body_bytes.decode("utf-8")
    
    headers = {k.lower(): v for k, v in request.headers.items()}
    transmission_id = headers.get("paypal-transmission-id")
    
    # Signature verification
    is_valid, reason = verify_paypal_webhook_signature(headers, raw_body_str)
    if not is_valid:
        logger.error(f"[WebhookGate] 401 Unauthorized: {reason}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": "UnauthorizedWebhookEvent",
                "reason": reason,
                "status": "REJECTED_401",
                "timestamp": datetime.utcnow().isoformat()
            }
        )

    # SEC-04: Replay protection
    if transmission_id and transmission_id in PROCESSED_WEBHOOK_TRANSMISSIONS:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": "DuplicateWebhookEvent",
                "message": f"Webhook transmission '{transmission_id}' has already been processed.",
                "status": "REJECTED_DUPLICATE"
            }
        )

    # Parse Event
    try:
        payload = json.loads(raw_body_str) if raw_body_str else {}
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    # SEC-04: Require explicit event_type (do NOT default to DELIVERY_CONFIRMED)
    event_type = payload.get("event_type")
    if not event_type or not isinstance(event_type, str) or not event_type.strip():
        raise HTTPException(status_code=400, detail="Missing required 'event_type' in webhook payload.")
    clean_event = event_type.strip()
    if clean_event not in ALLOWED_WEBHOOK_EVENTS:
        raise HTTPException(status_code=400, detail=f"UnsupportedWebhookEvent: Event type '{clean_event}' is not recognized.")

    # SEC-04: Require explicit transaction_id (never pick arbitrary first-authorized transaction)
    tx_id = payload.get("transaction_id")
    if not tx_id or not isinstance(tx_id, str) or not tx_id.strip():
        raise HTTPException(status_code=400, detail="Missing required 'transaction_id' in webhook payload.")
    clean_tx_id = tx_id.strip()

    async with LEDGER_LOCK:
        # SEC-10: Atomic re-check under lock immediately before processing and reservation
        if transmission_id and transmission_id in PROCESSED_WEBHOOK_TRANSMISSIONS:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "error": "DuplicateWebhookEvent",
                    "message": f"Webhook transmission '{transmission_id}' has already been processed.",
                    "status": "REJECTED_DUPLICATE"
                }
            )

        # Locate Transaction strictly by transaction_id
        target_tx = db.query(TransactionModel).filter(TransactionModel.id == clean_tx_id).first()
        mem_ledger = getattr(request.app.state, "ledger", None)
        mem_target = None
        if mem_ledger:
            for t in mem_ledger:
                if t.get("id") == clean_tx_id:
                    mem_target = t
                    break

        if not target_tx and not mem_target:
            raise HTTPException(status_code=404, detail=f"Transaction '{clean_tx_id}' not found.")

        # Deduplicate transmission under lock
        if transmission_id:
            PROCESSED_WEBHOOK_TRANSMISSIONS.add(transmission_id)

        now_iso = datetime.utcnow().isoformat()

        if clean_event == "DELIVERY_CONFIRMED":
            if target_tx:
                target_tx.delivery_status = "DELIVERY_CONFIRMED_PENDING_REVIEW"
                db.commit()

            if mem_target:
                mem_target["delivery_status"] = "DELIVERY_CONFIRMED_PENDING_REVIEW"

            return {
                "status": "DELIVERY_CONFIRMED_PENDING_REVIEW",
                "message": "Webhook verified cryptographically. Payment capture requires authenticated reviewer verification under Stage 5B protocols.",
                "event_type": clean_event,
                "verification": reason,
                "transaction_id": clean_tx_id,
                "state_hash": target_tx.state_hash if target_tx else mem_target.get("state_hash")
            }

        elif clean_event in ["REPORT_DISPUTE", "DELIVERY_DAMAGED", "LOST_PACKAGE"]:
            dispute_id = f"INTERNAL-DISPUTE-{uuid.uuid4().hex[:8].upper()}"
            if target_tx:
                target_tx.status = "DISPUTED"
                target_tx.delivery_status = "VISION_DAMAGE_DISPUTED"
                target_tx.paypal_dispute_id = None

                chain = json.loads(target_tx.state_chain) if target_tx.state_chain else []
                new_hash, updated_chain = record_state_transition(
                    current_chain=chain,
                    current_hash=target_tx.state_hash or "",
                    amount=target_tx.amount,
                    new_status="DISPUTED",
                    timestamp=now_iso
                )
                target_tx.previous_state_hash = target_tx.state_hash
                target_tx.state_hash = new_hash
                target_tx.state_chain = json.dumps(updated_chain)
                db.commit()

            if mem_target:
                mem_target["status"] = "DISPUTED"
                mem_target["delivery_status"] = "VISION_DAMAGE_DISPUTED"
                mem_target["internal_dispute_id"] = dispute_id
                mem_target["paypal_dispute_id"] = None
                chain = mem_target.get("state_chain") or []
                new_h, updated_c = record_state_transition(
                    chain, mem_target.get("state_hash") or "", mem_target.get("amount", 0.0), "DISPUTED", timestamp=now_iso
                )
                mem_target["previous_state_hash"] = mem_target.get("state_hash")
                mem_target["state_hash"] = new_h
                mem_target["state_chain"] = updated_c

            # SEC-05 & SEC-13: Truthful internal dispute without false PayPal dispute object or funds-reclaimed claims
            return {
                "status": "INTERNAL_DISPUTE_RECORDED",
                "message": "Internal dispute recorded for auditor review; no automated fund recovery executed under Stage 5B protocols.",
                "internal_dispute_id": dispute_id,
                "paypal_dispute_id": None,
                "event_type": clean_event,
                "verification": reason,
                "transaction_id": clean_tx_id,
                "funds_status": "NO_FUNDS_MOVEMENT",
                "state_hash": target_tx.state_hash if target_tx else mem_target.get("state_hash")
            }

        return {"status": "ACK", "verified": True, "event_type": clean_event}
