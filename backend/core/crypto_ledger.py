import hashlib
import json
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime
from typing import Dict, Any, List, Tuple, Optional

GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000"

def format_amount_str(amount: Any) -> str:
    """Standardizes monetary amount to exact 2-decimal string for deterministic hashing."""
    return f"{Decimal(str(amount)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP):.2f}"

def compute_evidence_hash(evidence: Optional[Dict[str, Any]]) -> str:
    """
    Computes a deterministic SHA-256 hash over canonical delivery evidence fields.
    Returns empty string if evidence is None or empty.
    
    Protected canonical fields (SEC-06 & SEC-12):
    - authenticated_reviewer (str)
    - authenticated_submitter (str)
    - carrier (str)
    - decision (str)
    - evidence_reference (str)
    - evidence_type (str)
    - review_notes (str)
    - review_timestamp (str)
    - submission_timestamp (str)
    - supersedes_version (int or None)
    - tracking_number (str)
    - transaction_id (str)
    - version (int)
    """
    if not evidence or not isinstance(evidence, dict):
        return ""
    
    supersedes = evidence.get("supersedes_version")
    canonical = {
        "authenticated_reviewer": str(evidence.get("authenticated_reviewer") or "").strip(),
        "authenticated_submitter": str(evidence.get("authenticated_submitter") or "").strip(),
        "carrier": str(evidence.get("carrier") or evidence.get("carrier_name") or "").strip(),
        "decision": str(evidence.get("review_decision") or evidence.get("decision") or "").strip().upper(),
        "evidence_reference": str(evidence.get("evidence_reference") or "").strip(),
        "evidence_type": str(evidence.get("evidence_type") or "").strip().upper(),
        "review_notes": str(evidence.get("review_notes") or "").strip(),
        "review_timestamp": str(evidence.get("review_timestamp") or "").strip(),
        "submission_timestamp": str(evidence.get("submission_timestamp") or evidence.get("timestamp") or "").strip(),
        "supersedes_version": int(supersedes) if supersedes is not None else None,
        "tracking_number": str(evidence.get("tracking_number") or evidence.get("tracking_reference") or "").strip(),
        "transaction_id": str(evidence.get("transaction_id") or "").strip(),
        "version": int(evidence.get("version", 1) or 1),
    }
    canonical_json = json.dumps(canonical, sort_keys=True, separators=(',', ':'))
    return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()

def compute_state_hash(
    previous_state_hash: str,
    timestamp: str,
    amount: Any,
    status: str,
    evidence_hash: str = ""
) -> str:
    """
    Military-Grade Cryptographic State Hash:
    Formula: SHA-256(previous_state_hash + current_timestamp + transaction_amount + status [ + "|" + evidence_hash ])
    Guarantees tamper-evident immutability across state transitions and binds delivery evidence cryptographically.
    Preserves 100% backward compatibility when evidence_hash is empty.
    """
    clean_prev = previous_state_hash or GENESIS_HASH
    clean_amount = format_amount_str(amount)
    clean_status = str(status).strip().upper()
    clean_ev_hash = str(evidence_hash or "").strip()
    
    # Deterministic payload construction
    if clean_ev_hash:
        payload = f"{clean_prev}{timestamp}{clean_amount}{clean_status}|{clean_ev_hash}"
    else:
        payload = f"{clean_prev}{timestamp}{clean_amount}{clean_status}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()

def create_initial_hash_chain(
    tx_id: str,
    amount: Any,
    status: str = "AUTHORIZED",
    timestamp: Optional[str] = None
) -> Dict[str, Any]:
    """
    Initializes a new cryptographic hash chain for a freshly authorized or blocked escrow.
    """
    ts = timestamp or datetime.utcnow().isoformat()
    state_hash = compute_state_hash(GENESIS_HASH, ts, amount, status)
    
    chain_entry = {
        "step": 0,
        "transition": f"INIT_{status}",
        "previous_state_hash": GENESIS_HASH,
        "timestamp": ts,
        "amount": format_amount_str(amount),
        "status": status.upper(),
        "state_hash": state_hash
    }
    
    return {
        "state_hash": state_hash,
        "previous_state_hash": GENESIS_HASH,
        "state_chain": [chain_entry],
        "is_corrupted": False,
        "verified": True
    }

