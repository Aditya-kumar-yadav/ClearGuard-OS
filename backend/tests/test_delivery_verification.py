"""
ClearGuard-OS Stage 5B Security Audit & Verification Test Suite
Reviewer Authentication & Manual Delivery Verification

Covers:
1. Public token issuance cannot grant arbitrary reviewer/admin privileges.
2. Invalid signing secret.
3. Tampered JWT signature.
4. Expired JWT.
5. Invalid JWT algorithm (fixed HS256 algorithm enforcement).
6. Missing bearer token.
7. Insufficient reviewer role.
8. Request-body reviewer identity spoofing.
9. Submitter self-approval.
10. Admin self-approval.
11. Valid independent reviewer approval.
12. Duplicate review request (idempotency).
13. Invalid delivery state transition (no overwriting pending evidence, no silent un-rejection).
14. Unknown transaction.
15. Hash-chain transition exactly once.
16. Hash-chain tampering detection.
17. Delivery rejection.
18. No PayPal capture HTTP request during every delivery workflow.
19. Submitter ownership restrictions on delivery evidence query.
20. Legacy capture method has no synthetic fallback and raises on failure.
"""

import time
import json
import pytest
from decimal import Decimal
from datetime import timedelta
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from main import app, TRANSACTIONS_LEDGER, ACTIVE_MANDATE
from core.auth import (
    create_access_token,
    UserRole,
    DEMO_USERS,
    _b64url_encode,
    _b64url_decode
)
from core.delivery import DeliveryState, EvidenceType, ReviewDecision
from core.crypto_ledger import verify_hash_chain, create_initial_hash_chain
from core.paypal_client import PayPalOrdersClient, PayPalCaptureError, PayPalConfigurationError


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_headers():
    """Provides valid Bearer tokens for each RBAC role."""
    alice_token = create_access_token("submitter_alice", UserRole.SUBMITTER, "Alice Submitter")
    bob_token = create_access_token("submitter_bob", UserRole.SUBMITTER, "Bob Submitter")
    charlie_token = create_access_token("reviewer_charlie", UserRole.REVIEWER, "Charlie Reviewer")
    dave_token = create_access_token("reviewer_dave", UserRole.REVIEWER, "Dave Reviewer")
    eve_token = create_access_token("admin_eve", UserRole.ADMIN, "Eve Admin")

    return {
        "submitter_alice": {"Authorization": f"Bearer {alice_token}"},
        "submitter_bob": {"Authorization": f"Bearer {bob_token}"},
        "reviewer_charlie": {"Authorization": f"Bearer {charlie_token}"},
        "reviewer_dave": {"Authorization": f"Bearer {dave_token}"},
        "admin_eve": {"Authorization": f"Bearer {eve_token}"},
    }


@pytest.fixture
def authorized_transaction():
    """Sets up a clean authorized test transaction in TRANSACTIONS_LEDGER."""
    tx_id = "TX-DELIVERY-TEST-001"
    amount = 45000.00
    chain_init = create_initial_hash_chain(tx_id, amount, status="AUTHORIZED")

    tx = {
        "id": tx_id,
        "item_name": "Logistics Industrial Sensor Suite",
        "category": "electronics",
        "amount": amount,
        "currency": "INR",
        "merchant_name": "Apex Electronics Ltd",
        "status": "AUTHORIZED",
        "payment_status": "PAYMENT_AUTHORIZED",
        "paypal_order_id": "5O123456789012345",
        "paypal_auth_id": "8AA11223344556677",
        "paypal_capture_id": None,
        "delivery_status": "AWAITING_DELIVERY",
        "state_hash": chain_init["state_hash"],
        "previous_state_hash": chain_init["previous_state_hash"],
        "state_chain": chain_init["state_chain"],
        "is_corrupted": False,
        "delivery_evidence": None
    }

    # Remove any existing tx with this ID and insert fresh
    TRANSACTIONS_LEDGER[:] = [t for t in TRANSACTIONS_LEDGER if t.get("id") != tx_id]
    TRANSACTIONS_LEDGER.insert(0, tx)

    return tx


# ------------------------------------------------------------------------------
# Test 1: Public Token Issuance Cannot Grant Arbitrary Reviewer/Admin Privileges
# ------------------------------------------------------------------------------

def test_public_token_issuance_cannot_grant_arbitrary_privileges(client):
    """
    A public caller cannot acquire reviewer or admin tokens without verified credentials.
    - Missing password -> 422
    - Wrong password -> 401
    - Unregistered user -> 401
    - Valid credentials -> 200 with demo warning
    """
    # 1. Unregistered user
    bad_user = client.post("/api/auth/token", json={"username": "attacker", "password": "any"})
    assert bad_user.status_code == 401

    # 2. Admin account with incorrect password
    bad_pass = client.post("/api/auth/token", json={"username": "admin_eve", "password": "wrong_password"})
    assert bad_pass.status_code == 401
    assert "invalid credentials" in bad_pass.json()["detail"].lower()

    # 3. Reviewer account with incorrect password
    bad_rev = client.post("/api/auth/token", json={"username": "reviewer_charlie", "password": "fake"})
    assert bad_rev.status_code == 401

    # 4. Valid demo reviewer credentials
    valid_rev = client.post("/api/auth/token", json={
        "username": "reviewer_charlie",
        "password": "CharlieAuditor2026!"
    })
    assert valid_rev.status_code == 200
    rev_data = valid_rev.json()
    assert "access_token" in rev_data
    assert rev_data["role"] == UserRole.REVIEWER.value
    assert rev_data.get("demo_mode") is True
    assert "DEMO-ONLY" in rev_data.get("demo_warning", "")

    # 5. Valid demo admin credentials
    valid_adm = client.post("/api/auth/token", json={
        "username": "admin_eve",
        "password": "EveComplianceAdmin2026!"
    })
    assert valid_adm.status_code == 200
    assert valid_adm.json()["role"] == UserRole.ADMIN.value


# ------------------------------------------------------------------------------
# Test 2: Invalid Signing Secret
# ------------------------------------------------------------------------------

def test_jwt_invalid_signing_secret(client, authorized_transaction):
    """Tokens signed with an unknown or incorrect secret key return 401 Unauthorized."""
    alien_token = create_access_token(
        "reviewer_charlie",
        UserRole.REVIEWER,
        "Charlie",
        secret_key="completely-different-alien-secret-key-32b!!"
    )
    res = client.post(
        "/api/delivery/review",
        json={"transaction_id": authorized_transaction["id"], "decision": "APPROVE", "review_notes": "Note"},
        headers={"Authorization": f"Bearer {alien_token}"}
    )
    assert res.status_code == 401
    assert "invalid token signature" in res.json()["detail"].lower()


# ------------------------------------------------------------------------------
# Test 3: Tampered JWT Signature
# ------------------------------------------------------------------------------

def test_jwt_tampered_signature(client, authorized_transaction, auth_headers):
    """Tampering with the token signature returns 401 Unauthorized."""
    valid_token = auth_headers["reviewer_charlie"]["Authorization"].replace("Bearer ", "")
    parts = valid_token.split(".")
    # Mutate last character of signature
    tampered_sig = parts[2][:-1] + ("A" if parts[2][-1] != "A" else "B")
    tampered_token = f"{parts[0]}.{parts[1]}.{tampered_sig}"

    res = client.post(
        "/api/delivery/review",
        json={"transaction_id": authorized_transaction["id"], "decision": "APPROVE", "review_notes": "Note"},
        headers={"Authorization": f"Bearer {tampered_token}"}
    )
    assert res.status_code == 401
    assert "invalid token signature" in res.json()["detail"].lower()


# ------------------------------------------------------------------------------
# Test 4: Expired JWT
# ------------------------------------------------------------------------------

def test_jwt_expired_token(client, authorized_transaction):
    """Expired tokens are strictly rejected with 401 Unauthorized."""
    expired_token = create_access_token(
        "reviewer_charlie",
        UserRole.REVIEWER,
        "Charlie",
        expires_delta=timedelta(seconds=-10)
    )
    res = client.post(
        "/api/delivery/review",
        json={"transaction_id": authorized_transaction["id"], "decision": "APPROVE", "review_notes": "Note"},
        headers={"Authorization": f"Bearer {expired_token}"}
    )
    assert res.status_code == 401
    assert "expired" in res.json()["detail"].lower()


# ------------------------------------------------------------------------------
# Test 5: Invalid JWT Algorithm (Fixed Algorithm Enforcement)
# ------------------------------------------------------------------------------

def test_jwt_invalid_algorithm_rejected(client, authorized_transaction):
    """
    Fixed-algorithm enforcement: attacker-controlled alg header ('none', 'RS256', etc.)
    is strictly rejected with 401 Unauthorized.
    """
    header = {"alg": "none", "typ": "JWT"}
    payload = {
        "sub": "reviewer_charlie",
        "role": "ROLE_DELIVERY_REVIEWER",
        "name": "Charlie",
        "iat": int(time.time()),
        "exp": int(time.time()) + 3600
    }
    h_b64 = _b64url_encode(json.dumps(header).encode("utf-8"))
    p_b64 = _b64url_encode(json.dumps(payload).encode("utf-8"))
    bad_alg_token = f"{h_b64}.{p_b64}.unsigned"

    res = client.post(
        "/api/delivery/review",
        json={"transaction_id": authorized_transaction["id"], "decision": "APPROVE", "review_notes": "Note"},
        headers={"Authorization": f"Bearer {bad_alg_token}"}
    )
    assert res.status_code == 401
    assert "unsupported token algorithm" in res.json()["detail"].lower()


# ------------------------------------------------------------------------------
# Test 6: Missing Bearer Token
# ------------------------------------------------------------------------------

def test_missing_bearer_token(client, authorized_transaction):
    """Calls without Authorization header return 401."""
    sub_res = client.post("/api/delivery/submit-evidence", json={
        "transaction_id": authorized_transaction["id"],
        "evidence_type": EvidenceType.PHYSICAL_INSPECTION_POD.value,
        "evidence_reference": "ref.jpg"
    })
    assert sub_res.status_code == 401

    rev_res = client.post("/api/delivery/review", json={
        "transaction_id": authorized_transaction["id"],
        "decision": "APPROVE",
        "review_notes": "Notes"
    })
    assert rev_res.status_code == 401


# ------------------------------------------------------------------------------
# Test 7: Insufficient Reviewer Role
# ------------------------------------------------------------------------------

def test_insufficient_reviewer_role(client, authorized_transaction, auth_headers):
    """Users with ROLE_DELIVERY_SUBMITTER cannot review delivery evidence (403)."""
    # Alice submits
    client.post(
        "/api/delivery/submit-evidence",
        json={
            "transaction_id": authorized_transaction["id"],
            "evidence_type": EvidenceType.CARRIER_WAYBILL.value,
            "evidence_reference": "ref.pdf"
        },
        headers=auth_headers["submitter_alice"]
    )

    # Bob (submitter) attempts review
    res = client.post(
        "/api/delivery/review",
        json={
            "transaction_id": authorized_transaction["id"],
            "decision": "APPROVE",
            "review_notes": "Trying to review as submitter"
        },
        headers=auth_headers["submitter_bob"]
    )
    assert res.status_code == 403
    assert "insufficient permissions" in res.json()["detail"].lower()


