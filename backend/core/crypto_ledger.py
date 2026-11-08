import hashlib
import json
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime
from typing import Dict, Any, List, Tuple, Optional

GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000"

def format_amount_str(amount: Any) -> str:
    """Standardizes monetary amount to exact 2-decimal string for deterministic hashing."""
    return f"{Decimal(str(amount)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP):.2f}"

def compute_state_hash(previous_state_hash: str, timestamp: str, amount: Any, status: str) -> str:
    """
    Military-Grade Cryptographic State Hash:
    Formula: SHA-256(previous_state_hash + current_timestamp + transaction_amount + status)
    Guarantees tamper-evident immutability across state transitions.
    """
    clean_prev = previous_state_hash or GENESIS_HASH
    clean_amount = format_amount_str(amount)
    clean_status = str(status).strip().upper()
    
    # Deterministic payload construction
    payload = f"{clean_prev}{timestamp}{clean_amount}{clean_status}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()

def create_initial_hash_chain(tx_id: str, amount: Any, status: str = "AUTHORIZED", timestamp: Optional[str] = None) -> Dict[str, Any]:
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
    timestamp: Optional[str] = None
) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Appends a new state transition (e.g. AUTHORIZED -> CAPTURED or AUTHORIZED -> DISPUTED)
    to the immutable cryptographic ledger chain.
    """
    ts = timestamp or datetime.utcnow().isoformat()
    prev_hash = current_hash or (current_chain[-1]["state_hash"] if current_chain else GENESIS_HASH)
    new_hash = compute_state_hash(prev_hash, ts, amount, new_status)
    
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
    
    updated_chain = list(current_chain)
    updated_chain.append(new_entry)
    return new_hash, updated_chain

def verify_hash_chain(
    state_chain: List[Dict[str, Any]],
    current_stored_hash: str,
    current_amount: Any,
    current_status: str
) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Cryptographic Auditor: Recalculates and strictly verifies the hash chain.
    If any database field (amount, status, or historical transition) was tampered with,
    flags the transaction as CORRUPTED.
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
        recalculated = compute_state_hash(
            entry.get("previous_state_hash"),
            entry.get("timestamp"),
            entry.get("amount"),
            entry.get("status")
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
        
    if str(current_status).strip().upper() != last_entry.get("status"):
        return False, f"CORRUPTED: Transaction status altered ({current_status} vs chain {last_entry.get('status')}).", {
            "verified": False,
            "status": "CORRUPTED",
            "tampered_field": "status"
        }

    return True, "VERIFIED: Cryptographic hash chain unbroken and mathematically sound.", {
        "verified": True,
        "status": "VERIFIED",
        "chain_length": len(state_chain),
        "head_hash": current_stored_hash,
        "state_chain": state_chain
    }

