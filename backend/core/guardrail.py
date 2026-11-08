import os
import json
import re
from typing import Tuple, List, Dict, Any, Union
from decimal import Decimal, ROUND_HALF_UP

def to_decimal(val: Any) -> Decimal:
    if val is None:
        return Decimal("0.00")
    if isinstance(val, Decimal):
        return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return Decimal(str(val)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

OPEN_GUARDRAILS_RULES_PATH = os.getenv(
    "OPEN_GUARDRAILS_RULES_PATH",
    r"C:\Users\bitd\Downloads\openguardrails\cli\rules\secrets.json"
)

SSRF_PATTERNS = [
    (r"169\.254\.169\.254", "aws_ec2_metadata_endpoint"),
    (r"metadata\.google\.internal", "gcp_metadata_endpoint"),
    (r"100\.100\.100\.200", "alibaba_metadata_endpoint"),
    (r"localhost|127\.0\.0\.1|0\.0\.0\.0", "loopback_access_attempt"),
    (r"10\.\d{1,3}\.\d{1,3}\.\d{1,3}", "internal_rfc1918_subnet"),
]

SUSPICIOUS_PATTERNS = [
    (r"ignore (all )?previous instructions", "prompt_injection_jailbreak"),
    (r"system override", "system_override_attempt"),
    (r"bypass guardrail", "security_bypass_attempt"),
    (r"transfer (all|funds|balance)", "unauthorized_drain_attempt"),
    (r"crypto|bitcoin|ethereum|monero|gift\s?card", "disallowed_liquid_asset"),
    (r"luxury|casino|gambling|rolex|patek", "disallowed_restricted_goods"),
    (r"admin access", "privilege_escalation"),
]

class StrictGuardrailMiddleware:
    _compiled_rules: List[Dict[str, Any]] = []
    _initialized: bool = False

    @classmethod
    def initialize(cls):
        cls._compiled_rules = []
        if os.path.exists(OPEN_GUARDRAILS_RULES_PATH):
            try:
                with open(OPEN_GUARDRAILS_RULES_PATH, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for rule in data.get("rules", []):
                        rule_id = rule.get("id")
                        category = rule.get("category")
                        severity = rule.get("severity", "critical")
                        for pat in rule.get("patterns", []):
                            try:
                                compiled = re.compile(pat["source"], re.IGNORECASE)
                                cls._compiled_rules.append({
                                    "rule_id": rule_id,
                                    "pattern_id": pat.get("id", rule_id),
                                    "category": category,
                                    "severity": severity,
                                    "regex": compiled,
                                    "source": pat["source"],
                                    "source_engine": "OpenGuardrails Native"
                                })
                            except re.error:
                                pass
            except Exception as e:
                print(f"[OpenGuardrails] Error reading rules: {e}")

        # SSRF checks
        for pat, pat_id in SSRF_PATTERNS:
            cls._compiled_rules.append({
                "rule_id": "network_ssrf_protection",
                "pattern_id": pat_id,
                "category": "security.network.ssrf",
                "severity": "critical",
                "regex": re.compile(pat, re.IGNORECASE),
                "source": pat,
                "source_engine": "OpenGuardrails Network Gate"
            })

        # Prompt injection checks
        for pat, pat_id in SUSPICIOUS_PATTERNS:
            cls._compiled_rules.append({
                "rule_id": "adversarial_prompt_injection",
                "pattern_id": pat_id,
                "category": "security.ai.prompt_injection",
                "severity": "high",
                "regex": re.compile(pat, re.IGNORECASE),
                "source": pat,
                "source_engine": "OpenGuardrails AI Gate"
            })

        cls._initialized = True

    @classmethod
    def get_loaded_rules(cls) -> List[Dict[str, Any]]:
        if not cls._initialized:
            cls.initialize()
        return [
            {
                "rule_id": r["rule_id"],
                "pattern_id": r["pattern_id"],
                "category": r["category"],
                "severity": r["severity"],
                "source": r["source"],
                "source_engine": r["source_engine"]
            }
            for r in cls._compiled_rules
        ]

    @classmethod
    def mask_secrets(cls, text: str) -> str:
        if not cls._initialized:
            cls.initialize()
        masked = text
        for rule in cls._compiled_rules:
            if "secret_leak" in rule["category"]:
                masked = rule["regex"].sub(f"[REDACTED:{rule['rule_id']}]", masked)
        return masked

    @classmethod
    def evaluate(
        cls,
        item_name: str,
        category: str,
        amount: Union[Decimal, float, str],
        max_spend: Union[Decimal, float, str],
        remaining_budget: Union[Decimal, float, str],
        allowed_categories: str,
        description: str = "",
        spent_so_far: Union[Decimal, float, str] = Decimal("0.00"),
        total_mandate_limit: Union[Decimal, float, str] = Decimal("250000.00")
    ) -> Tuple[bool, str, Decimal]:
        if not cls._initialized:
            cls.initialize()

        test_payload = f"{item_name} {description}"
        
        # Cast all currency figures to Decimal strictly to eliminate precision drift
        dec_amount = to_decimal(amount)
        dec_max_spend = to_decimal(max_spend)
        dec_remaining_budget = to_decimal(remaining_budget)
        dec_spent_so_far = to_decimal(spent_so_far)
        dec_total_limit = to_decimal(total_mandate_limit)

        # 1. Secret Leaks
        for rule in cls._compiled_rules:
            if "secret_leak" in rule["category"]:
                if rule["regex"].search(test_payload):
                    return False, f"CRITICAL SECURITY ALERT [SECRET_LEAK]: Attempted credential transmission ({rule['rule_id']}) blocked.", Decimal("1.00")

        # 2. SSRF
        for rule in cls._compiled_rules:
            if "ssrf" in rule["category"]:
                if rule["regex"].search(test_payload):
                    return False, f"CRITICAL SECURITY ALERT [SSRF]: Cloud metadata / internal host probing blocked ({rule['pattern_id']}).", Decimal("0.99")

        # 3. Prompt Injection
        for rule in cls._compiled_rules:
            if "prompt_injection" in rule["category"]:
                if rule["regex"].search(test_payload):
                    return False, f"POLICY VIOLATION [SECURITY]: Adversarial prompt injection detected ({rule['pattern_id']}).", Decimal("0.98")

        # 4. Category Check
        whitelist = [c.strip().lower() for c in allowed_categories.split(",") if c.strip()]
        if category.strip().lower() not in whitelist:
            return False, f"POLICY VIOLATION [DISALLOWED_CATEGORY]: Category '{category}' is unauthorized. Allowed: {', '.join(whitelist)}.", Decimal("0.75")

        # 5. Single Spend Limit (Precision Decimal Comparison)
        if dec_amount > dec_max_spend:
            return False, f"POLICY VIOLATION [BUDGET_OVERRUN]: Amount (₹{dec_amount:,.2f}) exceeds max per-transaction spend limit of ₹{dec_max_spend:,.2f}.", Decimal("0.85")

        # 6. Remaining Total Budget (Precision Decimal Comparison)
        if dec_amount > dec_remaining_budget:
            return False, f"POLICY VIOLATION [BUDGET_EXHAUSTED]: Amount (₹{dec_amount:,.2f}) exceeds total remaining mandate pool of ₹{dec_remaining_budget:,.2f}.", Decimal("0.90")

        # 7. Pre-Flight Ledger Math Check: (Spent_So_Far + Current_Transaction_Amount) <= Total_Mandate_Limit
        projected_spend = dec_spent_so_far + dec_amount
        if projected_spend > dec_total_limit:
            return False, f"POLICY VIOLATION [LEDGER_LIMIT_BREACHED]: Pre-flight ledger validation failed: Spent so far (₹{dec_spent_so_far:,.2f}) + current amount (₹{dec_amount:,.2f}) = ₹{projected_spend:,.2f}, which exceeds total mandate pool limit of ₹{dec_total_limit:,.2f}.", Decimal("0.95")

        return True, "Mandate and OpenGuardrails security checks passed. Approved for Hostage Escrow Freeze.", Decimal("0.00")

StrictGuardrailMiddleware.initialize()