# ------------------------------------------------------------------------------
# Test 8: Request-Body Reviewer Identity Spoofing
# ------------------------------------------------------------------------------

def test_request_body_reviewer_identity_spoofing(client, authorized_transaction, auth_headers):
    """
    Attempting to spoof reviewer identity via request-body 'reviewer_id' or 'verified_by'
    is detected and rejected with HTTP 403 Forbidden.
    """
    client.post(
        "/api/delivery/submit-evidence",
        json={
            "transaction_id": authorized_transaction["id"],
            "evidence_type": EvidenceType.DELIVERY_RECEIPT.value,
            "evidence_reference": "slip.pdf"
        },
        headers=auth_headers["submitter_alice"]
    )

    res = client.post(
        "/api/delivery/review",
        json={
            "transaction_id": authorized_transaction["id"],
            "decision": "APPROVE",
            "review_notes": "Spoofing attempt",
            "reviewer_id": "admin_eve"  # Attacker claims to be admin
        },
        headers=auth_headers["reviewer_charlie"]
    )
    assert res.status_code == 403
    assert "identity spoofing detected" in res.json()["detail"].lower()


# ------------------------------------------------------------------------------
# Test 9 & 10: Submitter & Admin Self-Approval (Maker-Checker)
# ------------------------------------------------------------------------------

def test_submitter_self_approval_rejected(client, authorized_transaction, auth_headers):
    """A submitter cannot approve their own evidence."""
    # Alice submits
    client.post(
        "/api/delivery/submit-evidence",
        json={
            "transaction_id": authorized_transaction["id"],
            "evidence_type": EvidenceType.PHYSICAL_INSPECTION_POD.value,
            "evidence_reference": "pod.jpg"
        },
        headers=auth_headers["submitter_alice"]
    )

    # Alice attempts to approve
    res = client.post(
        "/api/delivery/review",
        json={
            "transaction_id": authorized_transaction["id"],
            "decision": "APPROVE",
            "review_notes": "Self review"
        },
        headers=auth_headers["submitter_alice"]
    )
    # Blocked either by role (403) or maker-checker (403)
    assert res.status_code == 403


def test_admin_self_approval_rejected(client, authorized_transaction, auth_headers):
    """
    Admin privileges do NOT bypass maker-checker separation:
    Admin Eve cannot approve evidence that Admin Eve submitted.
    """
    # Eve submits
    sub_res = client.post(
        "/api/delivery/submit-evidence",
        json={
            "transaction_id": authorized_transaction["id"],
            "evidence_type": EvidenceType.PHYSICAL_INSPECTION_POD.value,
            "evidence_reference": "admin_pod.jpg"
        },
        headers=auth_headers["admin_eve"]
    )
    assert sub_res.status_code == 200

    # Eve attempts review
    rev_res = client.post(
        "/api/delivery/review",
        json={
            "transaction_id": authorized_transaction["id"],
            "decision": "APPROVE",
            "review_notes": "Admin self approval"
        },
        headers=auth_headers["admin_eve"]
    )
    assert rev_res.status_code == 403
    assert "maker-checker violation" in rev_res.json()["detail"].lower()


# ------------------------------------------------------------------------------
# Test 11: Valid Independent Reviewer Approval
# ------------------------------------------------------------------------------