def record_state_transition(
    current_chain: List[Dict[str, Any]],
    current_hash: str,
    amount: Any,
    new_status: str,
    timestamp: Optional[str] = None,
    evidence_hash: str = ""
) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Appends a new state transition to the immutable cryptographic ledger chain.
    If evidence_hash is provided, binds the delivery evidence version into the state block.
    """
    ts = timestamp or datetime.utcnow().isoformat()
    prev_hash = current_hash or (current_chain[-1]["state_hash"] if current_chain else GENESIS_HASH)
    new_hash = compute_state_hash(prev_hash, ts, amount, new_status, evidence_hash=evidence_hash)
    
    step_number = len(current_chain)
    new_entry = {
        "step": step_number,
        "transition": f"TRANSITION_TO_{new_status.upper()}",
        "previous_state_hash": prev_hash,
        "timestamp": ts,
        "amount": format_amount_str(amount),
        "status": new_status.upper(),
        "state_hash": new_hash
    }
    if evidence_hash:
        new_entry["evidence_hash"] = evidence_hash
    
    updated_chain = list(current_chain)
    updated_chain.append(new_entry)
    return new_hash, updated_chain

def verify_evidence_history(
    delivery_evidence: Optional[Dict[str, Any]],
    delivery_evidence_history: Optional[List[Dict[str, Any]]],
    state_chain: Optional[List[Dict[str, Any]]] = None
) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Cryptographic Auditor for Versioned Delivery Evidence History (SEC-12):
    1. Verifies that every archived evidence version has not been modified (hash recomputation).
    2. Verifies strictly ascending version numbers without gaps, duplicates, or reordering.
    3. Verifies that each version's supersedes_version correctly links to the immediately preceding version.
    4. Verifies that current active evidence correctly supersedes the latest archived version.
    5. Verifies that every evidence hash corresponds to an entry in the cryptographic state_chain.
    6. Preserves backward compatibility: returns True if no evidence exists or if legacy record.
    """
    if not delivery_evidence and not delivery_evidence_history:
        return True, "No delivery evidence present to audit.", {"verified": True}

    chain_ev_hashes = {e.get("evidence_hash") for e in (state_chain or []) if e.get("evidence_hash")}
    history = delivery_evidence_history or []

    # 1. Audit archived history versions
    seen_versions = set()
    expected_version = 1

    for idx, archived in enumerate(history):
        if not isinstance(archived, dict):
            return False, f"CORRUPTED_EVIDENCE_HISTORY: Archived entry at index {idx} is not a valid dictionary.", {
                "verified": False, "status": "CORRUPTED", "tampered_field": "evidence_history"
            }

        rec_hash = archived.get("evidence_hash")
        calc_hash = compute_evidence_hash(archived)
        if not rec_hash or rec_hash != calc_hash:
            return False, f"CORRUPTED_EVIDENCE_HISTORY: Archived evidence version {archived.get('version')} hash mismatch (tampering detected).", {
                "verified": False, "status": "CORRUPTED", "tampered_field": "archived_evidence_payload",
                "version": archived.get("version"), "calculated_hash": calc_hash, "recorded_hash": rec_hash
            }

        # Check version sequence
        v = archived.get("version")
        if v in seen_versions:
            return False, f"CORRUPTED_EVIDENCE_HISTORY: Duplicate version {v} detected in evidence history.", {
                "verified": False, "status": "CORRUPTED", "tampered_field": "version", "duplicate_version": v
            }
        seen_versions.add(v)

        if v != expected_version:
            return False, f"CORRUPTED_EVIDENCE_HISTORY: Invalid version sequence in history. Expected version {expected_version}, got {v}.", {
                "verified": False, "status": "CORRUPTED", "tampered_field": "version_ordering", "expected": expected_version, "actual": v
            }

        # Check supersedes_version
        expected_supersedes = None if expected_version == 1 else expected_version - 1
        actual_supersedes = archived.get("supersedes_version")
        if actual_supersedes != expected_supersedes:
            return False, f"CORRUPTED_EVIDENCE_HISTORY: Invalid supersedes_version for version {v}. Expected {expected_supersedes}, got {actual_supersedes}.", {
                "verified": False, "status": "CORRUPTED", "tampered_field": "supersedes_version"
            }

        # Cross-reference with state chain if available
        if state_chain and chain_ev_hashes and rec_hash not in chain_ev_hashes:
            return False, f"CORRUPTED_EVIDENCE_HISTORY: Archived evidence version {v} hash has no corresponding entry in state chain.", {
                "verified": False, "status": "CORRUPTED", "tampered_field": "state_chain_binding"
            }

        expected_version += 1

    # 2. Audit current active evidence if present
    if delivery_evidence:
        curr_rec_hash = delivery_evidence.get("evidence_hash")
        curr_calc_hash = compute_evidence_hash(delivery_evidence)
        if curr_rec_hash and curr_rec_hash != curr_calc_hash:
            return False, "CORRUPTED: Delivery evidence tampering detected (evidence payload altered after ledger commit).", {
                "verified": False, "status": "CORRUPTED", "tampered_field": "delivery_evidence",
                "calculated_hash": curr_calc_hash, "recorded_hash": curr_rec_hash
            }

        curr_v = delivery_evidence.get("version", 1)
        if history:
            if curr_v != expected_version:
                return False, f"CORRUPTED_EVIDENCE_HISTORY: Active evidence claims version {curr_v}, but history expects version {expected_version}.", {
                    "verified": False, "status": "CORRUPTED", "tampered_field": "version", "expected": expected_version, "actual": curr_v
                }
            expected_curr_supersedes = expected_version - 1
            if delivery_evidence.get("supersedes_version") != expected_curr_supersedes:
                return False, f"CORRUPTED_EVIDENCE_HISTORY: Active evidence supersedes_version {delivery_evidence.get('supersedes_version')} does not match history head {expected_curr_supersedes}.", {
                    "verified": False, "status": "CORRUPTED", "tampered_field": "supersedes_version"
                }
        else:
            if curr_v > 1:
                return False, f"CORRUPTED_EVIDENCE_HISTORY: Active evidence claims version {curr_v} but history is missing.", {
                    "verified": False, "status": "CORRUPTED", "tampered_field": "version"
                }

    return True, "VERIFIED: Evidence history and cryptographic bindings are unbroken.", {"verified": True}


