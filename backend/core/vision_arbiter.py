import os
import io
import re
import time
import json
import uuid
import base64
import hashlib
import logging
from typing import Dict, Any, Optional, Tuple, Union
from pydantic import BaseModel, Field
from dotenv import load_dotenv

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None  # type: ignore[assignment]
    types = None  # type: ignore[assignment]

load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

logger = logging.getLogger("aurorapay.vision")

PREFERRED_GEMINI_MODELS = (
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite-preview",
    "gemini-3-flash-preview",
    "gemini-flash-lite-latest",
    "gemini-3.1-flash-lite",
    "gemini-3.8-flash",
    "gemini-flash-latest",
)

def _is_retryable_model_error(err: Exception) -> bool:
    """Returns True when a Gemini error warrants failing over to the next model."""
    err_str = str(err).lower()
    if "api key not valid" in err_str or "api_key_invalid" in err_str:
        return False
    return any(
        token in err_str
        for token in (
            "not found",
            "no longer available",
            "deprecated",
            "404",
            "not supported",
            "500",
            "internal",
            "502",
            "bad gateway",
            "503",
            "unavailable",
            "504",
            "deadline",
            "high demand",
            "overloaded",
            "429",
            "resource_exhausted",
            "quota",
            "timeout",
            "timed out",
            "disconnected",
            "connection",
            "empty response",
        )
    )


class GeminiConfigurationError(RuntimeError):
    """Raised when GEMINI_API_KEY is missing or contains placeholder text."""
    pass


class GeminiAPIError(RuntimeError):
    """Raised when a live Google Gemini API call fails."""
    pass


class GeminiPODSchema(BaseModel):
    verdict: str
    condition: str
    integrity_score: float = Field(..., ge=0.0, le=1.0)
    deformation_score: float = Field(default=0.0, ge=0.0, le=1.0)
    detected_item: Optional[str] = None
    item_matches_order: Optional[bool] = None
    order_no_match_status: Optional[str] = None
    ocr_extracted: Dict[str, Any]
    vision_reasoning: list
    recommended_action: str


def validate_pod_schema(data: Any) -> bool:
    """Strict schema validator for Gemini Vision output."""
    if not isinstance(data, dict):
        return False
    try:
        GeminiPODSchema(**data)
        return True
    except Exception:
        return False


def clean_json_string(raw: str) -> str:
    """Strips markdown code fences and cleans potential whitespace."""
    text = raw.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()


def decode_image_payload(
    image_data: Union[str, bytes],
    mime_type: Optional[str] = None,
) -> Tuple[bytes, str]:
    """
    Normalizes a data URL, base64 string, or raw bytes into (image_bytes, mime_type).
    Validates image integrity using Pillow when available.
    """
    detected_mime = mime_type

    if isinstance(image_data, bytes):
        img_bytes = image_data
    elif isinstance(image_data, str):
        raw_str = image_data.strip()
        if raw_str.startswith("data:"):
            header, _, b64_part = raw_str.partition(",")
            if not b64_part:
                raise ValueError("Invalid image data URI: missing base64 payload.")
            mime_match = re.match(r"data:([^;]+);base64", header, re.IGNORECASE)
            if mime_match and not detected_mime:
                detected_mime = mime_match.group(1).lower()
            img_bytes = base64.b64decode(b64_part, validate=True)
        else:
            img_bytes = base64.b64decode(raw_str, validate=True)
    else:
        raise ValueError("Unsupported image_data type; expected base64 string or bytes.")

    if not img_bytes:
        raise ValueError("Uploaded image payload is empty.")

    # Verify image bytes and detect canonical MIME type via Pillow
    try:
        from PIL import Image
        with Image.open(io.BytesIO(img_bytes)) as img:
            img.verify()
        with Image.open(io.BytesIO(img_bytes)) as img2:
            fmt = (img2.format or "JPEG").upper()
            fmt_to_mime = {
                "JPEG": "image/jpeg",
                "JPG": "image/jpeg",
                "PNG": "image/png",
                "WEBP": "image/webp",
                "GIF": "image/gif",
            }
            detected_mime = detected_mime or fmt_to_mime.get(fmt, "image/jpeg")
    except Exception as e:
        raise ValueError(f"Invalid or corrupted image file: {e}") from e

    return img_bytes, detected_mime or "image/jpeg"


