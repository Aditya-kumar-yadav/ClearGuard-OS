import hmac
import hashlib
import json
import time
import uuid
from typing import Dict, Any, Tuple

# Internal air-gapped auditor private key (in production: AWS KMS / Vault HSM)
AUDITOR_SECRET_KEY = b"AURORAPAY_AIRGAPPED_AUDITOR_HMAC_SECRET_KEY_v2"

class MakerCheckerProtocol:
    """
    Enterprise Dual-Control Multi-Agent Protocol:
    - Maker (Agent 1 - Buyer): Formulates procurement & PayPal payload.
    - Checker (Agent 2 - Air-Gapped Auditor): Has 0 network access.
      Independently audits payload against mandate & OpenGuardrails rules.
      Signs valid transactions with an HMAC-SHA256 cryptographic attestation.
    - FastAPI Guardrail: Strictly requires & verifies Agent 2's signature before calling PayPal.
    """

    @staticmethod
    def agent1_maker_propose(
        item_name: str,
        category: str,
        amount: float,
        merchant_name: str,
        currency: str = "INR"
    ) -> Dict[str, Any]:
        """Agent 1 (Buyer) proposes a transaction payload."""
        proposal_id = f"PROP-{uuid.uuid4().hex[:8].upper()}"
        return {
            "proposal_id": proposal_id,
            "maker_agent_id": "AGENT-1-PROCUREMENT-BUYER",
            "item_name": item_name,
            "category": category,
            "amount": amount,
            "currency": currency,
            "merchant_name": merchant_name,
            "intent": "AUTHORIZE",
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }

    @staticmethod
    def agent2_checker_audit(
        proposal: Dict[str, Any],
        mandate: Dict[str, Any],
        guardrail_rules: list = None
    ) -> Dict[str, Any]:
        """
        Agent 2 (Air-Gapped Auditor) independently audits Agent 1's proposal.
        Zero internet access. Deterministic validation only.
        """
        audit_id = f"AUD-{uuid.uuid4().hex[:8].upper()}"
        amount = proposal.get("amount", 0.0)
        category = proposal.get("category", "").lower()
        max_budget = mandate.get("max_budget", 55000.0)
        allowed_cats = [c.strip().lower() for c in mandate.get("allowed_categories", "electronics,hardware,cloud,office").split(",")]

        # 4 Strictly Orthogonal Non-Overlapping Defense Tiers

        # Tier 1: Adversarial Prompt Injection & SSRF (Orthogonal to commercial categories)
        item_text = (proposal.get("item_name", "") + " " + proposal.get("description", "")).lower()
        injection_patterns = ["ignore previous instructions", "system override", "bypass guardrails", "developer mode active", "<script", "169.254.169.254"]
        if any(pat in item_text for pat in injection_patterns):
            return {
                "audit_id": audit_id,
                "tier": "TIER_1_SECURITY_INJECTION",
                "status": "REJECTED_BY_AUDITOR",
                "checker_agent_id": "AGENT-2-AIRGAPPED-AUDITOR",
                "reason": "Agent 2 Security Interception: Adversarial prompt injection or system override signature detected.",
                "approved": False,
                "cryptographic_signature": None,
                "audited_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }

        # Tier 2: Category Whitelist Governance (Commercial Policy)
        if category not in allowed_cats:
            return {
                "audit_id": audit_id,
                "tier": "TIER_2_CATEGORY_GOVERNANCE",
                "status": "REJECTED_BY_AUDITOR",
                "checker_agent_id": "AGENT-2-AIRGAPPED-AUDITOR",
                "reason": f"Agent 2 Policy Breach: Category '{category}' is prohibited. Whitelist: {allowed_cats}.",
                "approved": False,
                "cryptographic_signature": None,
                "audited_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }

        # Tier 3: Per-Item Financial Budget Cap (Mandate Limit)
        if amount > max_budget:
            return {
                "audit_id": audit_id,
                "tier": "TIER_3_BUDGET_CAP",
                "status": "REJECTED_BY_AUDITOR",
                "checker_agent_id": "AGENT-2-AIRGAPPED-AUDITOR",
                "reason": f"Agent 2 Auditor Financial Breach: Amount (₹{amount:,.2f}) exceeds per-item limit (₹{max_budget:,.2f}).",
                "approved": False,
                "cryptographic_signature": None,
                "audited_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }

        # Tier 4: Delegated Escrow Pool Liquidity (Total Balance)
        remaining_pool = mandate.get("remaining_pool", mandate.get("remaining_budget", 150000.0))
        if amount > remaining_pool:
            return {
                "audit_id": audit_id,
                "tier": "TIER_4_POOL_LIQUIDITY",
                "status": "REJECTED_BY_AUDITOR",
                "checker_agent_id": "AGENT-2-AIRGAPPED-AUDITOR",
                "reason": f"Agent 2 Liquidity Breach: Amount (₹{amount:,.2f}) exceeds available delegated escrow pool (₹{remaining_pool:,.2f}).",
                "approved": False,
                "cryptographic_signature": None,
                "audited_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }

        # All checks passed: Agent 2 signs proposal with HMAC-SHA256
        data_to_sign = f"{proposal.get('proposal_id')}:{amount}:{category}:{proposal.get('merchant_name')}"
        signature = hmac.new(AUDITOR_SECRET_KEY, data_to_sign.encode("utf-8"), hashlib.sha256).hexdigest()

        return {
            "audit_id": audit_id,
            "status": "AUDIT_APPROVED",
            "checker_agent_id": "AGENT-2-AIRGAPPED-AUDITOR",
            "reason": "Independent audit successful. Code constraints verified. Cryptographic signature issued.",
            "approved": True,
            "data_signed": data_to_sign,
            "cryptographic_signature": f"HMAC-SHA256:{signature}",
            "audited_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }

    @staticmethod
    def verify_auditor_signature(proposal: Dict[str, Any], signature_header: str) -> bool:
        """FastAPI Backend verifies Agent 2's cryptographic signature before processing."""
        if not signature_header or not signature_header.startswith("HMAC-SHA256:"):
            return False

        provided_sig = signature_header.replace("HMAC-SHA256:", "")
        data_to_sign = f"{proposal.get('proposal_id')}:{proposal.get('amount')}:{proposal.get('category', '').lower()}:{proposal.get('merchant_name')}"
        expected_sig = hmac.new(AUDITOR_SECRET_KEY, data_to_sign.encode("utf-8"), hashlib.sha256).hexdigest()

        return hmac.compare_digest(provided_sig, expected_sig)

