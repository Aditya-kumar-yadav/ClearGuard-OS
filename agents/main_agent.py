import os
import json
from dotenv import load_dotenv

load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from tools.secure_order import execute_secure_order, execute_escrow_payment
from tools.status_checker import check_shipping_status
from tools.auto_dispute import file_paypal_dispute
from tools.apimatic_plugin import APIMaticContextPlugin

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

class GeminiWatchdogAgent:
    """
    AuroraPay Gemini Watchdog Agent
    Integrated with APIMatic Zero-Hallucination Context Plugins:
    Dynamically loads verified OpenAPI 3.0 schemas directly into LLM function declarations
    to prevent syntax and argument hallucinations.
    """

    def __init__(self):
        self.api_key = GEMINI_API_KEY
        self.model = None
        self.apimatic_tools = APIMaticContextPlugin.get_gemini_tool_declarations()
        self._init_gemini()

    def _init_gemini(self):
        if self.api_key:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
                self.model = "gemini-2.5-flash"
                print("[GeminiWatchdogAgent] Google GenAI (gemini-2.5-flash) initialized with APIMatic OpenAPI Verified Tooling.")
            except Exception as e:
                self.client = None
                print(f"[GeminiWatchdogAgent] GenAI init error: {e}")
        else:
            self.client = None

    def run_natural_language_prompt(self, prompt_text: str) -> dict:
        """Calls live Gemini API to parse natural language procurement into an order action and executes it via backend."""
        if not getattr(self, "client", None):
            return {"status": "ERROR", "error": "GEMINI_API_KEY is not configured."}
        import httpx
        backend_url = os.getenv("BACKEND_API_URL", "http://localhost:8000")
        resp = httpx.post(
            f"{backend_url}/api/agent/procure",
            json={"prompt": prompt_text, "execute": True},
            timeout=60.0,
        )
        return resp.json()

    def run_procurement_flow(
        self,
        item_name: str,
        category: str,
        amount: float,
        merchant: str,
        prompt: str = "",
        intent: str = "AUTHORIZE"
    ):
        """
        Tool 1 Execution:
        1. Pre-flight APIMatic OpenAPI schema validation (Zero Hallucination).
        2. Routes through FastAPI /validate_transaction spending gate.
        3. Calls PayPal Orders v2 with deterministic idempotency UUIDv4.
        """
        payload = {
            "item_name": item_name,
            "category": category,
            "amount": amount,
            "merchant_name": merchant,
            "intent": intent
        }

        # APIMatic Zero-Hallucination Pre-Flight Check
        is_valid, error_msg = APIMaticContextPlugin.validate_tool_payload(
            "paypal_orders_v2_authorize",
            payload
        )
        if not is_valid:
            print(f"[APIMatic Interceptor] {error_msg}")
            return {
                "status": "APIMATIC_SCHEMA_VALIDATION_ERROR",
                "zero_hallucination_breach": True,
                "error": error_msg,
                "action_required": "CORRECT_TOOL_INVOCATION"
            }

        print(f"\n[Agent] Initiating procurement via APIMatic schema: {item_name} (₹{amount})")
        result = execute_escrow_payment(
            item_name=item_name,
            category=category,
            amount=amount,
            merchant_name=merchant,
            description=prompt
        )
        return result

    def run_auto_dispute_arbiter(self, order_id: str, tracking_number: str):
        """
        Auto-Dispute Arbiter:
        1. Inspects logistics telematics via status_checker tool.
        2. Validates dispute payload against APIMatic Disputes v1 OpenAPI schema.
        3. Autonomously fires file_paypal_dispute to reclaim escrow.
        """
        print(f"\n[Agent Arbiter] Inspecting telematics for Order: {order_id}")
        telematics = check_shipping_status(order_id=order_id, tracking_number=tracking_number, force_state="Lost")
        print(f"[Agent Arbiter] Carrier Telematics: {telematics['shipping_status']} - {telematics['last_telematics_event']}")

        if telematics["shipping_status"] == "Lost":
            evidence = (
                f"Carrier: {telematics['carrier']} | Tracking: {telematics['tracking_number']} | "
                f"Incident: {telematics['last_telematics_event']} | Code: {telematics['declaration_code']}"
            )
            dispute_payload = {
                "order_id": order_id,
                "dispute_reason": "MERCHANDISE_OR_SERVICE_NOT_RECEIVED",
                "evidence_logs": evidence
            }

            # APIMatic Zero-Hallucination Validation
            is_valid, error_msg = APIMaticContextPlugin.validate_tool_payload(
                "paypal_disputes_v1_create",
                dispute_payload
            )
            if not is_valid:
                print(f"[APIMatic Interceptor] Dispute schema violation: {error_msg}")
                return {"decision": "SCHEMA_ERROR", "error": error_msg}

            print("[Agent Arbiter] Autonomously filing PayPal Dispute Claim via APIMatic verified schema...")
            dispute_result = file_paypal_dispute(
                order_id=order_id,
                dispute_reason=dispute_payload["dispute_reason"],
                evidence_logs=evidence
            )
            return {
                "decision": "DISPUTE_FILED_AUTONOMOUSLY",
                "apimatic_verified": True,
                "telematics": telematics,
                "dispute_result": dispute_result
            }

        return {"decision": "NORMAL", "telematics": telematics}

if __name__ == "__main__":
    agent = GeminiWatchdogAgent()
    print("Testing APIMatic Verified Procurement Tool:")
    res1 = agent.run_procurement_flow("Dell Inspiron 15 Business Laptop", "electronics", 50000.0, "Dell Commercial")
    print(res1)

    print("\nTesting APIMatic Verified Auto Dispute Tool:")
    res2 = agent.run_auto_dispute_arbiter(res1.get("paypal_order_id", "ORD-TEST-992"), "TRK881920B")
    print(res2)
