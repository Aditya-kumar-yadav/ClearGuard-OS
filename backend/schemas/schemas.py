import re
from typing import Optional, List, Dict, Any, Union
from decimal import Decimal, ROUND_HALF_UP, InvalidOperation
from pydantic import BaseModel, Field, field_validator, model_validator

def coerce_currency_decimal(v: Any) -> Decimal:
    """
    Precision Financial Math Coercion:
    Eradicates IEEE-754 floating-point drift by casting inputs strictly
    to Python's decimal.Decimal, quantized to exactly 2 decimal places with ROUND_HALF_UP.
    Guarantees:
      - 0.1 + 0.2 == 0.30 (not 0.30000000000000004)
      - Incoming "1150", 1150.0, 1150.009 -> Decimal("1150.00") or rounded half up
      - Strict positive bounds (> 0.00)
    """
    if v is None:
        raise ValueError("Currency value cannot be None")
    
    try:
        # Convert through string representation to prevent binary float inaccuracies
        if isinstance(v, (int, float, str, Decimal)):
            dec = Decimal(str(v)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        else:
            dec = Decimal(str(v)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    except (InvalidOperation, ValueError, TypeError) as err:
        raise ValueError(f"Invalid monetary format '{v}': cannot cast to Decimal(0.01). Detail: {err}")

    if dec <= Decimal("0.00"):
        raise ValueError(f"Currency amount must be strictly greater than 0.00 (received {dec})")
    
    return dec

class SpendingMandateSchema(BaseModel):
    name: Optional[str] = "Autonomous Enterprise Spending Mandate"
    max_single_spend: Decimal = Field(default=Decimal("55000.00"), description="Max spend per transaction strictly > 0")
    total_budget: Decimal = Field(default=Decimal("250000.00"), description="Total budget pool strictly > 0")
    remaining_budget: Optional[Decimal] = Field(default=Decimal("150000.00"), description="Remaining pool liquidity")
    allowed_categories: str = "electronics,hardware,cloud,office"
    require_escrow: bool = True
    currency: str = "INR"

    @field_validator("max_single_spend", "total_budget", "remaining_budget", mode="before")
    @classmethod
    def validate_decimals(cls, v: Any) -> Decimal:
        if v is None:
            return Decimal("0.00")
        return coerce_currency_decimal(v)

class TransactionValidationRequest(BaseModel):
    item_name: str = Field(..., min_length=2, description="Procurement item name")
    category: str = Field(..., min_length=2, description="Merchant commercial category")
    amount: Decimal = Field(..., description="Monetary transaction amount (strictly 2 decimal places)")
    merchant_name: Optional[str] = "Commercial Merchant"
    description: Optional[str] = ""
    user_id: Optional[str] = "usr_procurement_01"
    idempotency_key: Optional[str] = None

    @field_validator("amount", mode="before")
    @classmethod
    def validate_amount(cls, v: Any) -> Decimal:
        return coerce_currency_decimal(v)

class ValidationResponse(BaseModel):
    approved: bool
    status: str
    risk_score: Decimal = Decimal("0.00")
    reason: str
    amount: Decimal
    category: str
    timestamp: str

    @field_validator("amount", "risk_score", mode="before")
    @classmethod
    def validate_response_decimals(cls, v: Any) -> Decimal:
        if v is None:
            return Decimal("0.00")
        return Decimal(str(v)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

class WebhookTriggerRequest(BaseModel):
    event_type: str = Field(..., description="DELIVERY_CONFIRMED, REPORT_DISPUTE, LOST_PACKAGE")
    transaction_id: Optional[str] = None
    order_id: Optional[str] = None
    evidence: Optional[str] = None

class ProcureItemRequest(BaseModel):
    name: str = Field(..., min_length=2)
    category: str = Field(default="electronics")
    amount: Decimal = Field(..., description="Monetary amount strictly quantized to 2 decimal places")
    merchant: Optional[str] = "Commercial Merchant"
    description: Optional[str] = ""
    idempotency_key: Optional[str] = None

    @field_validator("amount", mode="before")
    @classmethod
    def validate_procure_amount(cls, v: Any) -> Decimal:
        return coerce_currency_decimal(v)

class PayPalOrderResponse(BaseModel):
    order_id: Optional[str] = None
    auth_id: Optional[str] = None
    status: str
    amount: Decimal
    currency: str = "INR"
    live_call: bool = False
    idempotency_key: Optional[str] = None

    @field_validator("amount", mode="before")
    @classmethod
    def validate_order_amount(cls, v: Any) -> Decimal:
        if v is None:
            return Decimal("0.00")
        return Decimal(str(v)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