class GeminiVisionArbiter:
    """
    Autonomous Visual Proof-of-Delivery Arbiter using Multi-modal Google Gemini Vision.
    Bridges the physical-to-digital gap:
    1. Inspects real uploaded delivery drop-off photographs (bytes/base64).
    2. OCRs shipping label, carrier, tracking number & recipient address.
    3. Evaluates structural packaging integrity (intact vs crushed/water damaged/tampered).
    4. Recommends either Escrow Capture or PayPal Dispute/Void.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = (api_key or os.getenv("GEMINI_API_KEY", "")).strip()
        self._genai_client = None
        self._legacy_model = None
        self._init_client()

    def is_configured(self) -> bool:
        key = (self.api_key or os.getenv("GEMINI_API_KEY", "")).strip()
        if not key:
            return False
        low = key.lower()
        for placeholder in ("your_", "paste_", "placeholder", "changeme"):
            if placeholder in low:
                return False
        return True

    def _init_client(self):
        key = (self.api_key or os.getenv("GEMINI_API_KEY", "")).strip()
        self.api_key = key
        if not self.is_configured():
            return
        try:
            if genai is None:
                raise ImportError("google-genai is not installed")
            if types is not None and hasattr(types, "HttpOptions"):
                self._genai_client = genai.Client(
                    api_key=key,
                    http_options=types.HttpOptions(timeout=18000),
                )
            else:
                self._genai_client = genai.Client(api_key=key)
        except Exception as e:
            logger.warning(f"Could not load google.genai client ({e}), trying legacy SDK.")
            try:
                import google.generativeai as legacy_genai
                legacy_genai.configure(api_key=key)
                self._legacy_model = legacy_genai.GenerativeModel("gemini-3.5-flash-lite")
            except Exception as e2:
                logger.warning(f"Could not load legacy Gemini client ({e2}).")

    def _ensure_client(self):
        env_key = os.getenv("GEMINI_API_KEY", "").strip()
        if env_key and env_key != self.api_key:
            self.api_key = env_key
            self._genai_client = None
            self._legacy_model = None
        if not self.is_configured():
            raise GeminiConfigurationError(
                "GEMINI_API_KEY is not configured or contains a placeholder value. "
                "Set a valid GEMINI_API_KEY in .env to run real Gemini Vision & AI calls."
            )
        if self._genai_client is None and self._legacy_model is None:
            self._init_client()
        if self._genai_client is None and self._legacy_model is None:
            raise GeminiConfigurationError("Unable to initialize Google Gemini SDK client.")

    def _call_gemini_multimodal(self, prompt: str, img_bytes: bytes, mime_type: str) -> Tuple[str, str]:
        """Executes a real multimodal call against Google Gemini API and returns (raw_text, model_used)."""
        self._ensure_client()

        if self._genai_client is not None:
            from google.genai import types
            last_err = None
            for model_name in PREFERRED_GEMINI_MODELS:
                try:
                    response = self._genai_client.models.generate_content(
                        model=model_name,
                        contents=[
                            types.Part.from_bytes(data=img_bytes, mime_type=mime_type),
                            prompt,
                        ],
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            temperature=0.1,
                        ),
                    )
                    if response and getattr(response, "text", None):
                        return response.text, model_name
                    raise GeminiAPIError(f"Gemini model '{model_name}' returned an empty response.")
                except Exception as e:
                    last_err = e
                    if _is_retryable_model_error(e):
                        logger.warning(f"[GeminiVisionFallback] Model '{model_name}' failed ({e}); trying next model.")
                        continue
                    raise GeminiAPIError(f"Google Gemini Vision API error ({model_name}): {e}") from e
            raise GeminiAPIError(f"Google Gemini Vision API error across models: {last_err}") from last_err

        # Legacy SDK fallback if google.genai is unavailable
        from PIL import Image
        pil_img = Image.open(io.BytesIO(img_bytes))
        response = self._legacy_model.generate_content([prompt, pil_img])
        return response.text, "gemini-3.5-flash-lite"

    def inspect_real_photo(
        self,
        image_data: Union[str, bytes],
        mime_type: Optional[str] = None,
        expected_address: str = "Corporate HQ Tech Park, Suite 402, Bengaluru 560001",
        expected_tracking: Optional[str] = None,
        item_name: Optional[str] = None,
        order_id: Optional[str] = None,
        paypal_order_id: Optional[str] = None,
        merchant_name: Optional[str] = None,
        category: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Inspects a REAL uploaded delivery photograph using Google Gemini Vision API,
        matching the visual contents and visible labels against the site-produced order metadata.
        Raises GeminiConfigurationError if GEMINI_API_KEY is missing or GeminiAPIError if the API fails.
        """
        img_bytes, resolved_mime = decode_image_payload(image_data, mime_type=mime_type)
        photo_sha256 = hashlib.sha256(img_bytes).hexdigest()

        has_order_context = bool(order_id or item_name or expected_tracking or paypal_order_id)
        prompt = (
            "You are an autonomous enterprise Proof-of-Delivery (POD) forensic vision auditor. "
            "Inspect the attached physical photograph carefully and honestly.\n"
            f"Site Order No: {order_id or 'UNSPECIFIED'}.\n"
            f"PayPal Order ID: {paypal_order_id or 'UNSPECIFIED'}.\n"
            f"Expected Ordered Item: {item_name or 'Enterprise Hardware Parcel'} (Category: {category or 'general'}, Merchant: {merchant_name or 'Authorized Vendor'}).\n"
            f"Expected destination address: {expected_address}.\n"
            f"Expected tracking number (if visible): {expected_tracking or 'Check label if visible'}.\n\n"
            "Evaluate strictly:\n"
            "1. Identify what physical object/product or shipping box is ACTUALLY shown in the photo (`detected_item`).\n"
            "2. ITEM vs ORDER MATCH (`item_matches_order`): If a specific Expected Ordered Item was supplied above, verify whether the object or branded parcel in the photo genuinely matches that item or sealed shipment box. If the photo clearly shows an unrelated/wrong product (for example, a watch when a laptop/monitor was ordered, or a random non-product scene), set `item_matches_order` to false and recommend `FILE_PAYPAL_DISPUTE`.\n"
            "3. ORDER NO / TRACKING MATCH (`order_no_match_status`): Read any visible shipping label text, order reference, invoice ID, carrier, tracking number, and address via OCR (use 'NOT_VISIBLE' if unreadable — do NOT invent IDs). Set `order_no_match_status` to:\n"
            "   - 'EXACT_MATCH' if a visible order/tracking ID matches the expected order/tracking IDs,\n"
            "   - 'MISMATCHED' if a legible order/tracking ID on the label clearly conflicts with them,\n"
            "   - 'ITEM_VERIFIED_LABEL_NOT_VISIBLE' if the item/package matches visually but label IDs are not legible,\n"
            "   - 'UNBOUND' if no specific Site Order No was supplied.\n"
            "4. PACKAGING INTEGRITY: Check for intact seal vs crushing, tearing, water damage, or tampering. Assign `integrity_score` (0.0-1.0) and `deformation_score` (0.0-1.0).\n"
            "5. Recommended action: 'CAPTURE_ESCROW' ONLY if `integrity_score >= 0.75`, `item_matches_order` is not false, and `order_no_match_status` is not 'MISMATCHED'; otherwise 'FILE_PAYPAL_DISPUTE'.\n\n"
            "Return ONLY valid JSON matching this exact schema:\n"
            "{\n"
            '  "verdict": "VERIFIED_INTACT" | "CRITICAL_DAMAGE_DETECTED" | "ITEM_MISMATCH_SUSPECTED_FRAUD" | "ADDRESS_MISMATCH_SUSPECTED_FRAUD" | "UNVERIFIED_NON_PARCEL",\n'
            '  "condition": "PRISTINE_SEALED" | "CRUSHED_SEVERELY_DEFORMED" | "TAMPERED_OR_OPENED" | "MISMATCHED_OR_UNCLEAR",\n'
            '  "integrity_score": 0.95,\n'
            '  "deformation_score": 0.05,\n'
            '  "detected_item": "concise description of the actual item/parcel visible in the image",\n'
            '  "item_matches_order": true,\n'
            '  "order_no_match_status": "EXACT_MATCH" | "ITEM_VERIFIED_LABEL_NOT_VISIBLE" | "MISMATCHED" | "UNBOUND",\n'
            '  "ocr_extracted": {\n'
            '    "carrier": "string or NOT_VISIBLE",\n'
            '    "order_reference": "string or NOT_VISIBLE",\n'
            '    "tracking_number": "string or NOT_VISIBLE",\n'
            '    "destination_address": "string or NOT_VISIBLE",\n'
            '    "tamper_tape_intact": true\n'
            "  },\n"
            '  "vision_reasoning": ["observation 1", "observation 2", "observation 3"],\n'
            '  "recommended_action": "CAPTURE_ESCROW" | "FILE_PAYPAL_DISPUTE"\n'
            "}"
        )

        start = time.perf_counter()
        last_error = None
        for attempt in range(2):
            try:
                raw_text, model_used = self._call_gemini_multimodal(
                    prompt if attempt == 0 else prompt + "\nSTRICT REQUIREMENT: Output raw JSON only, no markdown.",
                    img_bytes,
                    resolved_mime,
                )
                cleaned = clean_json_string(raw_text)
                parsed = json.loads(cleaned)
                if "deformation_score" not in parsed and "integrity_score" in parsed:
                    parsed["deformation_score"] = round(max(0.0, 1.0 - float(parsed["integrity_score"])), 2)
                if not validate_pod_schema(parsed):
                    raise ValueError("Gemini Vision output failed strict POD schema validation.")

                if not has_order_context and not parsed.get("order_no_match_status"):
                    parsed["order_no_match_status"] = "UNBOUND"
                if parsed.get("item_matches_order") is False or parsed.get("order_no_match_status") == "MISMATCHED":
                    parsed["recommended_action"] = "FILE_PAYPAL_DISPUTE"
                    if parsed.get("verdict") in ("VERIFIED_INTACT", "DELIVERY_VERIFIED_INTACT"):
                        parsed["verdict"] = "ITEM_MISMATCH_SUSPECTED_FRAUD"

                latency_ms = round((time.perf_counter() - start) * 1000, 1)
                return {
                    "inspection_id": f"VIS-{uuid.uuid4().hex[:8].upper()}",
                    "scenario": "LIVE_UPLOADED_PHOTO",
                    "engine": f"Google Gemini Vision ({model_used})",
                    "model": model_used,
                    "live_gemini_call": True,
                    "photo_uploaded": True,
                    "photo_mime_type": resolved_mime,
                    "photo_bytes": len(img_bytes),
                    "photo_bytes_sha256": photo_sha256,
                    "photo_sha256": photo_sha256,
                    "order_context": {
                        "order_id": order_id,
                        "paypal_order_id": paypal_order_id,
                        "expected_item": item_name,
                        "expected_tracking": expected_tracking,
                        "merchant_name": merchant_name,
                        "category": category,
                    },
                    "latency_ms": latency_ms,
                    "analysis": parsed,
                }
            except (GeminiConfigurationError, GeminiAPIError):
                raise
            except Exception as e:
                last_error = e
                logger.warning(f"[GeminiVisionRetry] Attempt {attempt + 1}/2 failed: {e}")

        raise GeminiAPIError(f"Gemini Vision returned invalid POD JSON after 2 attempts: {last_error}")

    def analyze_procurement_prompt(
        self,
        prompt_text: str,
        allowed_categories: str = "electronics,hardware,cloud,office",
        max_budget_inr: float = 55000.0,
    ) -> Dict[str, Any]:
        """
        Uses real Google Gemini API to parse an autonomous procurement instruction
        into a structured order payload with security risk assessment.
        """
        self._ensure_client()
        system_prompt = (
            "You are the ClearGuard-OS Autonomous Procurement Watchdog Agent. "
            "Parse the user's purchase request into strict JSON for our OpenGuardrails spending gate and PayPal Orders v2.\n"
            f"Allowed categories: {allowed_categories}. Max single-item budget: {max_budget_inr} INR (approx {round(max_budget_inr / 85.0, 2)} USD).\n"
            "If the user specifies USD or $, keep currency='USD' and numeric amount in USD. "
            "If the user specifies INR or ₹, keep currency='INR' and numeric amount in INR. Default currency='USD' if unclear.\n"
            "Return ONLY valid JSON:\n"
            "{\n"
            '  "item_name": "concise product name",\n'
            '  "category": "lowercase category e.g. electronics, hardware, cloud, office, luxury, jewelry",\n'
            '  "amount": 120.00,\n'
            '  "currency": "USD" | "INR",\n'
            '  "merchant": "merchant or vendor name",\n'
            '  "description": "business purpose",\n'
            '  "risk_assessment": "LOW" | "MEDIUM" | "HIGH",\n'
            '  "agent_reasoning": "1-2 sentences explaining your procurement & compliance assessment"\n'
            "}\n\n"
            f"User request: {prompt_text}"
        )

        start = time.perf_counter()
        def _normalize_agent_payload(parsed_obj: Dict[str, Any], model_used: str) -> Dict[str, Any]:
            raw_curr = str(parsed_obj.get("currency") or "INR").strip().upper()
            raw_amt = parsed_obj.get("amount") or parsed_obj.get("estimated_amount_inr") or 1000.0
            try:
                num_amt = float(raw_amt)
            except (TypeError, ValueError):
                num_amt = 1000.0
            inr_amt = round(num_amt * 85.0, 2) if raw_curr == "USD" else round(num_amt, 2)
            rec = str(parsed_obj.get("recommended_action") or "PROCEED").strip().upper()
            if rec not in ("PROCEED", "BLOCK"):
                rec = "PROCEED"
            return {
                "model": model_used,
                "model_used": model_used,
                "live_gemini_call": True,
                "latency_ms": round((time.perf_counter() - start) * 1000, 1),
                "analysis": {
                    "item_name": str(parsed_obj.get("item_name") or "Corporate Item"),
                    "category": str(parsed_obj.get("category") or "electronics").strip().lower(),
                    "amount": num_amt,
                    "currency": raw_curr,
                    "estimated_amount_inr": inr_amt,
                    "merchant": str(parsed_obj.get("merchant") or "Corporate Authorized Vendor"),
                    "description": str(parsed_obj.get("description") or prompt_text[:120]),
                    "risk_assessment": str(parsed_obj.get("risk_assessment") or "LOW"),
                    "recommended_action": rec,
                    "reasoning": str(
                        parsed_obj.get("agent_reasoning")
                        or parsed_obj.get("reasoning")
                        or "Parsed by Google Gemini Procurement Agent."
                    ),
                },
            }

        if self._genai_client is not None:
            from google.genai import types
            last_err = None
            for model_name in PREFERRED_GEMINI_MODELS:
                try:
                    response = self._genai_client.models.generate_content(
                        model=model_name,
                        contents=system_prompt,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            temperature=0.1,
                        ),
                    )
                    parsed = json.loads(clean_json_string(response.text))
                    return _normalize_agent_payload(parsed, model_name)
                except Exception as e:
                    last_err = e
                    if _is_retryable_model_error(e):
                        logger.warning(f"[GeminiAgentFallback] Model '{model_name}' failed ({e}); trying next model.")
                        continue
                    raise GeminiAPIError(f"Google Gemini API error ({model_name}): {e}") from e
            raise GeminiAPIError(f"Google Gemini API error across models: {last_err}") from last_err

        response = self._legacy_model.generate_content(system_prompt)
        parsed = json.loads(clean_json_string(response.text))
        return _normalize_agent_payload(parsed, "gemini-3.5-flash-lite")

    def inspect_delivery_proof(
        self,
        package_scenario: str = "INTACT_PACKAGE",
        image_data: Optional[Union[str, bytes]] = None,
        expected_address: str = "Corporate HQ Tech Park, Suite 402, Bengaluru 560001",
        expected_tracking: Optional[str] = None,
        mime_type: Optional[str] = None,
        item_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Executes multimodal inspection on a delivery photo when image_data is supplied.
        When image_data is provided, strictly calls live Google Gemini Vision (never fakes output).
        When image_data is None (offline/CI scenario tests), runs deterministic test spec tagged live_gemini_call=False.
        """
        if image_data is not None and (not isinstance(image_data, str) or image_data.strip() != ""):
            return self.inspect_real_photo(
                image_data=image_data,
                mime_type=mime_type,
                expected_address=expected_address,
                expected_tracking=expected_tracking,
                item_name=item_name,
            )

        tracking_num = expected_tracking or f"TRK{uuid.uuid4().hex[:10].upper()}"

        if package_scenario == "INTACT_PACKAGE":
            analysis = {
                "verdict": "VERIFIED_INTACT",
                "condition": "PRISTINE_SEALED",
                "integrity_score": 0.98,
                "deformation_score": 0.02,
                "label_detected": True,
                "ocr_extracted": {
                    "carrier": "FedEx Express B2B",
                    "tracking_number": tracking_num,
                    "recipient": "AuroraPay Enterprise Procurement",
                    "destination_address": expected_address,
                    "tamper_tape_intact": True,
                    "delivery_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                },
                "vision_reasoning": [
                    "Scenario Test Mode (no photo uploaded): Simulated intact sealed parcel specification.",
                    f"Expected destination: '{expected_address}'.",
                    "Upload a real delivery photo to run live Google Gemini Vision inspection.",
                ],
                "recommended_action": "CAPTURE_ESCROW",
            }
        elif package_scenario == "CRUSHED_DAMAGE":
            analysis = {
                "verdict": "CRITICAL_DAMAGE_DETECTED",
                "condition": "CRUSHED_SEVERELY_DEFORMED",
                "integrity_score": 0.12,
                "deformation_score": 0.88,
                "label_detected": True,
                "ocr_extracted": {
                    "carrier": "FedEx Express B2B",
                    "tracking_number": tracking_num,
                    "recipient": "AuroraPay Enterprise Procurement",
                    "destination_address": expected_address,
                    "tamper_tape_intact": False,
                    "delivery_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                },
                "vision_reasoning": [
                    "Scenario Test Mode (no photo uploaded): Simulated crushed parcel specification.",
                    "Upload a real delivery photo to run live Google Gemini Vision inspection.",
                ],
                "recommended_action": "FILE_PAYPAL_DISPUTE",
            }
        else:
            analysis = {
                "verdict": "ADDRESS_MISMATCH_SUSPECTED_FRAUD",
                "condition": "INTACT_WRONG_DESTINATION",
                "integrity_score": 0.45,
                "deformation_score": 0.10,
                "label_detected": True,
                "ocr_extracted": {
                    "carrier": "FedEx Express B2B",
                    "tracking_number": tracking_num,
                    "recipient": "Unknown Third-Party Entity",
                    "destination_address": "Flat 12B, Unregistered Residential Alley, Mumbai",
                    "tamper_tape_intact": True,
                    "delivery_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                },
                "vision_reasoning": [
                    "Scenario Test Mode (no photo uploaded): Simulated address mismatch specification.",
                    "Upload a real delivery photo to run live Google Gemini Vision inspection.",
                ],
                "recommended_action": "FILE_PAYPAL_DISPUTE",
            }

        return {
            "inspection_id": f"VIS-{uuid.uuid4().hex[:8].upper()}",
            "scenario": package_scenario,
            "engine": "Deterministic Test Scenario (No Image Uploaded)",
            "live_gemini_call": False,
            "photo_uploaded": False,
            "latency_ms": 0,
            "analysis": analysis,
        }