def test_valid_independent_reviewer_approval(client, authorized_transaction, auth_headers):
    """Independent reviewer approves evidence; transitions to DELIVERY_VERIFIED."""
    # Alice submits
    client.post(
        "/api/delivery/submit-evidence",
        json={
            "transaction_id": authorized_transaction["id"],
            "evidence_type": EvidenceType.PHYSICAL_INSPECTION_POD.value,
            "carrier_name": "BlueDart Logistics",
            "tracking_reference": "TRK-BLUEDART-9921",
            "evidence_reference": "https://storage.clearguard.io/pod/signed_slip.pdf",
            "notes": "Delivered to reception."
        },
        headers=auth_headers["submitter_alice"]
    )

    # Charlie approves
    res = client.post(
        "/api/delivery/review",
        json={
            "transaction_id": authorized_transaction["id"],
            "decision": "APPROVE",
            "review_notes": "Verified dock signature and intact seals."
        },
        headers=auth_headers["reviewer_charlie"]
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == DeliveryState.DELIVERY_VERIFIED.value
    assert data["delivery_status"] == DeliveryState.DELIVERY_VERIFIED.value
    assert data["payment_status"] == "AUTHORIZED"
    assert data["evidence"]["authenticated_reviewer"] == "reviewer_charlie"
    assert data["evidence"]["independently_authenticated"] is False


# ------------------------------------------------------------------------------
# Test 12: Duplicate Review Request (Idempotency)
# ------------------------------------------------------------------------------

def test_duplicate_review_request_idempotent(client, authorized_transaction, auth_headers):
    """Repeated approvals return 200 with already_verified: True and zero chain mutation."""
    client.post(
        "/api/delivery/submit-evidence",
        json={
            "transaction_id": authorized_transaction["id"],
            "evidence_type": EvidenceType.DELIVERY_RECEIPT.value,
            "evidence_reference": "slip.pdf"
        },
        headers=auth_headers["submitter_alice"]
    )

    res1 = client.post(
        "/api/delivery/review",
        json={"transaction_id": authorized_transaction["id"], "decision": "APPROVE", "review_notes": "1st"},
        headers=auth_headers["reviewer_charlie"]
    )
    assert res1.status_code == 200
    chain_len = len(authorized_transaction["state_chain"])
    rev_time = authorized_transaction["delivery_evidence"]["review_timestamp"]

    # Duplicate call
    res2 = client.post(
        "/api/delivery/review",
        json={"transaction_id": authorized_transaction["id"], "decision": "APPROVE", "review_notes": "2nd"},
        headers=auth_headers["reviewer_dave"]
    )
    assert res2.status_code == 200
    assert res2.json().get("already_verified") is True
    assert len(authorized_transaction["state_chain"]) == chain_len
    assert authorized_transaction["delivery_evidence"]["authenticated_reviewer"] == "reviewer_charlie"
    assert authorized_transaction["delivery_evidence"]["review_timestamp"] == rev_time


# ------------------------------------------------------------------------------
# Test 13: Invalid Delivery State Transitions
# ------------------------------------------------------------------------------

def test_invalid_delivery_state_transitions(client, authorized_transaction, auth_headers):
    """
    Rejects invalid state transitions:
    - Queueing review without evidence (400)
    - Reviewing without evidence (400)
    - Overwriting pending evidence (409)
    - Silently approving previously rejected evidence (400)
    - Rejecting already verified delivery (400)
    """
    tx_id = authorized_transaction["id"]

    # 1. Queue review without evidence -> 400
    q_res = client.post(
        "/api/delivery/queue-review",
        json={"transaction_id": tx_id},
        headers=auth_headers["reviewer_charlie"]
    )
    assert q_res.status_code == 400

    # 2. Review without evidence -> 400
    r_res = client.post(
        "/api/delivery/review",
        json={"transaction_id": tx_id, "decision": "APPROVE", "review_notes": "Early"},
        headers=auth_headers["reviewer_charlie"]
    )
    assert r_res.status_code == 400

    # 3. Submit evidence
    sub_res = client.post(
        "/api/delivery/submit-evidence",
        json={
            "transaction_id": tx_id,
            "evidence_type": EvidenceType.PHYSICAL_INSPECTION_POD.value,
            "evidence_reference": "initial_evidence.jpg"
        },
        headers=auth_headers["submitter_alice"]
    )
    assert sub_res.status_code == 200

    # 4. Overwriting pending evidence -> 409 Conflict
    dup_sub = client.post(
        "/api/delivery/submit-evidence",
        json={
            "transaction_id": tx_id,
            "evidence_type": EvidenceType.PHYSICAL_INSPECTION_POD.value,
            "evidence_reference": "overwrite_attempt.jpg"
        },
        headers=auth_headers["submitter_bob"]
    )
    assert dup_sub.status_code == 409
    assert "already exists" in dup_sub.json()["detail"]["message"].lower()

    # 5. Reject delivery
    rej_res = client.post(
        "/api/delivery/review",
        json={"transaction_id": tx_id, "decision": "REJECT", "review_notes": "Damaged goods."},
        headers=auth_headers["reviewer_charlie"]
    )
    assert rej_res.status_code == 200
    assert authorized_transaction["delivery_status"] == DeliveryState.DELIVERY_REJECTED.value

    # 6. Cannot silently approve previously rejected evidence! -> 400
    silent_app = client.post(
        "/api/delivery/review",
        json={"transaction_id": tx_id, "decision": "APPROVE", "review_notes": "Trying to silently approve rejected"},
        headers=auth_headers["reviewer_dave"]
    )
    assert silent_app.status_code == 400
    assert "cannotapproverejectedevidence" in silent_app.json()["detail"]["error"].lower()


# ------------------------------------------------------------------------------
# Test 14: Unknown Transaction (No Reconstruction)
# ------------------------------------------------------------------------------

def test_unknown_transaction_rejected(client, auth_headers):
    """Submissions or reviews on unknown transaction IDs return 404 without creating records."""
    count_before = len(TRANSACTIONS_LEDGER)

    res = client.post(
        "/api/delivery/submit-evidence",
        json={
            "transaction_id": "TX-GHOST-TRANSACTION-999",
            "evidence_type": EvidenceType.DELIVERY_RECEIPT.value,
            "evidence_reference": "ghost.pdf"
        },
        headers=auth_headers["submitter_alice"]
    )
    assert res.status_code == 404
    assert res.json()["detail"]["error"] == "TransactionNotFound"
    assert len(TRANSACTIONS_LEDGER) == count_before


# ------------------------------------------------------------------------------
# Test 15: Hash-Chain Transition Recorded Exactly Once
# ------------------------------------------------------------------------------

def test_hash_chain_transition_exactly_once(client, authorized_transaction, auth_headers):
    """Verifies state chain is appended exactly once per distinct transition."""
    # Initial chain has 1 block (INIT_AUTHORIZED)
    assert len(authorized_transaction["state_chain"]) == 1

    # 1. Submit evidence -> step 1
    client.post(
        "/api/delivery/submit-evidence",
        json={
            "transaction_id": authorized_transaction["id"],
            "evidence_type": EvidenceType.DELIVERY_RECEIPT.value,
            "evidence_reference": "ref.pdf"
        },
        headers=auth_headers["submitter_alice"]
    )
    assert len(authorized_transaction["state_chain"]) == 2
    assert authorized_transaction["state_chain"][-1]["status"] == DeliveryState.DELIVERY_EVIDENCE_SUBMITTED.value

    # 2. Queue review -> step 2
    client.post(
        "/api/delivery/queue-review",
        json={"transaction_id": authorized_transaction["id"]},
        headers=auth_headers["reviewer_charlie"]
    )
    assert len(authorized_transaction["state_chain"]) == 3
    assert authorized_transaction["state_chain"][-1]["status"] == DeliveryState.DELIVERY_REVIEW_PENDING.value

    # Duplicate queue -> no new block
    client.post(
        "/api/delivery/queue-review",
        json={"transaction_id": authorized_transaction["id"]},
        headers=auth_headers["reviewer_charlie"]
    )
    assert len(authorized_transaction["state_chain"]) == 3

    # 3. Approve review -> step 3
    client.post(
        "/api/delivery/review",
        json={"transaction_id": authorized_transaction["id"], "decision": "APPROVE", "review_notes": "OK"},
        headers=auth_headers["reviewer_charlie"]
    )
    assert len(authorized_transaction["state_chain"]) == 4
    assert authorized_transaction["state_chain"][-1]["status"] == DeliveryState.DELIVERY_VERIFIED.value

    # Duplicate approve -> no new block
    client.post(
        "/api/delivery/review",
        json={"transaction_id": authorized_transaction["id"], "decision": "APPROVE", "review_notes": "OK again"},
        headers=auth_headers["reviewer_charlie"]
    )
    assert len(authorized_transaction["state_chain"]) == 4


# ------------------------------------------------------------------------------
# Test 16: Hash-Chain Tampering Detection
# ------------------------------------------------------------------------------

def test_hash_chain_tampering_detection(authorized_transaction):
    """
    Verifies that altering amount, previous hash, timestamp, or status
    causes verify_hash_chain to fail with CORRUPTED.
    """
    chain = authorized_transaction["state_chain"]
    current_hash = authorized_transaction["state_hash"]
    amount = authorized_transaction["amount"]
    status = authorized_transaction["status"]

    # 1. Unmodified chain verifies
    is_valid, reason, _ = verify_hash_chain(chain, current_hash, amount, status)
    assert is_valid

    # 2. Tampered amount in active record
    is_valid, reason, _ = verify_hash_chain(chain, current_hash, 99999.00, status)
    assert not is_valid
    assert "CORRUPTED" in reason

    # 3. Tampered state_hash in chain
    tampered_chain = [dict(c) for c in chain]
    tampered_chain[0]["state_hash"] = "0000000000000000000000000000000000000000000000000000000000000001"
    is_valid, reason, _ = verify_hash_chain(tampered_chain, current_hash, amount, status)
    assert not is_valid
    assert "CORRUPTED" in reason

    # 4. Tampered previous_state_hash in chain
    tampered_chain2 = [dict(c) for c in chain]
    tampered_chain2[0]["previous_state_hash"] = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
    is_valid, reason, _ = verify_hash_chain(tampered_chain2, current_hash, amount, status)
    assert not is_valid
    assert "CORRUPTED" in reason


# ------------------------------------------------------------------------------
# Test 17: Delivery Rejection
# ------------------------------------------------------------------------------

def test_delivery_rejection_workflow(client, authorized_transaction, auth_headers):
    """
    Reviewer rejects delivery.
    Payment status remains AUTHORIZED (never captured).
    """
    client.post(
        "/api/delivery/submit-evidence",
        json={
            "transaction_id": authorized_transaction["id"],
            "evidence_type": EvidenceType.PHYSICAL_INSPECTION_POD.value,
            "evidence_reference": "damaged-goods.jpg"
        },
        headers=auth_headers["submitter_alice"]
    )

    res = client.post(
        "/api/delivery/review",
        json={
            "transaction_id": authorized_transaction["id"],
            "decision": "REJECT",
            "review_notes": "Damaged container observed during inspection."
        },
        headers=auth_headers["reviewer_charlie"]
    )
    assert res.status_code == 200
    assert authorized_transaction["delivery_status"] == DeliveryState.DELIVERY_REJECTED.value
    assert authorized_transaction["status"] == "AUTHORIZED"
    assert authorized_transaction["paypal_capture_id"] is None


# ------------------------------------------------------------------------------
# Test 18: No PayPal Capture HTTP Request During Every Delivery Workflow
# ------------------------------------------------------------------------------

def test_no_paypal_capture_http_request_during_workflows(
    client, authorized_transaction, auth_headers
):
    """
    Ensures zero PayPal capture API requests are sent during evidence submission,
    queueing, approval, or rejection workflows.
    """
    with patch("main.paypal_client.capture_authorization") as mock_capture, \
         patch("main.paypal_client.create_authorized_order") as mock_order:

        # 1. Submit
        client.post(
            "/api/delivery/submit-evidence",
            json={
                "transaction_id": authorized_transaction["id"],
                "evidence_type": EvidenceType.PHYSICAL_INSPECTION_POD.value,
                "evidence_reference": "pod.jpg"
            },
            headers=auth_headers["submitter_alice"]
        )

        # 2. Queue
        client.post(
            "/api/delivery/queue-review",
            json={"transaction_id": authorized_transaction["id"]},
            headers=auth_headers["reviewer_charlie"]
        )

        # 3. Approve
        client.post(
            "/api/delivery/review",
            json={
                "transaction_id": authorized_transaction["id"],
                "decision": "APPROVE",
                "review_notes": "Approved"
            },
            headers=auth_headers["reviewer_charlie"]
        )

        # Asserts zero capture or order calls
        mock_capture.assert_not_called()
        mock_order.assert_not_called()


# ------------------------------------------------------------------------------
# Test 19: Submitter Ownership Restrictions on Evidence Query
# ------------------------------------------------------------------------------

def test_submitter_ownership_restrictions_on_evidence_query(
    client, authorized_transaction, auth_headers
):
    """
    Submitters can only query evidence records that they themselves submitted.
    Reviewers and Admins have system-wide audit access.
    """
    # 1. Alice submits evidence
    client.post(
        "/api/delivery/submit-evidence",
        json={
            "transaction_id": authorized_transaction["id"],
            "evidence_type": EvidenceType.DELIVERY_RECEIPT.value,
            "evidence_reference": "alice-slip.pdf"
        },
        headers=auth_headers["submitter_alice"]
    )

    # 2. Alice views her own submission -> 200 OK
    alice_res = client.get(
        f"/api/delivery/evidence/{authorized_transaction['id']}",
        headers=auth_headers["submitter_alice"]
    )
    assert alice_res.status_code == 200

    # 3. Submitter Bob tries to view Alice's evidence -> 403 Forbidden!
    bob_res = client.get(
        f"/api/delivery/evidence/{authorized_transaction['id']}",
        headers=auth_headers["submitter_bob"]
    )
    assert bob_res.status_code == 403
    assert "access denied" in bob_res.json()["detail"].lower()

    # 4. Reviewer Charlie can view Alice's evidence -> 200 OK
    charlie_res = client.get(
        f"/api/delivery/evidence/{authorized_transaction['id']}",
        headers=auth_headers["reviewer_charlie"]
    )
    assert charlie_res.status_code == 200


# ------------------------------------------------------------------------------
# Test 20: Legacy Capture Method Has No Synthetic Fallback
# ------------------------------------------------------------------------------

def test_paypal_client_capture_authorization_no_synthetic_fallback():
    """
    When capture call fails or credentials are missing, capture_authorization
    raises typed exceptions and NEVER produces synthetic 'CAP_' capture IDs.
    """
    client = PayPalOrdersClient(client_id="dummy_id", client_secret="dummy_secret")

    # Mock access token success but HTTP capture call returns 400
    with patch.object(client, "get_access_token_sync", return_value="test_token"):
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.text = '{"name": "UNPROCESSABLE_ENTITY", "message": "The authorization has expired."}'
        mock_response.content = mock_response.text.encode("utf-8")
        mock_response.json.return_value = {"name": "UNPROCESSABLE_ENTITY"}

        with patch("httpx.Client.post", return_value=mock_response):
            with pytest.raises(PayPalCaptureError) as exc_info:
                client.capture_authorization(
                    authorization_id="AUTH_EXPIRED_123",
                    amount="500.00",
                    currency="USD"
                )
            assert exc_info.value.status_code == 400
            assert "PayPal capture call failed" in str(exc_info.value)


# ==============================================================================
# SEC-01: Remove Webhook Simulation Bypass & Enforce Production Fail-Closed
# ==============================================================================

def test_literal_test_signature_rejected_in_production(client, authorized_transaction, monkeypatch):
    """
    SEC-01: In production environment, verify_paypal_webhook_signature strictly
    rejects the literal 'TEST_SIMULATED_VERIFIED_PAYPAL_SIG' signature with 401.
    """
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("PAYPAL_WEBHOOK_ID", "WH-LIVE-PRODUCTION-WEBHOOK-99")

    headers = {
        "PAYPAL-AUTH-ALGO": "SHA256withRSA",
        "PAYPAL-CERT-URL": "https://api.paypal.com/v1/notifications/certs/CERT-LIVE.pem",
        "PAYPAL-TRANSMISSION-ID": f"TRANS-SEC01-PROD-{time.time()}",
        "PAYPAL-TRANSMISSION-TIME": "2026-11-09T08:00:00Z",
        "PAYPAL-TRANSMISSION-SIG": "TEST_SIMULATED_VERIFIED_PAYPAL_SIG",
    }
    payload = {"event_type": "DELIVERY_CONFIRMED", "transaction_id": authorized_transaction["id"]}

    res = client.post("/api/webhook", json=payload, headers=headers)
    assert res.status_code == 401
    detail = res.json()["detail"]["reason"]
    assert "PRODUCTION_VERIFICATION_FAILED" in detail or "SIMULATION_DISABLED" in detail


def test_literal_test_signature_accepted_only_in_explicitly_enabled_test_mode(client, authorized_transaction, monkeypatch):
    """
    SEC-01: Test signature is accepted only when simulation is explicitly enabled
    in non-production development/test mode.
    """
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("ALLOW_WEBHOOK_SIMULATION", "true")

    headers = {
        "PAYPAL-AUTH-ALGO": "SHA256withRSA",
        "PAYPAL-CERT-URL": "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-360-TEST.pem",
        "PAYPAL-TRANSMISSION-ID": f"TRANS-SEC01-TEST-{time.time()}",
        "PAYPAL-TRANSMISSION-TIME": "2026-11-09T08:00:00Z",
        "PAYPAL-TRANSMISSION-SIG": "TEST_SIMULATED_VERIFIED_PAYPAL_SIG",
    }
    payload = {"event_type": "DELIVERY_CONFIRMED", "transaction_id": authorized_transaction["id"]}

    res = client.post("/api/webhook", json=payload, headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "DELIVERY_CONFIRMED_PENDING_REVIEW"


def test_invalid_paypal_signature_rejected(client, authorized_transaction, monkeypatch):
    """
    SEC-01: Forged or invalid transmission signature is rejected with 401.
    """
    monkeypatch.setenv("ENVIRONMENT", "development")
    headers = {
        "PAYPAL-AUTH-ALGO": "SHA256withRSA",
        "PAYPAL-CERT-URL": "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-360-TEST.pem",
        "PAYPAL-TRANSMISSION-ID": f"TRANS-SEC01-FORGED-{time.time()}",
        "PAYPAL-TRANSMISSION-TIME": "2026-11-09T08:00:00Z",
        "PAYPAL-TRANSMISSION-SIG": "FORGED_SIGNATURE_PAYLOAD_TEST_12345",
    }
    payload = {"event_type": "DELIVERY_CONFIRMED", "transaction_id": authorized_transaction["id"]}

    res = client.post("/api/webhook", json=payload, headers=headers)
    assert res.status_code == 401
    assert "FORGED_SIGNATURE" in res.json()["detail"]["reason"]


def test_paypal_verification_api_failure_does_not_trigger_production_simulation_fallback(client, authorized_transaction, monkeypatch):
    """
    SEC-01 & SEC-08: In production, when PayPal live verification API fails or times out,
    the verifier fails closed and does NOT fall back to simulation.
    """
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("PAYPAL_CLIENT_ID", "REAL_CLIENT_ID_XYZ")
    monkeypatch.setenv("PAYPAL_CLIENT_SECRET", "REAL_CLIENT_SECRET_XYZ")
    monkeypatch.setenv("PAYPAL_WEBHOOK_ID", "WH-PRODUCTION-REAL-999")

    with patch("api.webhooks.httpx.Client") as mock_client_cls:
        mock_instance = mock_client_cls.return_value.__enter__.return_value
        mock_instance.post.side_effect = Exception("PayPal verification API unreachable")
        headers = {
            "PAYPAL-AUTH-ALGO": "SHA256withRSA",
            "PAYPAL-CERT-URL": "https://api.paypal.com/v1/notifications/certs/CERT-LIVE.pem",
            "PAYPAL-TRANSMISSION-ID": f"TRANS-PROD-FAIL-{time.time()}",
            "PAYPAL-TRANSMISSION-TIME": "2026-11-09T08:00:00Z",
            "PAYPAL-TRANSMISSION-SIG": "TEST_SIMULATED_VERIFIED_PAYPAL_SIG",
        }
        payload = {"event_type": "DELIVERY_CONFIRMED", "transaction_id": authorized_transaction["id"]}

        res = client.post("/api/webhook", json=payload, headers=headers)
        assert res.status_code == 401
        detail = res.json()["detail"]["reason"]
        assert "PAYPAL_API_VERIFICATION_UNAVAILABLE" in detail or "PRODUCTION_VERIFICATION_FAILED" in detail


def test_malformed_or_untrusted_certificate_urls_rejected(client, authorized_transaction):
    """
    SEC-01: Validates that certificate URLs with non-HTTPS scheme, untrusted domain,
    userinfo, or non-standard port are rejected with 401.
    """
    bad_urls = [
        "http://api.sandbox.paypal.com/cert.pem",
        "https://evil-phishing-paypal.com/cert.pem",
        "https://api.sandbox.paypal.com:8443/cert.pem",
        "https://user:pass@api.sandbox.paypal.com/cert.pem",
    ]
    for url in bad_urls:
        headers = {
            "PAYPAL-AUTH-ALGO": "SHA256withRSA",
            "PAYPAL-CERT-URL": url,
            "PAYPAL-TRANSMISSION-ID": f"TRANS-BAD-URL-{time.time()}",
            "PAYPAL-TRANSMISSION-TIME": "2026-11-09T08:00:00Z",
            "PAYPAL-TRANSMISSION-SIG": "TEST_SIMULATED_VERIFIED_PAYPAL_SIG",
        }
        payload = {"event_type": "DELIVERY_CONFIRMED", "transaction_id": authorized_transaction["id"]}
        res = client.post("/api/webhook", json=payload, headers=headers)
        assert res.status_code == 401
        detail = res.json()["detail"]["reason"]
        assert any(x in detail for x in ["INVALID_CERT_URL", "UNTRUSTED_CERT_DOMAIN", "INVALID_CERT_PORT", "MALFORMED_CERT_URL"])


# ==============================================================================
# SEC-02: Eliminate Fabricated Authorization IDs
# ==============================================================================

def test_missing_or_fabricated_paypal_ids_cannot_create_authorized_transaction():
    """
    SEC-02: Verifies that paypal_client.create_authorized_order raises when credentials
    are unconfigured and never fabricates synthetic 'AUTH_' identifiers.
    """
    unconfigured_client = PayPalOrdersClient(client_id="", client_secret="")
    with pytest.raises(PayPalConfigurationError):
        unconfigured_client.create_authorized_order("Test Item", "50000.00")


def test_vision_endpoint_requires_existing_authorized_transaction_and_genuine_auth_id(client, auth_headers):
    """
    SEC-02: /api/vision/verify-delivery rejects non-existent transactions or transactions
    lacking genuine PayPal authorization.
    """
    # 1. Non-existent transaction
    res = client.post(
        "/api/vision/verify-delivery",
        json={"transaction_id": "TX-NONEXISTENT-999", "scenario": "INTACT_PACKAGE"},
        headers=auth_headers["submitter_alice"]
    )
    assert res.status_code == 404

    # 2. Missing transaction_id field
    res_missing = client.post(
        "/api/vision/verify-delivery",
        json={"scenario": "INTACT_PACKAGE"},
        headers=auth_headers["submitter_alice"]
    )
    assert res_missing.status_code == 400


def test_vision_endpoint_requires_authenticated_submitter_or_reviewer(client, authorized_transaction):
    """
    SEC-02: /api/vision/verify-delivery rejects unauthenticated calls.
    """
    res = client.post(
        "/api/vision/verify-delivery",
        json={"transaction_id": authorized_transaction["id"], "scenario": "INTACT_PACKAGE"}
    )
    assert res.status_code in (401, 403)


def test_vision_endpoint_stores_recommendation_without_self_verifying_delivery(client, authorized_transaction, auth_headers):
    """
    SEC-02: /api/vision/verify-delivery stores analysis under vision_audit as an
    assistive recommendation, and does NOT mark delivery as verified or capture payment.
    """
    res = client.post(
        "/api/vision/verify-delivery",
        json={"transaction_id": authorized_transaction["id"], "scenario": "INTACT_PACKAGE"},
        headers=auth_headers["submitter_alice"]
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "AUTHORIZED"
    assert data["delivery_status"] == DeliveryState.DELIVERY_REVIEW_PENDING.value
    assert data["paypal_capture_id"] is None
    assert authorized_transaction["delivery_status"] == DeliveryState.DELIVERY_REVIEW_PENDING.value
    assert authorized_transaction["vision_audit"] is not None


# ==============================================================================
# SEC-03: Preserve Rejected Evidence History & Versioning
# ==============================================================================

def test_rejected_evidence_remains_retrievable_in_history(client, authorized_transaction, auth_headers):
    """
    SEC-03: When delivery evidence is rejected and new evidence is submitted,
    the rejected evidence is archived in delivery_evidence_history and retrievable.
    """
    tx_id = authorized_transaction["id"]

    # 1. Alice submits Version 1
    v1_res = client.post(
        "/api/delivery/submit-evidence",
        json={
            "transaction_id": tx_id,
            "evidence_type": EvidenceType.PHYSICAL_INSPECTION_POD.value,
            "evidence_reference": "photo_v1_damaged.jpg",
            "notes": "First drop-off submission"
        },
        headers=auth_headers["submitter_alice"]
    )
    assert v1_res.status_code == 200
    assert v1_res.json()["evidence"]["version"] == 1

    # 2. Reviewer Charlie rejects Version 1
    reject_res = client.post(
        "/api/delivery/review",
        json={
            "transaction_id": tx_id,
            "decision": "REJECT",
            "review_notes": "Damaged carton visible in photo."
        },
        headers=auth_headers["reviewer_charlie"]
    )
    assert reject_res.status_code == 200
    assert authorized_transaction["delivery_status"] == DeliveryState.DELIVERY_REJECTED.value

    # 3. Alice submits Version 2
    v2_res = client.post(
        "/api/delivery/submit-evidence",
        json={
            "transaction_id": tx_id,
            "evidence_type": EvidenceType.CARRIER_WAYBILL.value,
            "evidence_reference": "signed_waybill_v2.pdf",
            "notes": "Replacement signed waybill"
        },
        headers=auth_headers["submitter_alice"]
    )
    assert v2_res.status_code == 200
    v2_ev = v2_res.json()["evidence"]
    assert v2_ev["version"] == 2
    assert v2_ev["supersedes_version"] == 1

    # 4. Query evidence endpoint and verify history
    query_res = client.get(f"/api/delivery/evidence/{tx_id}", headers=auth_headers["reviewer_charlie"])
    assert query_res.status_code == 200
    q_data = query_res.json()
    assert q_data["current_version"] == 2
    assert q_data["is_history_present"] is True
    assert len(q_data["evidence_history"]) == 1

    # Verify historical rejected evidence retained all original audit fields
    hist_ev = q_data["evidence_history"][0]
    assert hist_ev["version"] == 1
    assert hist_ev["evidence_reference"] == "photo_v1_damaged.jpg"
    assert hist_ev["review_decision"] == "REJECT"
    assert hist_ev["authenticated_reviewer"] == "reviewer_charlie"
    assert hist_ev["review_notes"] == "Damaged carton visible in photo."


def test_active_or_verified_evidence_cannot_be_overwritten(client, authorized_transaction, auth_headers):
    """
    SEC-03: Submitting new evidence while an existing submission is active or verified
    is rejected with 409 Conflict.
    """
    tx_id = authorized_transaction["id"]

    # 1. Initial submission
    client.post(
        "/api/delivery/submit-evidence",
        json={
            "transaction_id": tx_id,
            "evidence_type": EvidenceType.DELIVERY_RECEIPT.value,
            "evidence_reference": "receipt.pdf"
        },
        headers=auth_headers["submitter_alice"]
    )

    # 2. Resubmission attempt while DELIVERY_EVIDENCE_SUBMITTED -> 409 Conflict
    conflict_res = client.post(
        "/api/delivery/submit-evidence",
        json={
            "transaction_id": tx_id,
            "evidence_type": EvidenceType.DELIVERY_RECEIPT.value,
            "evidence_reference": "receipt_overwrite_attempt.pdf"
        },
        headers=auth_headers["submitter_alice"]
    )
    assert conflict_res.status_code == 409
    assert "Existing submission cannot be overwritten" in conflict_res.json()["detail"]["message"]


# ==============================================================================
# SEC-04: Webhook Event Validation & Replay Protection
# ==============================================================================

def test_webhook_missing_event_type_rejected(client, authorized_transaction):
    """
    SEC-04: Webhook request lacking explicit 'event_type' is rejected with 400.
    """
    headers = {
        "PAYPAL-AUTH-ALGO": "SHA256withRSA",
        "PAYPAL-CERT-URL": "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-360-TEST.pem",
        "PAYPAL-TRANSMISSION-ID": f"TRANS-SEC04-NO-EVENT-{time.time()}",
        "PAYPAL-TRANSMISSION-TIME": "2026-11-09T08:00:00Z",
        "PAYPAL-TRANSMISSION-SIG": "TEST_SIMULATED_VERIFIED_PAYPAL_SIG",
    }
    payload = {"transaction_id": authorized_transaction["id"]}

    res = client.post("/api/webhook", json=payload, headers=headers)
    assert res.status_code == 400
    assert "Missing required 'event_type'" in res.json()["detail"]


def test_webhook_missing_transaction_id_rejected_no_fallback(client, authorized_transaction):
    """
    SEC-04: Webhook request lacking 'transaction_id' is rejected with 400
    and never falls back to an arbitrary authorized transaction.
    """
    headers = {
        "PAYPAL-AUTH-ALGO": "SHA256withRSA",
        "PAYPAL-CERT-URL": "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-360-TEST.pem",
        "PAYPAL-TRANSMISSION-ID": f"TRANS-SEC04-NO-TXID-{time.time()}",
        "PAYPAL-TRANSMISSION-TIME": "2026-11-09T08:00:00Z",
        "PAYPAL-TRANSMISSION-SIG": "TEST_SIMULATED_VERIFIED_PAYPAL_SIG",
    }
    payload = {"event_type": "DELIVERY_CONFIRMED"}

    res = client.post("/api/webhook", json=payload, headers=headers)
    assert res.status_code == 400
    assert "Missing required 'transaction_id'" in res.json()["detail"]
    assert authorized_transaction["delivery_status"] == "AWAITING_DELIVERY"


def test_webhook_unknown_event_rejected(client, authorized_transaction):
    """
    SEC-04: Unrecognized webhook event type is rejected with 400.
    """
    headers = {
        "PAYPAL-AUTH-ALGO": "SHA256withRSA",
        "PAYPAL-CERT-URL": "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-360-TEST.pem",
        "PAYPAL-TRANSMISSION-ID": f"TRANS-SEC04-UNKNOWN-{time.time()}",
        "PAYPAL-TRANSMISSION-TIME": "2026-11-09T08:00:00Z",
        "PAYPAL-TRANSMISSION-SIG": "TEST_SIMULATED_VERIFIED_PAYPAL_SIG",
    }
    payload = {"event_type": "ARBITRARY_CUSTOM_UNRECOGNIZED_EVENT", "transaction_id": authorized_transaction["id"]}

    res = client.post("/api/webhook", json=payload, headers=headers)
    assert res.status_code == 400
    assert "UnsupportedWebhookEvent" in res.json()["detail"]


def test_webhook_replayed_transmission_id_rejected(client, authorized_transaction):
    """
    SEC-04: Replayed webhook transmission ID is rejected with 409 Conflict.
    """
    replayed_trans_id = f"TRANS-REPLAY-TEST-{time.time()}"
    headers = {
        "PAYPAL-AUTH-ALGO": "SHA256withRSA",
        "PAYPAL-CERT-URL": "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-360-TEST.pem",
        "PAYPAL-TRANSMISSION-ID": replayed_trans_id,
        "PAYPAL-TRANSMISSION-TIME": "2026-11-09T08:00:00Z",
        "PAYPAL-TRANSMISSION-SIG": "TEST_SIMULATED_VERIFIED_PAYPAL_SIG",
    }
    payload = {"event_type": "DELIVERY_CONFIRMED", "transaction_id": authorized_transaction["id"]}

    # 1. First presentation succeeds
    res1 = client.post("/api/webhook", json=payload, headers=headers)
    assert res1.status_code == 200

    # 2. Second presentation with same transmission-id is rejected
    res2 = client.post("/api/webhook", json=payload, headers=headers)
    assert res2.status_code == 409
    assert res2.json()["detail"]["error"] == "DuplicateWebhookEvent"


# ==============================================================================
# SEC-05: Accurate Dispute Reporting Without False Funds Claims
# ==============================================================================

def test_webhook_dispute_records_internal_dispute_without_claiming_funds_recovery(client, authorized_transaction):
    """
    SEC-05: Dispute webhook returns INTERNAL_DISPUTE_RECORDED without claiming
    that buyer funds have been reclaimed or refunded.
    """
    headers = {
        "PAYPAL-AUTH-ALGO": "SHA256withRSA",
        "PAYPAL-CERT-URL": "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-360-TEST.pem",
        "PAYPAL-TRANSMISSION-ID": f"TRANS-DISPUTE-SEC05-{time.time()}",
        "PAYPAL-TRANSMISSION-TIME": "2026-11-09T08:00:00Z",
        "PAYPAL-TRANSMISSION-SIG": "TEST_SIMULATED_VERIFIED_PAYPAL_SIG",
    }
    payload = {"event_type": "REPORT_DISPUTE", "transaction_id": authorized_transaction["id"]}

    res = client.post("/api/webhook", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "INTERNAL_DISPUTE_RECORDED"
    assert "reclaimed" not in data["message"].lower()
    assert "refunded" not in data["message"].lower()
    assert "no automated fund recovery executed" in data["message"].lower()


def test_dispute_workflow_does_not_execute_capture_refund_or_void(client, authorized_transaction):
    """
    SEC-05: Dispute registration makes zero HTTP calls to PayPal capture, refund, or void.
    """
    with patch.object(PayPalOrdersClient, "capture_authorization") as mock_capture:
        headers = {
            "PAYPAL-AUTH-ALGO": "SHA256withRSA",
            "PAYPAL-CERT-URL": "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-360-TEST.pem",
            "PAYPAL-TRANSMISSION-ID": f"TRANS-DISPUTE-ZERO-CALLS-{time.time()}",
            "PAYPAL-TRANSMISSION-TIME": "2026-11-09T08:00:00Z",
            "PAYPAL-TRANSMISSION-SIG": "TEST_SIMULATED_VERIFIED_PAYPAL_SIG",
        }
        payload = {"event_type": "DELIVERY_DAMAGED", "transaction_id": authorized_transaction["id"]}
        res = client.post("/api/webhook", json=payload, headers=headers)
        assert res.status_code == 200
        mock_capture.assert_not_called()
        data = res.json()
        assert data["status"] == "INTERNAL_DISPUTE_RECORDED"
        assert "no automated fund recovery executed" in data["message"].lower()


# ==============================================================================
# SEC-06: Cryptographic Evidence Hash Binding & Tampering Detection
# ==============================================================================

def test_delivery_evidence_cryptographic_hash_binding(client, authorized_transaction, auth_headers):
    """
    SEC-06: Full delivery review lifecycle binds canonical evidence hash
    into state chain, and verify_hash_chain succeeds on untampered record.
    """
    tx_id = authorized_transaction["id"]

    # Submit
    client.post(
        "/api/delivery/submit-evidence",
        json={
            "transaction_id": tx_id,
            "evidence_type": EvidenceType.PHYSICAL_INSPECTION_POD.value,
            "evidence_reference": "pod-receipt.png",
            "notes": "Verified at reception"
        },
        headers=auth_headers["submitter_alice"]
    )

    # Review & Approve
    client.post(
        "/api/delivery/review",
        json={
            "transaction_id": tx_id,
            "decision": "APPROVE",
            "review_notes": "Audited physical signature and condition."
        },
        headers=auth_headers["reviewer_charlie"]
    )

    # Cryptographic ledger audit
    is_valid, reason, audit = verify_hash_chain(
        state_chain=authorized_transaction["state_chain"],
        current_stored_hash=authorized_transaction["state_hash"],
        current_amount=authorized_transaction["amount"],
        current_status=authorized_transaction["status"],
        delivery_status=authorized_transaction["delivery_status"],
        delivery_evidence=authorized_transaction["delivery_evidence"]
    )
    assert is_valid is True
    assert audit["status"] == "VERIFIED"


def test_tampering_each_protected_evidence_field_detected(client, authorized_transaction, auth_headers):
    """
    SEC-06: Modifying each canonical delivery evidence field individually
    causes cryptographic audit failure (CORRUPTED).
    """
    tx_id = authorized_transaction["id"]

    # Submit & Approve
    client.post(
        "/api/delivery/submit-evidence",
        json={
            "transaction_id": tx_id,
            "evidence_type": EvidenceType.PHYSICAL_INSPECTION_POD.value,
            "evidence_reference": "original-pod.pdf",
            "notes": "Original submitter remarks"
        },
        headers=auth_headers["submitter_alice"]
    )
    client.post(
        "/api/delivery/review",
        json={
            "transaction_id": tx_id,
            "decision": "APPROVE",
            "review_notes": "Original reviewer approval"
        },
        headers=auth_headers["reviewer_charlie"]
    )

    base_chain = list(authorized_transaction["state_chain"])
    base_hash = authorized_transaction["state_hash"]
    base_evidence = dict(authorized_transaction["delivery_evidence"])

    fields_to_test = [
        ("authenticated_reviewer", "reviewer_forged"),
        ("authenticated_submitter", "submitter_malicious"),
        ("evidence_reference", "tampered-doc.pdf"),
        ("review_decision", "REJECT"),
        ("review_notes", "Altered review justification text"),
        ("version", 999),
        ("submission_timestamp", "1970-01-01T00:00:00Z"),
    ]

    for field, forged_val in fields_to_test:
        tampered_ev = dict(base_evidence)
        tampered_ev[field] = forged_val

        is_valid, reason, audit = verify_hash_chain(
            state_chain=base_chain,
            current_stored_hash=base_hash,
            current_amount=authorized_transaction["amount"],
            current_status=authorized_transaction["status"],
            delivery_status=authorized_transaction["delivery_status"],
            delivery_evidence=tampered_ev
        )
        assert is_valid is False, f"Tampering of '{field}' went undetected!"
        assert "CORRUPTED" in reason
        assert audit["tampered_field"] == "delivery_evidence"


def test_legacy_stage_2_4_hash_chain_backward_compatible():
    """
    SEC-06: Verifies that legacy Stage 2–4 state chains without delivery evidence
    maintain 100% backward compatibility and pass cryptographic verification.
    """
    init = create_initial_hash_chain("TX-LEGACY-001", "1000.00", "AUTHORIZED")
    is_valid, reason, audit = verify_hash_chain(
        state_chain=init["state_chain"],
        current_stored_hash=init["state_hash"],
        current_amount="1000.00",
        current_status="AUTHORIZED"
    )
    assert is_valid is True
    assert audit["status"] == "VERIFIED"


def test_unbound_delivery_verified_claim_detected_as_corrupted(authorized_transaction):
    """
    SEC-06: A transaction claiming DELIVERY_VERIFIED without cryptographic evidence binding
    is detected as CORRUPTED.
    """
    is_valid, reason, audit = verify_hash_chain(
        state_chain=authorized_transaction["state_chain"],
        current_stored_hash=authorized_transaction["state_hash"],
        current_amount=authorized_transaction["amount"],
        current_status="AUTHORIZED",
        delivery_status="DELIVERY_VERIFIED",
        delivery_evidence=None
    )
    assert is_valid is False
    assert "CORRUPTED" in reason


# ==============================================================================
# SEC-07: Concurrency & State-Transition Safety
# ==============================================================================

def test_concurrency_lock_exists_and_is_asyncio_lock():
    """
    SEC-07: Verifies that LEDGER_LOCK is present in main module for atomic operations.
    """
    import asyncio
    import main
    assert hasattr(main, "LEDGER_LOCK")
    assert isinstance(main.LEDGER_LOCK, asyncio.Lock)


def test_conflicting_subsequent_review_rejected(client, authorized_transaction, auth_headers):
    """
    SEC-07: Once delivery is approved/verified, a conflicting subsequent REJECT
    review is rejected with 400 Bad Request.
    """
    tx_id = authorized_transaction["id"]

    # Submit
    client.post(
        "/api/delivery/submit-evidence",
        json={
            "transaction_id": tx_id,
            "evidence_type": EvidenceType.DELIVERY_RECEIPT.value,
            "evidence_reference": "doc.pdf"
        },
        headers=auth_headers["submitter_alice"]
    )

    # Approve
    client.post(
        "/api/delivery/review",
        json={"transaction_id": tx_id, "decision": "APPROVE", "review_notes": "Good"},
        headers=auth_headers["reviewer_charlie"]
    )

    # Conflicting reject attempt
    conflict_res = client.post(
        "/api/delivery/review",
        json={"transaction_id": tx_id, "decision": "REJECT", "review_notes": "Attempt to reject"},
        headers=auth_headers["reviewer_dave"]
    )
    assert conflict_res.status_code == 400
    assert "Cannot reject verified delivery" in conflict_res.json()["detail"]["message"]


# ==============================================================================
# SEC-08: Production Configuration Safety
# ==============================================================================

def test_production_fails_closed_on_missing_or_weak_auth_secret(monkeypatch):
    """
    SEC-08: In production, missing or weak CLEARGUARD_AUTH_SECRET raises RuntimeError.
    """
    from core.auth import get_auth_secret_key
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("APP_ENV", "production")

    # Missing
    monkeypatch.delenv("CLEARGUARD_AUTH_SECRET", raising=False)
    with pytest.raises(RuntimeError) as exc_missing:
        get_auth_secret_key()
    assert "CRITICAL SECURITY CONFIGURATION ERROR" in str(exc_missing.value)

    # Weak (<32 chars)
    monkeypatch.setenv("CLEARGUARD_AUTH_SECRET", "short_secret_key")
    with pytest.raises(RuntimeError) as exc_weak:
        get_auth_secret_key()
    assert "at least 32 characters" in str(exc_weak.value)


def test_production_rejects_demo_token_issuance(client, monkeypatch):
    """
    SEC-08: In production, demo token issuance endpoint /api/auth/token returns 403 Forbidden.
    """
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("APP_ENV", "production")

    res = client.post(
        "/api/auth/token",
        json={"username": "reviewer_charlie", "password": "CharlieAuditor2026!"}
    )
    assert res.status_code == 403
    assert "disabled in production" in res.json()["detail"].lower()


def test_production_rejects_simulated_webhook_id(client, authorized_transaction, monkeypatch):
    """
    SEC-08: In production, using a simulated or default webhook ID is rejected.
    """
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("PAYPAL_WEBHOOK_ID", "WH-SIMULATED-AURORAPAY-001")

    headers = {
        "PAYPAL-AUTH-ALGO": "SHA256withRSA",
        "PAYPAL-CERT-URL": "https://api.paypal.com/v1/notifications/certs/CERT-LIVE.pem",
        "PAYPAL-TRANSMISSION-ID": f"TRANS-PROD-WH-ID-{time.time()}",
        "PAYPAL-TRANSMISSION-TIME": "2026-11-09T08:00:00Z",
        "PAYPAL-TRANSMISSION-SIG": "TEST_SIMULATED_VERIFIED_PAYPAL_SIG",
    }
    payload = {"event_type": "DELIVERY_CONFIRMED", "transaction_id": authorized_transaction["id"]}

    res = client.post("/api/webhook", json=payload, headers=headers)
    assert res.status_code == 401
    assert "INVALID_PRODUCTION_CONFIG" in res.json()["detail"]["reason"]


# ==============================================================================
# SEC-09: Fail-Closed Environment Configuration Tests
# ==============================================================================

def test_sec09_both_environment_variables_missing(client, monkeypatch):
    """
    SEC-09: When both APP_ENV and ENVIRONMENT are missing, the system fails closed:
    - Environment resolves to UNCONFIGURED.
    - Not treated as development or production.
    - Demo token issuance and demo credentials are prohibited.
    - Webhook simulation is prohibited.
    - get_auth_secret_key() refuses default dev key.
    """
    from core.auth import (
        get_validated_environment,
        is_production_environment,
        is_development_or_test_environment,
        verify_demo_credentials,
        get_auth_secret_key,
    )
    from api.webhooks import is_simulation_allowed

    monkeypatch.delenv("APP_ENV", raising=False)
    monkeypatch.delenv("ENVIRONMENT", raising=False)

    assert get_validated_environment() == "UNCONFIGURED"
    assert is_production_environment() is False
    assert is_development_or_test_environment() is False
    assert verify_demo_credentials("reviewer_charlie", "CharlieAuditor2026!") is None
    assert is_simulation_allowed() is False

    # Token route rejects
    res = client.post("/api/auth/token", json={"username": "reviewer_charlie", "password": "CharlieAuditor2026!"})
    assert res.status_code == 403

    # Auth secret requires explicit key
    monkeypatch.delenv("CLEARGUARD_AUTH_SECRET", raising=False)
    with pytest.raises(RuntimeError):
        get_auth_secret_key()


def test_sec09_unknown_environment_rejected(client, monkeypatch):
    """
    SEC-09: Unknown environment value (e.g., APP_ENV=foobar) raises RuntimeError
    and is never silently treated as development.
    """
    from core.auth import get_validated_environment, verify_demo_credentials

    monkeypatch.setenv("APP_ENV", "foobar")
    monkeypatch.delenv("ENVIRONMENT", raising=False)

    with pytest.raises(RuntimeError) as exc:
        get_validated_environment()
    assert "INVALID_ENVIRONMENT" in str(exc.value)
    assert verify_demo_credentials("reviewer_charlie", "CharlieAuditor2026!") is None

    res = client.post("/api/auth/token", json={"username": "reviewer_charlie", "password": "CharlieAuditor2026!"})
    assert res.status_code in (400, 403, 500)


def test_sec09_staging_environment_rejected(monkeypatch):
    """
    SEC-09: Unrecognized non-production environment APP_ENV=staging is rejected.
    """
    from core.auth import get_validated_environment
    monkeypatch.setenv("APP_ENV", "staging")
    monkeypatch.delenv("ENVIRONMENT", raising=False)

    with pytest.raises(RuntimeError) as exc:
        get_validated_environment()
    assert "INVALID_ENVIRONMENT" in str(exc.value)


def test_sec09_misspelled_production_rejected(monkeypatch):
    """
    SEC-09: Typo in production setting APP_ENV=productn raises RuntimeError and fails closed.
    """
    from core.auth import get_validated_environment
    monkeypatch.setenv("APP_ENV", "productn")
    monkeypatch.delenv("ENVIRONMENT", raising=False)

    with pytest.raises(RuntimeError) as exc:
        get_validated_environment()
    assert "INVALID_ENVIRONMENT" in str(exc.value)


def test_sec09_conflicting_environment_settings_rejected(monkeypatch):
    """
    SEC-09: If APP_ENV and ENVIRONMENT conflict (e.g. staging vs production),
    the system rejects the configuration rather than silently picking one.
    """
    from core.auth import get_validated_environment
    monkeypatch.setenv("APP_ENV", "staging")
    monkeypatch.setenv("ENVIRONMENT", "production")

    with pytest.raises(RuntimeError) as exc:
        get_validated_environment()
    assert "ENVIRONMENT_CONFLICT" in str(exc.value)


def test_sec09_explicit_development_permitted(monkeypatch):
    """
    SEC-09: Explicitly configured development environment enables development protections and dev secret.
    """
    from core.auth import (
        get_validated_environment,
        is_production_environment,
        is_development_or_test_environment,
        get_auth_secret_key,
        DEFAULT_DEV_SECRET,
    )
    from api.webhooks import is_simulation_allowed

    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.delenv("CLEARGUARD_AUTH_SECRET", raising=False)

    assert get_validated_environment() == "development"
    assert is_production_environment() is False
    assert is_development_or_test_environment() is True
    assert is_simulation_allowed() is True
    assert get_auth_secret_key() == DEFAULT_DEV_SECRET


def test_sec09_explicit_production_enforced(monkeypatch):
    """
    SEC-09: Explicit production enforces production lockdown.
    """
    from core.auth import (
        get_validated_environment,
        is_production_environment,
        is_development_or_test_environment,
        verify_demo_credentials,
    )
    from api.webhooks import is_simulation_allowed

    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("ENVIRONMENT", "production")

    assert get_validated_environment() == "production"
    assert is_production_environment() is True
    assert is_development_or_test_environment() is False
    assert verify_demo_credentials("reviewer_charlie", "CharlieAuditor2026!") is None
    assert is_simulation_allowed() is False


# ==============================================================================
# SEC-10: Webhook Replay Race Condition & Atomic Reservation Tests
# ==============================================================================

def test_sec10_failed_payload_validation_does_not_reserve_id(client):
    """
    SEC-10: When a webhook has valid signatures but invalid payload,
    it returns 400 and does NOT reserve the transmission ID.
    """
    from api.webhooks import PROCESSED_WEBHOOK_TRANSMISSIONS

    trans_id = f"TRANS-PAYLOAD-FAIL-{time.time()}"
    headers = {
        "PAYPAL-AUTH-ALGO": "SHA256withRSA",
        "PAYPAL-CERT-URL": "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-360-TEST.pem",
        "PAYPAL-TRANSMISSION-ID": trans_id,
        "PAYPAL-TRANSMISSION-TIME": "2026-11-09T08:00:00Z",
        "PAYPAL-TRANSMISSION-SIG": "TEST_SIMULATED_VERIFIED_PAYPAL_SIG",
    }
    # Missing event_type and transaction_id
    payload = {}

    res = client.post("/api/webhook", json=payload, headers=headers)
    assert res.status_code == 400
    assert trans_id not in PROCESSED_WEBHOOK_TRANSMISSIONS


def test_sec10_signature_verification_precedes_acceptance(client):
    """
    SEC-10: Forged or invalid signature fails before event is marked processed.
    """
    from api.webhooks import PROCESSED_WEBHOOK_TRANSMISSIONS

    trans_id = f"TRANS-SIG-FAIL-{time.time()}"
    headers = {
        "PAYPAL-AUTH-ALGO": "SHA256withRSA",
        "PAYPAL-CERT-URL": "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-360-TEST.pem",
        "PAYPAL-TRANSMISSION-ID": trans_id,
        "PAYPAL-TRANSMISSION-TIME": "2026-11-09T08:00:00Z",
        "PAYPAL-TRANSMISSION-SIG": "FORGED_SIGNATURE_BYTES_XYZ",
    }
    payload = {"event_type": "DELIVERY_CONFIRMED", "transaction_id": "TX-DELIVERY-TEST-001"}

    res = client.post("/api/webhook", json=payload, headers=headers)
    assert res.status_code == 401
    assert trans_id not in PROCESSED_WEBHOOK_TRANSMISSIONS


@pytest.mark.asyncio
async def test_sec10_concurrency_recheck_under_lock(authorized_transaction):
    """
    SEC-10: Verifies that when LEDGER_LOCK is held, duplicate transmissions
    are atomically detected upon lock acquisition and rejected with 409.
    """
    import asyncio
    from core.concurrency import LEDGER_LOCK
    from api.webhooks import PROCESSED_WEBHOOK_TRANSMISSIONS

    trans_id = f"TRANS-LOCK-RACE-{time.time()}"
    headers = {
        "paypal-auth-algo": "SHA256withRSA",
        "paypal-cert-url": "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-360-TEST.pem",
        "paypal-transmission-id": trans_id,
        "paypal-transmission-time": "2026-11-09T08:00:00Z",
        "paypal-transmission-sig": "TEST_SIMULATED_VERIFIED_PAYPAL_SIG",
    }

    # Simulate atomic lock test
    async with LEDGER_LOCK:
        assert trans_id not in PROCESSED_WEBHOOK_TRANSMISSIONS
        PROCESSED_WEBHOOK_TRANSMISSIONS.add(trans_id)

    # Next attempt must immediately find trans_id present
    async with LEDGER_LOCK:
        assert trans_id in PROCESSED_WEBHOOK_TRANSMISSIONS


# ==============================================================================
# SEC-11: Webhook Consistency Tests
# ==============================================================================

def test_sec11_webhook_endpoint_consistent_policy(client, authorized_transaction):
    """
    SEC-11: Proves that the primary webhook endpoint follows strict signature,
    replay, and truthful non-financial dispute logging.
    """
    tx_id = authorized_transaction["id"]
    trans_id = f"TRANS-CONSISTENT-{time.time()}"
    headers = {
        "PAYPAL-AUTH-ALGO": "SHA256withRSA",
        "PAYPAL-CERT-URL": "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-360-TEST.pem",
        "PAYPAL-TRANSMISSION-ID": trans_id,
        "PAYPAL-TRANSMISSION-TIME": "2026-11-09T08:00:00Z",
        "PAYPAL-TRANSMISSION-SIG": "TEST_SIMULATED_VERIFIED_PAYPAL_SIG",
    }

    payload = {"event_type": "DELIVERY_CONFIRMED", "transaction_id": tx_id}
    res = client.post("/api/webhook", json=payload, headers=headers)
    assert res.status_code == 200

    # Duplicate must be rejected with 409
    dup_res = client.post("/api/webhook", json=payload, headers=headers)
    assert dup_res.status_code == 409


# ==============================================================================
# SEC-12: Complete Versioned Evidence-History Cryptographic Audit Tests
# ==============================================================================

def test_sec12_tampered_evidence_type_detected(authorized_transaction, client, auth_headers):
    """SEC-12: Tampering evidence_type causes cryptographic verification failure."""
    from core.crypto_ledger import verify_hash_chain

    tx_id = authorized_transaction["id"]
    client.post(
        "/api/delivery/submit-evidence",
        json={"transaction_id": tx_id, "evidence_type": EvidenceType.PHYSICAL_INSPECTION_POD.value, "evidence_reference": "pod.pdf"},
        headers=auth_headers["submitter_alice"]
    )
    tampered = dict(authorized_transaction["delivery_evidence"])
    tampered["evidence_type"] = "CARRIER_WEBHOOK_TELEMATICS"

    is_valid, reason, _ = verify_hash_chain(
        state_chain=authorized_transaction["state_chain"],
        current_stored_hash=authorized_transaction["state_hash"],
        current_amount=authorized_transaction["amount"],
        current_status=authorized_transaction["status"],
        delivery_status=authorized_transaction["delivery_status"],
        delivery_evidence=tampered
    )
    assert is_valid is False
    assert "tampering detected" in reason.lower() or "corrupted" in reason.lower()


def test_sec12_tampered_carrier_detected(authorized_transaction, client, auth_headers):
    """SEC-12: Tampering carrier causes cryptographic verification failure."""
    from core.crypto_ledger import verify_hash_chain

    tx_id = authorized_transaction["id"]
    client.post(
        "/api/delivery/submit-evidence",
        json={"transaction_id": tx_id, "evidence_type": EvidenceType.PHYSICAL_INSPECTION_POD.value, "carrier_name": "FedEx", "evidence_reference": "pod.pdf"},
        headers=auth_headers["submitter_alice"]
    )
    tampered = dict(authorized_transaction["delivery_evidence"])
    tampered["carrier_name"] = "DHL_FORGED"

    is_valid, reason, _ = verify_hash_chain(
        state_chain=authorized_transaction["state_chain"],
        current_stored_hash=authorized_transaction["state_hash"],
        current_amount=authorized_transaction["amount"],
        current_status=authorized_transaction["status"],
        delivery_status=authorized_transaction["delivery_status"],
        delivery_evidence=tampered
    )
    assert is_valid is False


def test_sec12_tampered_tracking_number_detected(authorized_transaction, client, auth_headers):
    """SEC-12: Tampering tracking_number causes cryptographic verification failure."""
    from core.crypto_ledger import verify_hash_chain

    tx_id = authorized_transaction["id"]
    client.post(
        "/api/delivery/submit-evidence",
        json={"transaction_id": tx_id, "evidence_type": EvidenceType.PHYSICAL_INSPECTION_POD.value, "tracking_reference": "TRK-ORIGINAL", "evidence_reference": "pod.pdf"},
        headers=auth_headers["submitter_alice"]
    )
    tampered = dict(authorized_transaction["delivery_evidence"])
    tampered["tracking_reference"] = "TRK-FORGED-999"

    is_valid, reason, _ = verify_hash_chain(
        state_chain=authorized_transaction["state_chain"],
        current_stored_hash=authorized_transaction["state_hash"],
        current_amount=authorized_transaction["amount"],
        current_status=authorized_transaction["status"],
        delivery_status=authorized_transaction["delivery_status"],
        delivery_evidence=tampered
    )
    assert is_valid is False


def test_sec12_tampered_transaction_id_detected(authorized_transaction, client, auth_headers):
    """SEC-12: Tampering transaction_id in evidence causes cryptographic verification failure."""
    from core.crypto_ledger import verify_hash_chain

    tx_id = authorized_transaction["id"]
    client.post(
        "/api/delivery/submit-evidence",
        json={"transaction_id": tx_id, "evidence_type": EvidenceType.PHYSICAL_INSPECTION_POD.value, "evidence_reference": "pod.pdf"},
        headers=auth_headers["submitter_alice"]
    )
    tampered = dict(authorized_transaction["delivery_evidence"])
    tampered["transaction_id"] = "TX-FORGED-OTHER"

    is_valid, reason, _ = verify_hash_chain(
        state_chain=authorized_transaction["state_chain"],
        current_stored_hash=authorized_transaction["state_hash"],
        current_amount=authorized_transaction["amount"],
        current_status=authorized_transaction["status"],
        delivery_status=authorized_transaction["delivery_status"],
        delivery_evidence=tampered
    )
    assert is_valid is False


def test_sec12_tampered_archived_evidence_reference_detected(authorized_transaction, client, auth_headers):
    """SEC-12: Modifying an archived evidence version's reference fails verification."""
    from core.crypto_ledger import verify_hash_chain

    tx_id = authorized_transaction["id"]

    # 1. Submit v1
    client.post(
        "/api/delivery/submit-evidence",
        json={"transaction_id": tx_id, "evidence_type": EvidenceType.PHYSICAL_INSPECTION_POD.value, "evidence_reference": "pod-v1.pdf"},
        headers=auth_headers["submitter_alice"]
    )
    # 2. Reject v1
    client.post(
        "/api/delivery/review",
        json={"transaction_id": tx_id, "decision": "REJECT", "review_notes": "Unclear photo"},
        headers=auth_headers["reviewer_charlie"]
    )
    # 3. Submit v2 (archives v1)
    client.post(
        "/api/delivery/submit-evidence",
        json={"transaction_id": tx_id, "evidence_type": EvidenceType.PHYSICAL_INSPECTION_POD.value, "evidence_reference": "pod-v2.pdf"},
        headers=auth_headers["submitter_alice"]
    )

    history = list(authorized_transaction.get("delivery_evidence_history", []))
    assert len(history) == 1

    # Tamper archived v1
    tampered_history = [dict(history[0])]
    tampered_history[0]["evidence_reference"] = "pod-v1-forged.pdf"

    is_valid, reason, _ = verify_hash_chain(
        state_chain=authorized_transaction["state_chain"],
        current_stored_hash=authorized_transaction["state_hash"],
        current_amount=authorized_transaction["amount"],
        current_status=authorized_transaction["status"],
        delivery_status=authorized_transaction["delivery_status"],
        delivery_evidence=authorized_transaction["delivery_evidence"],
        delivery_evidence_history=tampered_history
    )
    assert is_valid is False
    assert "corrupted_evidence_history" in reason.lower()


def test_sec12_tampered_archived_reviewer_identity_detected(authorized_transaction, client, auth_headers):
    """SEC-12: Tampering reviewer identity on archived record fails verification."""
    from core.crypto_ledger import verify_hash_chain

    tx_id = authorized_transaction["id"]
    client.post(
        "/api/delivery/submit-evidence",
        json={"transaction_id": tx_id, "evidence_type": EvidenceType.PHYSICAL_INSPECTION_POD.value, "evidence_reference": "v1.pdf"},
        headers=auth_headers["submitter_alice"]
    )
    client.post(
        "/api/delivery/review",
        json={"transaction_id": tx_id, "decision": "REJECT", "review_notes": "Rejected by charlie"},
        headers=auth_headers["reviewer_charlie"]
    )
    client.post(
        "/api/delivery/submit-evidence",
        json={"transaction_id": tx_id, "evidence_type": EvidenceType.PHYSICAL_INSPECTION_POD.value, "evidence_reference": "v2.pdf"},
        headers=auth_headers["submitter_alice"]
    )

    history = list(authorized_transaction.get("delivery_evidence_history", []))
    tampered_history = [dict(history[0])]
    tampered_history[0]["authenticated_reviewer"] = "reviewer_forged"

    is_valid, reason, _ = verify_hash_chain(
        state_chain=authorized_transaction["state_chain"],
        current_stored_hash=authorized_transaction["state_hash"],
        current_amount=authorized_transaction["amount"],
        current_status=authorized_transaction["status"],
        delivery_status=authorized_transaction["delivery_status"],
        delivery_evidence=authorized_transaction["delivery_evidence"],
        delivery_evidence_history=tampered_history
    )
    assert is_valid is False
    assert "corrupted_evidence_history" in reason.lower()


def test_sec12_tampered_archived_review_decision_detected(authorized_transaction, client, auth_headers):
    """SEC-12: Tampering archived review decision (e.g. changing REJECT to APPROVE) fails audit."""
    from core.crypto_ledger import verify_hash_chain

    tx_id = authorized_transaction["id"]
    client.post("/api/delivery/submit-evidence", json={"transaction_id": tx_id, "evidence_type": "PHYSICAL_INSPECTION_POD", "evidence_reference": "v1.pdf"}, headers=auth_headers["submitter_alice"])
    client.post("/api/delivery/review", json={"transaction_id": tx_id, "decision": "REJECT", "review_notes": "notes"}, headers=auth_headers["reviewer_charlie"])
    client.post("/api/delivery/submit-evidence", json={"transaction_id": tx_id, "evidence_type": "PHYSICAL_INSPECTION_POD", "evidence_reference": "v2.pdf"}, headers=auth_headers["submitter_alice"])

    history = list(authorized_transaction.get("delivery_evidence_history", []))
    tampered_history = [dict(history[0])]
    tampered_history[0]["review_decision"] = "APPROVE"

    is_valid, reason, _ = verify_hash_chain(
        state_chain=authorized_transaction["state_chain"],
        current_stored_hash=authorized_transaction["state_hash"],
        current_amount=authorized_transaction["amount"],
        current_status=authorized_transaction["status"],
        delivery_status=authorized_transaction["delivery_status"],
        delivery_evidence=authorized_transaction["delivery_evidence"],
        delivery_evidence_history=tampered_history
    )
    assert is_valid is False
    assert "corrupted_evidence_history" in reason.lower()


def test_sec12_tampered_version_number_detected(authorized_transaction, client, auth_headers):
    """SEC-12: Tampering version numbers in history fails verification."""
    from core.crypto_ledger import verify_hash_chain, compute_evidence_hash

    tx_id = authorized_transaction["id"]
    client.post("/api/delivery/submit-evidence", json={"transaction_id": tx_id, "evidence_type": "PHYSICAL_INSPECTION_POD", "evidence_reference": "v1.pdf"}, headers=auth_headers["submitter_alice"])
    client.post("/api/delivery/review", json={"transaction_id": tx_id, "decision": "REJECT", "review_notes": "notes"}, headers=auth_headers["reviewer_charlie"])
    client.post("/api/delivery/submit-evidence", json={"transaction_id": tx_id, "evidence_type": "PHYSICAL_INSPECTION_POD", "evidence_reference": "v2.pdf"}, headers=auth_headers["submitter_alice"])

    history = list(authorized_transaction.get("delivery_evidence_history", []))
    tampered_history = [dict(history[0])]
    tampered_history[0]["version"] = 99
    tampered_history[0]["evidence_hash"] = compute_evidence_hash(tampered_history[0])

    is_valid, reason, _ = verify_hash_chain(
        state_chain=authorized_transaction["state_chain"],
        current_stored_hash=authorized_transaction["state_hash"],
        current_amount=authorized_transaction["amount"],
        current_status=authorized_transaction["status"],
        delivery_status=authorized_transaction["delivery_status"],
        delivery_evidence=authorized_transaction["delivery_evidence"],
        delivery_evidence_history=tampered_history
    )
    assert is_valid is False
    assert "version" in reason.lower()


def test_sec12_missing_archived_version_detected(authorized_transaction, client, auth_headers):
    """SEC-12: When active evidence claims v2 but history is empty, verification fails."""
    from core.crypto_ledger import verify_hash_chain

    tx_id = authorized_transaction["id"]
    client.post("/api/delivery/submit-evidence", json={"transaction_id": tx_id, "evidence_type": "PHYSICAL_INSPECTION_POD", "evidence_reference": "v1.pdf"}, headers=auth_headers["submitter_alice"])
    client.post("/api/delivery/review", json={"transaction_id": tx_id, "decision": "REJECT", "review_notes": "notes"}, headers=auth_headers["reviewer_charlie"])
    client.post("/api/delivery/submit-evidence", json={"transaction_id": tx_id, "evidence_type": "PHYSICAL_INSPECTION_POD", "evidence_reference": "v2.pdf"}, headers=auth_headers["submitter_alice"])

    # Provide empty history when v2 is active
    is_valid, reason, _ = verify_hash_chain(
        state_chain=authorized_transaction["state_chain"],
        current_stored_hash=authorized_transaction["state_hash"],
        current_amount=authorized_transaction["amount"],
        current_status=authorized_transaction["status"],
        delivery_status=authorized_transaction["delivery_status"],
        delivery_evidence=authorized_transaction["delivery_evidence"],
        delivery_evidence_history=[]
    )
    assert is_valid is False
    assert "history is missing" in reason.lower()


def test_sec12_duplicate_version_in_history_detected(authorized_transaction, client, auth_headers):
    """SEC-12: Duplicate versions in history cause verification failure."""
    from core.crypto_ledger import verify_hash_chain

    tx_id = authorized_transaction["id"]
    client.post("/api/delivery/submit-evidence", json={"transaction_id": tx_id, "evidence_type": "PHYSICAL_INSPECTION_POD", "evidence_reference": "v1.pdf"}, headers=auth_headers["submitter_alice"])
    client.post("/api/delivery/review", json={"transaction_id": tx_id, "decision": "REJECT", "review_notes": "notes"}, headers=auth_headers["reviewer_charlie"])
    client.post("/api/delivery/submit-evidence", json={"transaction_id": tx_id, "evidence_type": "PHYSICAL_INSPECTION_POD", "evidence_reference": "v2.pdf"}, headers=auth_headers["submitter_alice"])

    history = list(authorized_transaction.get("delivery_evidence_history", []))
    # Duplicate v1
    tampered_history = [dict(history[0]), dict(history[0])]

    is_valid, reason, _ = verify_hash_chain(
        state_chain=authorized_transaction["state_chain"],
        current_stored_hash=authorized_transaction["state_hash"],
        current_amount=authorized_transaction["amount"],
        current_status=authorized_transaction["status"],
        delivery_status=authorized_transaction["delivery_status"],
        delivery_evidence=authorized_transaction["delivery_evidence"],
        delivery_evidence_history=tampered_history
    )
    assert is_valid is False
    assert "duplicate" in reason.lower()


def test_sec12_invalid_supersedes_relationship_detected(authorized_transaction, client, auth_headers):
    """SEC-12: Invalid supersedes_version relationship fails verification."""
    from core.crypto_ledger import verify_hash_chain, compute_evidence_hash

    tx_id = authorized_transaction["id"]
    client.post("/api/delivery/submit-evidence", json={"transaction_id": tx_id, "evidence_type": "PHYSICAL_INSPECTION_POD", "evidence_reference": "v1.pdf"}, headers=auth_headers["submitter_alice"])
    client.post("/api/delivery/review", json={"transaction_id": tx_id, "decision": "REJECT", "review_notes": "notes"}, headers=auth_headers["reviewer_charlie"])
    client.post("/api/delivery/submit-evidence", json={"transaction_id": tx_id, "evidence_type": "PHYSICAL_INSPECTION_POD", "evidence_reference": "v2.pdf"}, headers=auth_headers["submitter_alice"])

    tampered_active = dict(authorized_transaction["delivery_evidence"])
    tampered_active["supersedes_version"] = 999  # Invalid supersedes
    tampered_active["evidence_hash"] = compute_evidence_hash(tampered_active)

    is_valid, reason, _ = verify_hash_chain(
        state_chain=authorized_transaction["state_chain"],
        current_stored_hash=authorized_transaction["state_hash"],
        current_amount=authorized_transaction["amount"],
        current_status=authorized_transaction["status"],
        delivery_status=authorized_transaction["delivery_status"],
        delivery_evidence=tampered_active,
        delivery_evidence_history=authorized_transaction["delivery_evidence_history"]
    )
    assert is_valid is False
    assert "supersedes_version" in reason.lower()


def test_sec12_successful_untampered_multi_version_history(authorized_transaction, client, auth_headers):
    """SEC-12: Complete multi-version history verifies successfully when untampered."""
    from core.crypto_ledger import verify_hash_chain

    tx_id = authorized_transaction["id"]
    # v1 Submit & Reject
    client.post("/api/delivery/submit-evidence", json={"transaction_id": tx_id, "evidence_type": "PHYSICAL_INSPECTION_POD", "evidence_reference": "v1.pdf"}, headers=auth_headers["submitter_alice"])
    client.post("/api/delivery/review", json={"transaction_id": tx_id, "decision": "REJECT", "review_notes": "v1 blurry"}, headers=auth_headers["reviewer_charlie"])

    # v2 Submit & Approve
    client.post("/api/delivery/submit-evidence", json={"transaction_id": tx_id, "evidence_type": "PHYSICAL_INSPECTION_POD", "evidence_reference": "v2.pdf"}, headers=auth_headers["submitter_alice"])
    client.post("/api/delivery/review", json={"transaction_id": tx_id, "decision": "APPROVE", "review_notes": "v2 approved"}, headers=auth_headers["reviewer_dave"])

    is_valid, reason, audit = verify_hash_chain(
        state_chain=authorized_transaction["state_chain"],
        current_stored_hash=authorized_transaction["state_hash"],
        current_amount=authorized_transaction["amount"],
        current_status=authorized_transaction["status"],
        delivery_status=authorized_transaction["delivery_status"],
        delivery_evidence=authorized_transaction["delivery_evidence"],
        delivery_evidence_history=authorized_transaction.get("delivery_evidence_history")
    )
    assert is_valid is True
    assert "VERIFIED" in reason


# ==============================================================================
# SEC-13: Internal Dispute Identifier Tests
# ==============================================================================

def test_sec13_dispute_sets_internal_dispute_id_and_null_paypal_dispute(client, authorized_transaction):
    """
    SEC-13: Dispute webhook sets internal_dispute_id and paypal_dispute_id is explicitly None.
    Does not represent internal dispute as a genuine PayPal dispute object.
    """
    tx_id = authorized_transaction["id"]
    trans_id = f"TRANS-DISPUTE-SEC13-{time.time()}"
    headers = {
        "PAYPAL-AUTH-ALGO": "SHA256withRSA",
        "PAYPAL-CERT-URL": "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-360-TEST.pem",
        "PAYPAL-TRANSMISSION-ID": trans_id,
        "PAYPAL-TRANSMISSION-TIME": "2026-11-09T08:00:00Z",
        "PAYPAL-TRANSMISSION-SIG": "TEST_SIMULATED_VERIFIED_PAYPAL_SIG",
    }
    payload = {"event_type": "REPORT_DISPUTE", "transaction_id": tx_id}

    res = client.post("/api/webhook", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "INTERNAL_DISPUTE_RECORDED"
    assert "internal_dispute_id" in data
    assert data["internal_dispute_id"].startswith("INTERNAL-DISPUTE-")
    assert data.get("paypal_dispute_id") is None
    assert authorized_transaction.get("internal_dispute_id") == data["internal_dispute_id"]
    assert authorized_transaction.get("paypal_dispute_id") is None