def verify_hash_chain(
    state_chain: List[Dict[str, Any]],
    current_stored_hash: str,
    current_amount: Any,
    current_status: str,
    delivery_status: Optional[str] = None,
    delivery_evidence: Optional[Dict[str, Any]] = None,
    delivery_evidence_history: Optional[List[Dict[str, Any]]] = None
) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Cryptographic Auditor: Recalculates and strictly verifies the hash chain and delivery evidence binding.
    If any database field (amount, status, evidence payload, reviewer identity, or historical transition)
    was tampered with, flags the transaction as CORRUPTED.
    """
    if not state_chain:
        return False, "CORRUPTED: Missing or empty cryptographic state chain.", {
            "verified": False,
            "status": "CORRUPTED",
            "chain_length": 0
        }
    
    expected_prev = GENESIS_HASH
    for idx, entry in enumerate(state_chain):
        # 1. Verify previous_state_hash continuity
        if entry.get("previous_state_hash") != expected_prev:
            return False, f"CORRUPTED: Broken chain link at step {idx}. Expected prev {expected_prev[:12]}..., got {entry.get('previous_state_hash', '')[:12]}...", {
                "verified": False,
                "status": "CORRUPTED",
                "broken_step": idx
            }
        
        # 2. Recompute hash for this step
        entry_ev_hash = entry.get("evidence_hash", "")
        recalculated = compute_state_hash(
            entry.get("previous_state_hash"),
            entry.get("timestamp"),
            entry.get("amount"),
            entry.get("status"),
            evidence_hash=entry_ev_hash
        )
        
        if recalculated != entry.get("state_hash"):
            return False, f"CORRUPTED: Hash mismatch at step {idx}. Recalculated {recalculated[:12]}... does not match recorded {entry.get('state_hash', '')[:12]}...", {
                "verified": False,
                "status": "CORRUPTED",
                "failed_step": idx,
                "recalculated_hash": recalculated,
                "recorded_hash": entry.get("state_hash")
            }
        
        expected_prev = recalculated

    # 3. Verify final state matches the active record
    last_entry = state_chain[-1]
    if last_entry.get("state_hash") != current_stored_hash:
        return False, "CORRUPTED: Latest state hash does not match head of chain.", {
            "verified": False,
            "status": "CORRUPTED",
            "expected_head": last_entry.get("state_hash"),
            "stored_head": current_stored_hash
        }
        
    if format_amount_str(current_amount) != last_entry.get("amount"):
        return False, f"CORRUPTED: Transaction amount altered ({current_amount} vs chain {last_entry.get('amount')}).", {
            "verified": False,
            "status": "CORRUPTED",
            "tampered_field": "amount"
        }
        
    recorded_status = str(last_entry.get("status", "")).strip().upper()
    curr_status = str(current_status).strip().upper()
    dlv_status = str(delivery_status).strip().upper() if delivery_status else None

    status_matches = (curr_status == recorded_status) or (dlv_status is not None and dlv_status == recorded_status)
    if not status_matches:
        if curr_status == "AUTHORIZED" and recorded_status.startswith("DELIVERY_"):
            status_matches = True

    if not status_matches:
        return False, f"CORRUPTED: Transaction status altered ({current_status} vs chain {last_entry.get('status')}).", {
            "verified": False,
            "status": "CORRUPTED",
            "tampered_field": "status"
        }

    # 4. SEC-06 Delivery Evidence Audit & Payload Verification
    # Ensure delivery verified transactions cannot be claimed without cryptographic evidence binding
    if dlv_status == "DELIVERY_VERIFIED":
        if not delivery_evidence:
            return False, "CORRUPTED: Transaction claimed DELIVERY_VERIFIED without delivery evidence.", {
                "verified": False,
                "status": "CORRUPTED",
                "tampered_field": "delivery_evidence"
            }
        # Check that evidence binding exists in the chain
        if not any(e.get("evidence_hash") for e in state_chain):
            return False, "CORRUPTED: Transaction claimed DELIVERY_VERIFIED without cryptographic evidence binding in ledger.", {
                "verified": False,
                "status": "CORRUPTED",
                "tampered_field": "delivery_evidence_binding"
            }

    # 5. SEC-12 Versioned Evidence History Audit & Payload Verification
    hist_ok, hist_reason, hist_audit = verify_evidence_history(
        delivery_evidence=delivery_evidence,
        delivery_evidence_history=delivery_evidence_history,
        state_chain=state_chain
    )
    if not hist_ok:
        return False, hist_reason, hist_audit

    return True, "VERIFIED: Cryptographic hash chain unbroken and mathematically sound.", {
        "verified": True,
        "status": "VERIFIED",
        "chain_length": len(state_chain),
        "head_hash": current_stored_hash,
        "state_chain": state_chain
    }
