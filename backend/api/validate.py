import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from decimal import Decimal, ROUND_HALF_UP
from core.database import get_db, MandateModel, TransactionModel
from core.guardrail import StrictGuardrailMiddleware
from schemas.schemas import TransactionValidationRequest, ValidationResponse

router = APIRouter(tags=["Validation Gate"])

@router.post("/api/validate_transaction", response_model=ValidationResponse)
def validate_transaction_endpoint(payload: TransactionValidationRequest, db: Session = Depends(get_db)):
    """
    STRICT INTERCEPTOR MIDDLEWARE:
    Validates any simulated AI procurement request against the Pydantic Mandate
    and OpenGuardrails invariants.
    
    MUST return HTTP 403 FORBIDDEN if the AI tries to exceed limits or breaches rules.
    """
    mandate = db.query(MandateModel).filter(MandateModel.is_active == True).first()
    if not mandate:
        mandate = MandateModel()
        db.add(mandate)
        db.commit()
        db.refresh(mandate)

    # Compute spent so far in active escrow
    active_txs = db.query(TransactionModel).filter(TransactionModel.status.in_(["AUTHORIZED", "CAPTURED"])).all()
    spent_so_far = sum((Decimal(str(tx.amount)) for tx in active_txs), Decimal("0.00"))

    approved, reason, risk_score = StrictGuardrailMiddleware.evaluate(
        item_name=payload.item_name,
        category=payload.category,
        amount=payload.amount,
        max_spend=Decimal(str(mandate.max_single_spend)),
        remaining_budget=Decimal(str(mandate.remaining_budget)),
        allowed_categories=mandate.allowed_categories,
        description=payload.description or "",
        spent_so_far=spent_so_far,
        total_mandate_limit=Decimal(str(mandate.total_budget))
    )

    if not approved:
        sanitized_reason = StrictGuardrailMiddleware.mask_secrets(reason)
        masked_item = StrictGuardrailMiddleware.mask_secrets(payload.item_name)
        
        # Log blocked transaction into ledger
        blocked_tx = TransactionModel(
            id=f"TX-{uuid.uuid4().hex[:8].upper()}",
            item_name=masked_item,
            category=payload.category,
            amount=payload.amount,
            currency="INR",
            merchant_name=payload.merchant_name,
            status="BLOCKED",
            block_reason=sanitized_reason,
            delivery_status="REJECTED"
        )
        db.add(blocked_tx)
        db.commit()

        # STRICT 403 FORBIDDEN
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "GuardrailInterceptionError",
                "message": sanitized_reason,
                "risk_score": risk_score,
                "amount": payload.amount,
                "category": payload.category,
                "transaction_id": blocked_tx.id
            }
        )

    return ValidationResponse(
        approved=True,
        status="APPROVED",
        risk_score=risk_score,
        reason=reason,
        timestamp=datetime.utcnow().isoformat()
    )

