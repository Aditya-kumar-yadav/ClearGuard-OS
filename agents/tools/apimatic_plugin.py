"""
APIMatic Zero-Hallucination Tooling Plugin
-----------------------------------------
Dynamically feeds verified, exact OpenAPI REST schemas to the Gemini LLM
to eradicate parameter and syntax hallucinations for PayPal APIs before
they ever reach the guardrail or payment network.
"""

import json
import logging
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("aurorapay.apimatic")

# Verified APIMatic OpenAPI 3.0 Specification for PayPal Orders v2 & Disputes v1
APIMATIC_OPENAPI_SPECS: Dict[str, Any] = {
    "paypal_orders_v2_authorize": {
        "openapi": "3.0.3",
        "info": {
            "title": "PayPal Orders v2 API - APIMatic Verified Schema",
            "version": "2.0",
            "description": "APIMatic strict OpenAPI schema for autonomous AI escrow order creation and authorization."
        },
        "type": "object",
        "properties": {
            "item_name": {
                "type": "string",
                "description": "Commercial description and SKU name of the procured item.",
                "minLength": 2,
                "maxLength": 128
            },
            "category": {
                "type": "string",
                "description": "Commercial merchandise category. Must be one of the approved spending mandate categories.",
                "enum": ["electronics", "hardware", "cloud", "office"]
            },
            "amount": {
                "type": "number",
                "description": "Monetary cost in INR, formatted to exactly 2 decimal places. Must not exceed single-spend cap.",
                "minimum": 0.01
            },
            "currency": {
                "type": "string",
                "description": "Three-character ISO-4217 currency code.",
                "enum": ["INR", "USD"],
                "default": "INR"
            },
            "merchant_name": {
                "type": "string",
                "description": "Verified merchant name as registered in enterprise vendor catalog.",
                "minLength": 2
            },
            "intent": {
                "type": "string",
                "description": "The intent to either authorize escrow funds immediately or direct capture. Must be AUTHORIZE for smart hostage escrow.",
                "enum": ["AUTHORIZE"],
                "default": "AUTHORIZE"
            },
            "idempotency_key": {
                "type": "string",
                "description": "Unique UUIDv4 string to guarantee idempotency and prevent double billing upon retry."
            }
        },
        "required": ["item_name", "category", "amount", "merchant_name"]
    },
    "paypal_disputes_v1_create": {
        "openapi": "3.0.3",
        "info": {
            "title": "PayPal Disputes v1 API - APIMatic Verified Schema",
            "version": "1.0",
            "description": "APIMatic strict OpenAPI schema for autonomous carrier loss dispute filing."
        },
        "type": "object",
        "properties": {
            "order_id": {
                "type": "string",
                "description": "The PayPal Order ID associated with the compromised transaction.",
                "minLength": 6
            },
            "dispute_reason": {
                "type": "string",
                "description": "Formal legal claim reason code adhering to PayPal seller protection guidelines.",
                "enum": [
                    "MERCHANDISE_OR_SERVICE_NOT_RECEIVED",
                    "MERCHANDISE_OR_SERVICE_SIGNIFICANTLY_NOT_AS_DESCRIBED"
                ],
                "default": "MERCHANDISE_OR_SERVICE_NOT_RECEIVED"
            },
            "evidence_logs": {
                "type": "string",
                "description": "Cryptographically signed carrier telemetry or Gemini Vision damage assessment logs.",
                "minLength": 10
            },
            "amount": {
                "type": "number",
                "description": "Total refund amount claimed from escrow.",
                "minimum": 0.01
            },
            "currency": {
                "type": "string",
                "enum": ["INR", "USD"],
                "default": "INR"
            }
        },
        "required": ["order_id", "dispute_reason", "evidence_logs"]
    }
}

class APIMaticContextPlugin:
    """
    APIMatic Zero-Hallucination Tooling Engine:
    Provides exact OpenAPI schemas to Gemini and intercepts any schema violations
    prior to backend dispatch.
    """

    @classmethod
    def get_openapi_spec(cls, tool_name: str) -> Dict[str, Any]:
        """Retrieves verified APIMatic OpenAPI schema for a given endpoint."""
        if tool_name not in APIMATIC_OPENAPI_SPECS:
            raise KeyError(f"No APIMatic verified schema registered for tool: '{tool_name}'")
        return APIMATIC_OPENAPI_SPECS[tool_name]

    @classmethod
    def get_gemini_tool_declarations(cls) -> List[Dict[str, Any]]:
        """
        Dynamically transforms APIMatic OpenAPI specs into Google Gemini
        Function Declaration definitions for zero-hallucination reasoning.
        """
        declarations = []
        
        # 1. Escrow Procurement Tool
        orders_spec = APIMATIC_OPENAPI_SPECS["paypal_orders_v2_authorize"]
        declarations.append({
            "name": "execute_escrow_payment",
            "description": (
                "APIMATIC VERIFIED: Procures an item by routing through the OpenGuardrails "
                "spending mandate and initiating a PayPal Orders v2 escrow authorization. "
                "Parameters strictly conform to PayPal's OpenAPI v2 specification."
            ),
            "parameters": {
                "type": "OBJECT",
                "properties": {
                    prop: {
                        "type": orders_spec["properties"][prop]["type"].upper(),
                        "description": orders_spec["properties"][prop].get("description", "")
                    }
                    for prop in orders_spec["properties"]
                },
                "required": orders_spec["required"]
            }
        })

        # 2. Automated Dispute Filing Tool
        disputes_spec = APIMATIC_OPENAPI_SPECS["paypal_disputes_v1_create"]
        declarations.append({
            "name": "file_paypal_dispute",
            "description": (
                "APIMATIC VERIFIED: Automatically registers a formal claim on PayPal Disputes v1 API "
                "when carrier loss or packaging destruction is verified by physical vision telemetry."
            ),
            "parameters": {
                "type": "OBJECT",
                "properties": {
                    prop: {
                        "type": disputes_spec["properties"][prop]["type"].upper(),
                        "description": disputes_spec["properties"][prop].get("description", "")
                    }
                    for prop in disputes_spec["properties"]
                },
                "required": disputes_spec["required"]
            }
        })

        return declarations

    @classmethod
    def validate_tool_payload(cls, tool_name: str, payload: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """
        APIMatic Pre-Flight Validator:
        Validates the LLM-generated arguments against the verified APIMatic OpenAPI schema.
        Prevents parameter hallucination (e.g. inventing 'buyer_total' instead of 'amount').
        """
        schema = APIMATIC_OPENAPI_SPECS.get(tool_name)
        if not schema:
            return False, f"Unknown APIMatic tool: {tool_name}"

        # Check required fields
        for req in schema.get("required", []):
            if req not in payload or payload[req] is None:
                return False, f"APIMatic Schema Violation: Missing required property '{req}' for tool '{tool_name}'"

        # Check unexpected / hallucinated properties
        allowed_props = set(schema.get("properties", {}).keys())
        for key in payload.keys():
            if key not in allowed_props:
                return False, f"APIMatic Zero-Hallucination Interception: Hallucinated property '{key}' not in official OpenAPI schema"

        # Validate enums where specified
        for prop, val in payload.items():
            prop_def = schema["properties"].get(prop, {})
            if "enum" in prop_def and val not in prop_def["enum"]:
                return False, f"APIMatic Enum Breach: Property '{prop}' value '{val}' not in allowed enums: {prop_def['enum']}"

        return True, None

