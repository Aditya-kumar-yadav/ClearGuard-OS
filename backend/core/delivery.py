"""
ClearGuard-OS Delivery Verification & Reviewer Audit Module
Stage 5B Implementation

Manages the post-authorization delivery evidence and manual verification lifecycle:
- DELIVERY_EVIDENCE_SUBMITTED
- DELIVERY_REVIEW_PENDING
- DELIVERY_VERIFIED
- DELIVERY_REJECTED

Enforces strict maker-checker segregation of duties:
- The authenticated submitter cannot review or approve their own evidence.
- Reviewer identity is bound exclusively to authenticated credentials, never request body fields.
- Proof-of-delivery references are explicitly marked as NOT independently authenticated
  due to absence of live carrier webhook/signature integrations.
- Payment status remains strictly separate from delivery verification status.
"""

from enum import Enum
from datetime import datetime
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field, validator
from fastapi import HTTPException, status

from core.auth import AuthenticatedUser, UserRole


class DeliveryState(str, Enum):
    AWAITING_DELIVERY = "AWAITING_DELIVERY"
    DELIVERY_EVIDENCE_SUBMITTED = "DELIVERY_EVIDENCE_SUBMITTED"
    DELIVERY_REVIEW_PENDING = "DELIVERY_REVIEW_PENDING"
    DELIVERY_VERIFIED = "DELIVERY_VERIFIED"
    DELIVERY_REJECTED = "DELIVERY_REJECTED"


class EvidenceType(str, Enum):
    PHYSICAL_INSPECTION_POD = "PHYSICAL_INSPECTION_POD"
    CARRIER_WAYBILL = "CARRIER_WAYBILL"
    DELIVERY_RECEIPT = "DELIVERY_RECEIPT"
    DEMO_SIMULATED_POD = "DEMO_SIMULATED_POD"


class ReviewDecision(str, Enum):
    APPROVE = "APPROVE"
    REJECT = "REJECT"


class DeliveryEvidenceSubmissionRequest(BaseModel):
    transaction_id: str = Field(..., description="Target internal transaction ID")
    evidence_type: EvidenceType = Field(..., description="Category of physical or simulated POD evidence")
    carrier_name: Optional[str] = Field(None, description="Carrier name (e.g. FedEx, BlueDart, DHL)")
    tracking_reference: Optional[str] = Field(None, description="Waybill or tracking number")
    evidence_reference: str = Field(..., min_length=1, description="Document URL, photo hash, or docket reference")
    notes: Optional[str] = Field(None, description="Submitter remarks or drop-off notes")
    supersedes_version: Optional[int] = Field(None, description="Optional previous version superseded by this submission")

    # Anti-spoofing fields: if provided, must match authenticated user
    submitter_id: Optional[str] = Field(None, description="Optional check; if provided must match auth identity")


class DeliveryReviewRequest(BaseModel):
    transaction_id: str = Field(..., description="Target internal transaction ID")
    decision: ReviewDecision = Field(..., description="APPROVE to verify delivery, REJECT to deny")
    review_notes: str = Field(..., min_length=1, description="Auditor reasoning and justification")

    # Anti-spoofing fields: if provided, must match authenticated user
    reviewer_id: Optional[str] = Field(None, description="Optional check; if provided must match auth identity")
    verified_by: Optional[str] = Field(None, description="Optional legacy check; if provided must match auth identity")


class DeliveryEvidenceRecord(BaseModel):
    transaction_id: str
    evidence_type: str
    version: int = 1
    supersedes_version: Optional[int] = None
    evidence_hash: Optional[str] = None
    carrier_name: Optional[str] = None
    tracking_reference: Optional[str] = None
    evidence_reference: str
    submission_timestamp: str
    authenticated_submitter: str
    authenticated_reviewer: Optional[str] = None
    review_timestamp: Optional[str] = None
    review_decision: Optional[str] = None
    review_notes: Optional[str] = None
    independently_authenticated: bool = False
    independent_authentication_reason: str = (
        "No live carrier API or cryptographic webhook signature integration exists. "
        "Evidence is manually verified by authenticated human reviewer."
    )


def validate_submitter_spoofing(req: DeliveryEvidenceSubmissionRequest, user: AuthenticatedUser) -> None:
    """Rejects requests attempting to forge submitter identity in request body."""
    if req.submitter_id and req.submitter_id != user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Identity spoofing detected: request body submitter_id '{req.submitter_id}' does not match authenticated user '{user.user_id}'."
        )


def validate_reviewer_spoofing(req: DeliveryReviewRequest, user: AuthenticatedUser) -> None:
    """Rejects requests attempting to forge reviewer identity in request body."""
    claimed_id = req.reviewer_id or req.verified_by
    if claimed_id and claimed_id != user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Identity spoofing detected: request body reviewer identity '{claimed_id}' does not match authenticated user '{user.user_id}'."
        )


def enforce_maker_checker(evidence_record: Dict[str, Any], reviewer: AuthenticatedUser) -> None:
    """
    Maker-Checker Segregation of Duties:
    The authenticated submitter cannot review or approve their own delivery evidence,
    regardless of reviewer role or admin privileges.
    """
    submitter_id = evidence_record.get("authenticated_submitter")
    if submitter_id and submitter_id == reviewer.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Maker-checker violation: submitter cannot review or approve their own delivery evidence."
        )

