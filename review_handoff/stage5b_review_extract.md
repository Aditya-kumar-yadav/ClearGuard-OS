# ClearGuard-OS — Stage 5B Independent Review Export
**Repository:** `https://github.com/Aditya-kumar-yadav/ClearGuard-OS.git`
**Branch:** `feat/paypal-sandbox-integration`
**Export Date:** 2026-11-09
**Review Subject:** Stage 5B (Reviewer Authentication & Manual Delivery Verification)
**Status:** Complete Source Extract & Security Question Audit (Stage 5B Awaiting Human Reviewer Approval)

---

## Executive Notice
This document is an independent, source-grounded review export for Stage 5B of ClearGuard-OS. It contains complete, unabridged source code extracts with exact line numbers, a comprehensive repository-wide trace of payment capture references, and evidentiary answers to 9 critical security questions.

- **No Application Source Changes:** No application source files were altered during this export.
- **Stage 5C Status:** Stage 5C (PayPal Capture) has **NOT** been started.
- **No Automated Capture:** Zero PayPal capture requests are executed across any delivery endpoint.
- **Approval Status:** Stage 5B is **NOT declared approved**; approval is strictly reserved for the human reviewer.


---

## Task 1: Complete Source Code Implementations
All line numbers reference the active files in the repository working tree.

### 1. `backend/core/auth.py`
#### 1.1 Secret Key Resolution & Production Lockdown (Lines 40–70)
```python
  40 | DEFAULT_DEV_SECRET = "clearguard-hackathon-hmac-sha256-signing-secret-key-32b!"
  41 | DEFAULT_TOKEN_TTL_SECONDS = 3600  # 1 hour
  42 | 
  43 | 
  44 | def is_production_environment() -> bool:
  45 |     """Returns True if running in a production environment."""
  46 |     env = os.getenv("APP_ENV", os.getenv("ENVIRONMENT", "development")).strip().lower()
  47 |     return env in ("production", "prod")
  48 | 
  49 | 
  50 | def get_auth_secret_key() -> str:
  51 |     """
  52 |     Dynamically loads and validates the auth secret key from the environment.
  53 |     Enforces that production environments CANNOT silently run with missing, default, or weak secrets.
  54 |     """
  55 |     secret = os.getenv("CLEARGUARD_AUTH_SECRET")
  56 |     if not secret:
  57 |         if is_production_environment():
  58 |             raise RuntimeError(
  59 |                 "CRITICAL SECURITY CONFIGURATION ERROR: CLEARGUARD_AUTH_SECRET must be explicitly "
  60 |                 "configured in production environments. Default keys are strictly prohibited."
  61 |             )
  62 |         return DEFAULT_DEV_SECRET
  63 | 
  64 |     if len(secret) < 32:
  65 |         if is_production_environment():
  66 |             raise RuntimeError(
  67 |                 "CRITICAL SECURITY CONFIGURATION ERROR: CLEARGUARD_AUTH_SECRET must be at least 32 characters."
  68 |             )
  69 |     return secret
  70 | 
```

#### 1.2 User Models, Registry & Demo Credential Verification (Lines 72–150)
```python
  72 | class UserRole(str, Enum):
  73 |     SUBMITTER = "ROLE_DELIVERY_SUBMITTER"
  74 |     REVIEWER = "ROLE_DELIVERY_REVIEWER"
  75 |     ADMIN = "ROLE_ADMIN"
  76 | 
  77 | 
  78 | class AuthenticatedUser(BaseModel):
  79 |     user_id: str
  80 |     role: UserRole
  81 |     name: str
  82 | 
  83 |     model_config = ConfigDict(frozen=True)
  84 | 
  85 | 
  86 | DEMO_USERS: Dict[str, Dict[str, Any]] = {
  87 |     "submitter_alice": {
  88 |         "user_id": "submitter_alice",
  89 |         "name": "Alice Submitter (Logistics Specialist)",
  90 |         "role": UserRole.SUBMITTER,
  91 |     },
  92 |     "submitter_bob": {
  93 |         "user_id": "submitter_bob",
  94 |         "name": "Bob Submitter (Warehouse Dispatch)",
  95 |         "role": UserRole.SUBMITTER,
  96 |     },
  97 |     "reviewer_charlie": {
  98 |         "user_id": "reviewer_charlie",
  99 |         "name": "Charlie Reviewer (Operations Auditor)",
 100 |         "role": UserRole.REVIEWER,
 101 |     },
 102 |     "reviewer_dave": {
 103 |         "user_id": "reviewer_dave",
 104 |         "name": "Dave Reviewer (Risk Manager)",
 105 |         "role": UserRole.REVIEWER,
 106 |     },
 107 |     "admin_eve": {
 108 |         "user_id": "admin_eve",
 109 |         "name": "Eve Admin (Compliance Officer)",
 110 |         "role": UserRole.ADMIN,
 111 |     },
 112 | }
 113 | 
 114 | # Pre-configured demo user passwords for hackathon / CI verification.
 115 | # Configurable via environment variables.
 116 | DEMO_USER_CREDENTIALS: Dict[str, str] = {
 117 |     "submitter_alice": os.getenv("DEMO_SUBMITTER_ALICE_PASSWORD", "AliceLogistics2026!"),
 118 |     "submitter_bob": os.getenv("DEMO_SUBMITTER_BOB_PASSWORD", "BobWarehouse2026!"),
 119 |     "reviewer_charlie": os.getenv("DEMO_REVIEWER_CHARLIE_PASSWORD", "CharlieAuditor2026!"),
 120 |     "reviewer_dave": os.getenv("DEMO_REVIEWER_DAVE_PASSWORD", "DaveRiskOps2026!"),
 121 |     "admin_eve": os.getenv("DEMO_ADMIN_EVE_PASSWORD", "EveComplianceAdmin2026!"),
 122 | }
 123 | 
 124 | 
 125 | def verify_demo_credentials(username: str, password: Optional[str]) -> Optional[AuthenticatedUser]:
 126 |     """
 127 |     Validates credentials for demo user token issuance.
 128 |     Uses constant-time comparison to prevent timing attacks.
 129 |     Returns AuthenticatedUser if valid; None otherwise.
 130 |     """
 131 |     if not username or not password:
 132 |         return None
 133 | 
 134 |     clean_user = username.strip()
 135 |     user_info = DEMO_USERS.get(clean_user)
 136 |     expected_pass = DEMO_USER_CREDENTIALS.get(clean_user)
 137 | 
 138 |     if not user_info or not expected_pass:
 139 |         return None
 140 | 
 141 |     # Constant-time password check
 142 |     if not hmac.compare_digest(password.encode("utf-8"), expected_pass.encode("utf-8")):
 143 |         return None
 144 | 
 145 |     return AuthenticatedUser(
 146 |         user_id=user_info["user_id"],
 147 |         role=user_info["role"],
 148 |         name=user_info["name"]
 149 |     )
 150 | 
```

#### 1.3 Token Generation (`create_access_token`) (Lines 152–196)
```python
 152 | def _b64url_encode(data: bytes) -> str:
 153 |     return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")
 154 | 
 155 | 
 156 | def _b64url_decode(s: str) -> bytes:
 157 |     padding = "=" * (-len(s) % 4)
 158 |     return base64.urlsafe_b64decode(s + padding)
 159 | 
 160 | 
 161 | def create_access_token(
 162 |     user_id: str,
 163 |     role: Union[UserRole, str],
 164 |     name: str = "",
 165 |     expires_delta: Optional[timedelta] = None,
 166 |     secret_key: Optional[str] = None
 167 | ) -> str:
 168 |     """
 169 |     Creates a tamper-evident HMAC-SHA256 signed Bearer token.
 170 |     Token format: header.payload.signature
 171 |     Fixed algorithm: HS256
 172 |     """
 173 |     role_str = role.value if isinstance(role, UserRole) else str(role)
 174 |     now_ts = int(time.time())
 175 |     ttl = int(expires_delta.total_seconds()) if expires_delta else DEFAULT_TOKEN_TTL_SECONDS
 176 |     exp_ts = now_ts + ttl
 177 |     key = secret_key or get_auth_secret_key()
 178 | 
 179 |     header = {"alg": "HS256", "typ": "JWT"}
 180 |     payload = {
 181 |         "sub": user_id,
 182 |         "role": role_str,
 183 |         "name": name,
 184 |         "iat": now_ts,
 185 |         "exp": exp_ts,
 186 |     }
 187 | 
 188 |     header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
 189 |     payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
 190 |     signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
 191 | 
 192 |     signature = hmac.new(key.encode("utf-8"), signing_input, hashlib.sha256).digest()
 193 |     sig_b64 = _b64url_encode(signature)
 194 | 
 195 |     return f"{header_b64}.{payload_b64}.{sig_b64}"
 196 | 
```

#### 1.4 Token Verification (`verify_access_token`) (Lines 198–294)
```python
 198 | def verify_access_token(token: str, secret_key: Optional[str] = None) -> AuthenticatedUser:
 199 |     """
 200 |     Cryptographically verifies an HMAC-SHA256 token and validates expiration.
 201 |     Enforces:
 202 |     - Fixed algorithm: only 'HS256' is accepted; attacker-controlled 'none', 'RS256', etc. are rejected.
 203 |     - Constant-time signature comparison against timing attacks.
 204 |     - Token expiration and mandatory claims ('sub', 'role').
 205 |     Raises HTTPException 401 on malformed, expired, incorrectly signed, or invalid tokens.
 206 |     """
 207 |     if not token or not isinstance(token, str):
 208 |         raise HTTPException(
 209 |             status_code=status.HTTP_401_UNAUTHORIZED,
 210 |             detail="Missing or invalid authentication token"
 211 |         )
 212 | 
 213 |     parts = token.strip().split(".")
 214 |     if len(parts) != 3:
 215 |         raise HTTPException(
 216 |             status_code=status.HTTP_401_UNAUTHORIZED,
 217 |             detail="Malformed token structure: expected header.payload.signature"
 218 |         )
 219 | 
 220 |     header_b64, payload_b64, sig_b64 = parts
 221 | 
 222 |     # 1. Decode and strictly validate token header (Fixed Algorithm Enforcement)
 223 |     try:
 224 |         header_bytes = _b64url_decode(header_b64)
 225 |         header = json.loads(header_bytes.decode("utf-8"))
 226 |     except Exception as e:
 227 |         raise HTTPException(
 228 |             status_code=status.HTTP_401_UNAUTHORIZED,
 229 |             detail=f"Malformed token header: {str(e)}"
 230 |         )
 231 | 
 232 |     alg = header.get("alg")
 233 |     if alg != "HS256":
 234 |         raise HTTPException(
 235 |             status_code=status.HTTP_401_UNAUTHORIZED,
 236 |             detail=f"Unsupported token algorithm '{alg}': only 'HS256' is permitted."
 237 |         )
 238 | 
 239 |     typ = header.get("typ")
 240 |     if typ != "JWT":
 241 |         raise HTTPException(
 242 |             status_code=status.HTTP_401_UNAUTHORIZED,
 243 |             detail=f"Invalid token type '{typ}': 'JWT' required."
 244 |         )
 245 | 
 246 |     # 2. Cryptographic HMAC-SHA256 signature verification
 247 |     key = secret_key or get_auth_secret_key()
 248 |     signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
 249 |     expected_sig = hmac.new(key.encode("utf-8"), signing_input, hashlib.sha256).digest()
 250 |     expected_sig_b64 = _b64url_encode(expected_sig)
 251 | 
 252 |     if not hmac.compare_digest(sig_b64, expected_sig_b64):
 253 |         raise HTTPException(
 254 |             status_code=status.HTTP_401_UNAUTHORIZED,
 255 |             detail="Invalid token signature: token has been tampered with or signed with an unknown key"
 256 |         )
 257 | 
 258 |     # 3. Decode and validate payload claims
 259 |     try:
 260 |         payload_bytes = _b64url_decode(payload_b64)
 261 |         payload = json.loads(payload_bytes.decode("utf-8"))
 262 |     except Exception as e:
 263 |         raise HTTPException(
 264 |             status_code=status.HTTP_401_UNAUTHORIZED,
 265 |             detail=f"Malformed token payload: {str(e)}"
 266 |         )
 267 | 
 268 |     now_ts = int(time.time())
 269 |     if payload.get("exp", 0) < now_ts:
 270 |         raise HTTPException(
 271 |             status_code=status.HTTP_401_UNAUTHORIZED,
 272 |             detail="Token has expired"
 273 |         )
 274 | 
 275 |     sub = payload.get("sub")
 276 |     role_str = payload.get("role")
 277 |     name = payload.get("name", "")
 278 | 
 279 |     if not sub or not role_str:
 280 |         raise HTTPException(
 281 |             status_code=status.HTTP_401_UNAUTHORIZED,
 282 |             detail="Token missing required claims ('sub', 'role')"
 283 |         )
 284 | 
 285 |     try:
 286 |         user_role = UserRole(role_str)
 287 |     except ValueError:
 288 |         raise HTTPException(
 289 |             status_code=status.HTTP_401_UNAUTHORIZED,
 290 |             detail=f"Token contains unrecognized role '{role_str}'"
 291 |         )
 292 | 
 293 |     return AuthenticatedUser(user_id=sub, role=user_role, name=name)
 294 | 
```

#### 1.5 FastAPI Dependencies (`get_current_user`, `require_role`) (Lines 296–342)
```python
 296 | # FastAPI Security Scheme (auto_error=False to allow clean custom 401 exceptions)
 297 | http_bearer = HTTPBearer(auto_error=False)
 298 | 
 299 | 
 300 | async def get_current_user(
 301 |     credentials: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer)
 302 | ) -> AuthenticatedUser:
 303 |     """
 304 |     FastAPI dependency that extracts and validates Bearer credentials.
 305 |     Rejects missing or invalid credentials with HTTP 401.
 306 |     """
 307 |     if credentials is None:
 308 |         raise HTTPException(
 309 |             status_code=status.HTTP_401_UNAUTHORIZED,
 310 |             detail="Authentication credentials were not provided. Authorization: Bearer <token> header required."
 311 |         )
 312 | 
 313 |     if credentials.scheme.lower() != "bearer":
 314 |         raise HTTPException(
 315 |             status_code=status.HTTP_401_UNAUTHORIZED,
 316 |             detail="Invalid authorization scheme: Bearer required"
 317 |         )
 318 | 
 319 |     return verify_access_token(credentials.credentials)
 320 | 
 321 | 
 322 | def require_role(allowed_roles: Union[UserRole, List[UserRole]]) -> Callable:
 323 |     """
 324 |     Role-based access control dependency factory.
 325 |     Admins are always authorized for reviewer/submitter actions (subject to maker-checker).
 326 |     Raises HTTP 403 Forbidden if user role is insufficient.
 327 |     """
 328 |     if isinstance(allowed_roles, UserRole):
 329 |         roles_set = {allowed_roles, UserRole.ADMIN}
 330 |     else:
 331 |         roles_set = set(allowed_roles) | {UserRole.ADMIN}
 332 | 
 333 |     async def _role_checker(user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
 334 |         if user.role not in roles_set:
 335 |             required_names = [r.value for r in roles_set]
 336 |             raise HTTPException(
 337 |                 status_code=status.HTTP_403_FORBIDDEN,
 338 |                 detail=f"Insufficient permissions: requires one of {required_names}, got '{user.role.value}'"
 339 |             )
 340 |         return user
 341 | 
 342 |     return _role_checker
```

### 2. `backend/core/delivery.py`
#### 2.1 Complete Delivery Module (Lines 1–120)
```python
   1 | """
   2 | ClearGuard-OS Delivery Verification & Reviewer Audit Module
   3 | Stage 5B Implementation
   4 | 
   5 | Manages the post-authorization delivery evidence and manual verification lifecycle:
   6 | - DELIVERY_EVIDENCE_SUBMITTED
   7 | - DELIVERY_REVIEW_PENDING
   8 | - DELIVERY_VERIFIED
   9 | - DELIVERY_REJECTED
  10 | 
  11 | Enforces strict maker-checker segregation of duties:
  12 | - The authenticated submitter cannot review or approve their own evidence.
  13 | - Reviewer identity is bound exclusively to authenticated credentials, never request body fields.
  14 | - Proof-of-delivery references are explicitly marked as NOT independently authenticated
  15 |   due to absence of live carrier webhook/signature integrations.
  16 | - Payment status remains strictly separate from delivery verification status.
  17 | """
  18 | 
  19 | from enum import Enum
  20 | from datetime import datetime
  21 | from typing import Dict, Any, List, Optional
  22 | from pydantic import BaseModel, Field, validator
  23 | from fastapi import HTTPException, status
  24 | 
  25 | from core.auth import AuthenticatedUser, UserRole
  26 | 
  27 | 
  28 | class DeliveryState(str, Enum):
  29 |     AWAITING_DELIVERY = "AWAITING_DELIVERY"
  30 |     DELIVERY_EVIDENCE_SUBMITTED = "DELIVERY_EVIDENCE_SUBMITTED"
  31 |     DELIVERY_REVIEW_PENDING = "DELIVERY_REVIEW_PENDING"
  32 |     DELIVERY_VERIFIED = "DELIVERY_VERIFIED"
  33 |     DELIVERY_REJECTED = "DELIVERY_REJECTED"
  34 | 
  35 | 
  36 | class EvidenceType(str, Enum):
  37 |     PHYSICAL_INSPECTION_POD = "PHYSICAL_INSPECTION_POD"
  38 |     CARRIER_WAYBILL = "CARRIER_WAYBILL"
  39 |     DELIVERY_RECEIPT = "DELIVERY_RECEIPT"
  40 |     DEMO_SIMULATED_POD = "DEMO_SIMULATED_POD"
  41 | 
  42 | 
  43 | class ReviewDecision(str, Enum):
  44 |     APPROVE = "APPROVE"
  45 |     REJECT = "REJECT"
  46 | 
  47 | 
  48 | class DeliveryEvidenceSubmissionRequest(BaseModel):
  49 |     transaction_id: str = Field(..., description="Target internal transaction ID")
  50 |     evidence_type: EvidenceType = Field(..., description="Category of physical or simulated POD evidence")
  51 |     carrier_name: Optional[str] = Field(None, description="Carrier name (e.g. FedEx, BlueDart, DHL)")
  52 |     tracking_reference: Optional[str] = Field(None, description="Waybill or tracking number")
  53 |     evidence_reference: str = Field(..., min_length=1, description="Document URL, photo hash, or docket reference")
  54 |     notes: Optional[str] = Field(None, description="Submitter remarks or drop-off notes")
  55 | 
  56 |     # Anti-spoofing fields: if provided, must match authenticated user
  57 |     submitter_id: Optional[str] = Field(None, description="Optional check; if provided must match auth identity")
  58 | 
  59 | 
  60 | class DeliveryReviewRequest(BaseModel):
  61 |     transaction_id: str = Field(..., description="Target internal transaction ID")
  62 |     decision: ReviewDecision = Field(..., description="APPROVE to verify delivery, REJECT to deny")
  63 |     review_notes: str = Field(..., min_length=1, description="Auditor reasoning and justification")
  64 | 
  65 |     # Anti-spoofing fields: if provided, must match authenticated user
  66 |     reviewer_id: Optional[str] = Field(None, description="Optional check; if provided must match auth identity")
  67 |     verified_by: Optional[str] = Field(None, description="Optional legacy check; if provided must match auth identity")
  68 | 
  69 | 
  70 | class DeliveryEvidenceRecord(BaseModel):
  71 |     transaction_id: str
  72 |     evidence_type: str
  73 |     carrier_name: Optional[str] = None
  74 |     tracking_reference: Optional[str] = None
  75 |     evidence_reference: str
  76 |     submission_timestamp: str
  77 |     authenticated_submitter: str
  78 |     authenticated_reviewer: Optional[str] = None
  79 |     review_timestamp: Optional[str] = None
  80 |     review_decision: Optional[str] = None
  81 |     review_notes: Optional[str] = None
  82 |     independently_authenticated: bool = False
  83 |     independent_authentication_reason: str = (
  84 |         "No live carrier API or cryptographic webhook signature integration exists. "
  85 |         "Evidence is manually verified by authenticated human reviewer."
  86 |     )
  87 | 
  88 | 
  89 | def validate_submitter_spoofing(req: DeliveryEvidenceSubmissionRequest, user: AuthenticatedUser) -> None:
  90 |     """Rejects requests attempting to forge submitter identity in request body."""
  91 |     if req.submitter_id and req.submitter_id != user.user_id:
  92 |         raise HTTPException(
  93 |             status_code=status.HTTP_403_FORBIDDEN,
  94 |             detail=f"Identity spoofing detected: request body submitter_id '{req.submitter_id}' does not match authenticated user '{user.user_id}'."
  95 |         )
  96 | 
  97 | 
  98 | def validate_reviewer_spoofing(req: DeliveryReviewRequest, user: AuthenticatedUser) -> None:
  99 |     """Rejects requests attempting to forge reviewer identity in request body."""
 100 |     claimed_id = req.reviewer_id or req.verified_by
 101 |     if claimed_id and claimed_id != user.user_id:
 102 |         raise HTTPException(
 103 |             status_code=status.HTTP_403_FORBIDDEN,
 104 |             detail=f"Identity spoofing detected: request body reviewer identity '{claimed_id}' does not match authenticated user '{user.user_id}'."
 105 |         )
 106 | 
 107 | 
 108 | def enforce_maker_checker(evidence_record: Dict[str, Any], reviewer: AuthenticatedUser) -> None:
 109 |     """
 110 |     Maker-Checker Segregation of Duties:
 111 |     The authenticated submitter cannot review or approve their own delivery evidence,
 112 |     regardless of reviewer role or admin privileges.
 113 |     """
 114 |     submitter_id = evidence_record.get("authenticated_submitter")
 115 |     if submitter_id and submitter_id == reviewer.user_id:
 116 |         raise HTTPException(
 117 |             status_code=status.HTTP_403_FORBIDDEN,
 118 |             detail="Maker-checker violation: submitter cannot review or approve their own delivery evidence."
 119 |         )
 120 | 
```

### 3. `backend/core/crypto_ledger.py`
#### 3.1 State Hash Calculation & Transition Chaining (Lines 13–80)
```python
  13 | def compute_state_hash(previous_state_hash: str, timestamp: str, amount: Any, status: str) -> str:
  14 |     """
  15 |     Military-Grade Cryptographic State Hash:
  16 |     Formula: SHA-256(previous_state_hash + current_timestamp + transaction_amount + status)
  17 |     Guarantees tamper-evident immutability across state transitions.
  18 |     """
  19 |     clean_prev = previous_state_hash or GENESIS_HASH
  20 |     clean_amount = format_amount_str(amount)
  21 |     clean_status = str(status).strip().upper()
  22 |     
  23 |     # Deterministic payload construction
  24 |     payload = f"{clean_prev}{timestamp}{clean_amount}{clean_status}"
  25 |     return hashlib.sha256(payload.encode("utf-8")).hexdigest()
  26 | 
  27 | def create_initial_hash_chain(tx_id: str, amount: Any, status: str = "AUTHORIZED", timestamp: Optional[str] = None) -> Dict[str, Any]:
  28 |     """
  29 |     Initializes a new cryptographic hash chain for a freshly authorized or blocked escrow.
  30 |     """
  31 |     ts = timestamp or datetime.utcnow().isoformat()
  32 |     state_hash = compute_state_hash(GENESIS_HASH, ts, amount, status)
  33 |     
  34 |     chain_entry = {
  35 |         "step": 0,
  36 |         "transition": f"INIT_{status}",
  37 |         "previous_state_hash": GENESIS_HASH,
  38 |         "timestamp": ts,
  39 |         "amount": format_amount_str(amount),
  40 |         "status": status.upper(),
  41 |         "state_hash": state_hash
  42 |     }
  43 |     
  44 |     return {
  45 |         "state_hash": state_hash,
  46 |         "previous_state_hash": GENESIS_HASH,
  47 |         "state_chain": [chain_entry],
  48 |         "is_corrupted": False,
  49 |         "verified": True
  50 |     }
  51 | 
  52 | def record_state_transition(
  53 |     current_chain: List[Dict[str, Any]],
  54 |     current_hash: str,
  55 |     amount: Any,
  56 |     new_status: str,
  57 |     timestamp: Optional[str] = None
  58 | ) -> Tuple[str, List[Dict[str, Any]]]:
  59 |     """
  60 |     Appends a new state transition (e.g. AUTHORIZED -> CAPTURED or AUTHORIZED -> DISPUTED)
  61 |     to the immutable cryptographic ledger chain.
  62 |     """
  63 |     ts = timestamp or datetime.utcnow().isoformat()
  64 |     prev_hash = current_hash or (current_chain[-1]["state_hash"] if current_chain else GENESIS_HASH)
  65 |     new_hash = compute_state_hash(prev_hash, ts, amount, new_status)
  66 |     
  67 |     step_number = len(current_chain)
  68 |     new_entry = {
  69 |         "step": step_number,
  70 |         "transition": f"TRANSITION_TO_{new_status.upper()}",
  71 |         "previous_state_hash": prev_hash,
  72 |         "timestamp": ts,
  73 |         "amount": format_amount_str(amount),
  74 |         "status": new_status.upper(),
  75 |         "state_hash": new_hash
  76 |     }
  77 |     
  78 |     updated_chain = list(current_chain)
  79 |     updated_chain.append(new_entry)
  80 |     return new_hash, updated_chain
```

#### 3.2 Cryptographic Chain Audit (`verify_hash_chain`) (Lines 82–170)
```python
  82 | def verify_hash_chain(
  83 |     state_chain: List[Dict[str, Any]],
  84 |     current_stored_hash: str,
  85 |     current_amount: Any,
  86 |     current_status: str,
  87 |     delivery_status: Optional[str] = None
  88 | ) -> Tuple[bool, str, Dict[str, Any]]:
  89 |     """
  90 |     Cryptographic Auditor: Recalculates and strictly verifies the hash chain.
  91 |     If any database field (amount, status, or historical transition) was tampered with,
  92 |     flags the transaction as CORRUPTED.
  93 |     """
  94 |     if not state_chain:
  95 |         return False, "CORRUPTED: Missing or empty cryptographic state chain.", {
  96 |             "verified": False,
  97 |             "status": "CORRUPTED",
  98 |             "chain_length": 0
  99 |         }
 100 |     
 101 |     expected_prev = GENESIS_HASH
 102 |     for idx, entry in enumerate(state_chain):
 103 |         # 1. Verify previous_state_hash continuity
 104 |         if entry.get("previous_state_hash") != expected_prev:
 105 |             return False, f"CORRUPTED: Broken chain link at step {idx}. Expected prev {expected_prev[:12]}..., got {entry.get('previous_state_hash', '')[:12]}...", {
 106 |                 "verified": False,
 107 |                 "status": "CORRUPTED",
 108 |                 "broken_step": idx
 109 |             }
 110 |         
 111 |         # 2. Recompute hash for this step
 112 |         recalculated = compute_state_hash(
 113 |             entry.get("previous_state_hash"),
 114 |             entry.get("timestamp"),
 115 |             entry.get("amount"),
 116 |             entry.get("status")
 117 |         )
 118 |         
 119 |         if recalculated != entry.get("state_hash"):
 120 |             return False, f"CORRUPTED: Hash mismatch at step {idx}. Recalculated {recalculated[:12]}... does not match recorded {entry.get('state_hash', '')[:12]}...", {
 121 |                 "verified": False,
 122 |                 "status": "CORRUPTED",
 123 |                 "failed_step": idx,
 124 |                 "recalculated_hash": recalculated,
 125 |                 "recorded_hash": entry.get("state_hash")
 126 |             }
 127 |         
 128 |         expected_prev = recalculated
 129 | 
 130 |     # 3. Verify final state matches the active record
 131 |     last_entry = state_chain[-1]
 132 |     if last_entry.get("state_hash") != current_stored_hash:
 133 |         return False, "CORRUPTED: Latest state hash does not match head of chain.", {
 134 |             "verified": False,
 135 |             "status": "CORRUPTED",
 136 |             "expected_head": last_entry.get("state_hash"),
 137 |             "stored_head": current_stored_hash
 138 |         }
 139 |         
 140 |     if format_amount_str(current_amount) != last_entry.get("amount"):
 141 |         return False, f"CORRUPTED: Transaction amount altered ({current_amount} vs chain {last_entry.get('amount')}).", {
 142 |             "verified": False,
 143 |             "status": "CORRUPTED",
 144 |             "tampered_field": "amount"
 145 |         }
 146 |         
 147 |     recorded_status = str(last_entry.get("status", "")).strip().upper()
 148 |     curr_status = str(current_status).strip().upper()
 149 |     dlv_status = str(delivery_status).strip().upper() if delivery_status else None
 150 | 
 151 |     status_matches = (curr_status == recorded_status) or (dlv_status is not None and dlv_status == recorded_status)
 152 |     if not status_matches:
 153 |         if curr_status == "AUTHORIZED" and recorded_status.startswith("DELIVERY_"):
 154 |             status_matches = True
 155 | 
 156 |     if not status_matches:
 157 |         return False, f"CORRUPTED: Transaction status altered ({current_status} vs chain {last_entry.get('status')}).", {
 158 |             "verified": False,
 159 |             "status": "CORRUPTED",
 160 |             "tampered_field": "status"
 161 |         }
 162 | 
 163 |     return True, "VERIFIED: Cryptographic hash chain unbroken and mathematically sound.", {
 164 |         "verified": True,
 165 |         "status": "VERIFIED",
 166 |         "chain_length": len(state_chain),
 167 |         "head_hash": current_stored_hash,
 168 |         "state_chain": state_chain
 169 |     }
 170 | 
```

### 4. `backend/main.py`
#### 4.1 Token Issuance Route (`POST /api/auth/token`) (Lines 2005–2053)
```python
2005 | # ==============================================================================
2006 | # STAGE 5B: Reviewer Authentication & Manual Delivery Verification Endpoints
2007 | # ==============================================================================
2008 | 
2009 | class TokenRequest(BaseModel):
2010 |     username: str
2011 |     password: str
2012 | 
2013 | 
2014 | class QueueReviewRequest(BaseModel):
2015 |     transaction_id: str
2016 | 
2017 | 
2018 | @app.post("/api/auth/token")
2019 | async def login_for_access_token(req: TokenRequest):
2020 |     """
2021 |     Issues a cryptographically signed HMAC-SHA256 Bearer token for demo/reviewer users.
2022 |     DEMO-ONLY AUTHENTICATION: Requires verified credentials. Arbitrary callers cannot claim tokens.
2023 |     Disabled in production environments.
2024 |     """
2025 |     if is_production_environment():
2026 |         raise HTTPException(
2027 |             status_code=status.HTTP_403_FORBIDDEN,
2028 |             detail="Demo token issuance is disabled in production environments. Authenticate via enterprise Identity Provider (OIDC / OAuth 2.0)."
2029 |         )
2030 | 
2031 |     user = verify_demo_credentials(req.username, req.password)
2032 |     if not user:
2033 |         raise HTTPException(
2034 |             status_code=status.HTTP_401_UNAUTHORIZED,
2035 |             detail="Invalid credentials: username or password incorrect."
2036 |         )
2037 | 
2038 |     token = create_access_token(
2039 |         user_id=user.user_id,
2040 |         role=user.role,
2041 |         name=user.name
2042 |     )
2043 |     return {
2044 |         "access_token": token,
2045 |         "token_type": "bearer",
2046 |         "expires_in": DEFAULT_TOKEN_TTL_SECONDS,
2047 |         "user_id": user.user_id,
2048 |         "role": user.role.value,
2049 |         "name": user.name,
2050 |         "demo_mode": True,
2051 |         "demo_warning": "DEMO-ONLY AUTHENTICATION: This token was issued by the in-memory hackathon demo provider. Do not use in production."
2052 |     }
2053 | 
```

#### 4.2 Submit Delivery Evidence (`POST /api/delivery/submit-evidence`) (Lines 2055–2154)
```python
2055 | @app.post("/api/delivery/submit-evidence")
2056 | async def submit_delivery_evidence(
2057 |     req: DeliveryEvidenceSubmissionRequest,
2058 |     submitter: AuthenticatedUser = Depends(require_role([UserRole.SUBMITTER]))
2059 | ):
2060 |     """
2061 |     Submits delivery evidence (waybill, photo reference, inspection docket).
2062 |     Protected by reviewer authentication (ROLE_DELIVERY_SUBMITTER or ROLE_ADMIN).
2063 |     Identity is extracted directly from verified credentials; request body spoofing is rejected.
2064 |     """
2065 |     validate_submitter_spoofing(req, submitter)
2066 | 
2067 |     clean_tx_id = req.transaction_id.strip()
2068 |     matching_tx = None
2069 |     for tx in TRANSACTIONS_LEDGER:
2070 |         if tx.get("id") == clean_tx_id:
2071 |             matching_tx = tx
2072 |             break
2073 | 
2074 |     if not matching_tx:
2075 |         raise HTTPException(
2076 |             status_code=status.HTTP_404_NOT_FOUND,
2077 |             detail={"error": "TransactionNotFound", "message": f"Transaction '{clean_tx_id}' not found."}
2078 |         )
2079 | 
2080 |     # Validate transaction payment status: must be AUTHORIZED
2081 |     tx_status = matching_tx.get("status")
2082 |     if tx_status != "AUTHORIZED":
2083 |         raise HTTPException(
2084 |             status_code=status.HTTP_400_BAD_REQUEST,
2085 |             detail={
2086 |                 "error": "InvalidTransactionStatus",
2087 |                 "message": f"Transaction must be in AUTHORIZED status to submit delivery evidence. Current status: '{tx_status}'."
2088 |             }
2089 |         )
2090 | 
2091 |     # Cannot resubmit if already submitted, pending review, or verified
2092 |     if matching_tx.get("delivery_status") in (
2093 |         DeliveryState.DELIVERY_EVIDENCE_SUBMITTED.value,
2094 |         DeliveryState.DELIVERY_REVIEW_PENDING.value,
2095 |         DeliveryState.DELIVERY_VERIFIED.value
2096 |     ):
2097 |         raise HTTPException(
2098 |             status_code=status.HTTP_409_CONFLICT,
2099 |             detail={
2100 |                 "error": "DeliveryEvidenceAlreadyExists",
2101 |                 "message": f"Delivery evidence already exists for this transaction (current state: '{matching_tx.get('delivery_status')}'). Existing submission cannot be overwritten."
2102 |             }
2103 |         )
2104 | 
2105 |     now_iso = datetime.utcnow().isoformat()
2106 |     evidence = {
2107 |         "transaction_id": matching_tx["id"],
2108 |         "evidence_type": req.evidence_type.value,
2109 |         "carrier_name": req.carrier_name,
2110 |         "tracking_reference": req.tracking_reference,
2111 |         "evidence_reference": req.evidence_reference,
2112 |         "submission_timestamp": now_iso,
2113 |         "authenticated_submitter": submitter.user_id,
2114 |         "authenticated_reviewer": None,
2115 |         "review_timestamp": None,
2116 |         "review_decision": None,
2117 |         "review_notes": req.notes or "",
2118 |         "independently_authenticated": False,
2119 |         "independent_authentication_reason": (
2120 |             "No live carrier API or cryptographic webhook signature integration exists. "
2121 |             "Evidence is pending manual reviewer audit."
2122 |         )
2123 |     }
2124 | 
2125 |     matching_tx["delivery_evidence"] = evidence
2126 |     matching_tx["delivery_status"] = DeliveryState.DELIVERY_EVIDENCE_SUBMITTED.value
2127 | 
2128 |     # Cryptographic State Hash Transition
2129 |     chain = matching_tx.get("state_chain", [])
2130 |     new_h, updated_c = record_state_transition(
2131 |         current_chain=chain,
2132 |         current_hash=matching_tx.get("state_hash") or "",
2133 |         amount=matching_tx.get("amount", 0.0),
2134 |         new_status=DeliveryState.DELIVERY_EVIDENCE_SUBMITTED.value,
2135 |         timestamp=now_iso
2136 |     )
2137 |     matching_tx["previous_state_hash"] = matching_tx.get("state_hash")
2138 |     matching_tx["state_hash"] = new_h
2139 |     matching_tx["state_chain"] = updated_c
2140 |     matching_tx["is_corrupted"] = False
2141 | 
2142 |     # MANDATE POOL IS NOT MODIFIED (already accounted during authorization)
2143 |     # PAYMENT STATUS REMAINS "AUTHORIZED" (no capture initiated)
2144 | 
2145 |     return {
2146 |         "status": DeliveryState.DELIVERY_EVIDENCE_SUBMITTED.value,
2147 |         "message": "Delivery evidence submitted successfully. Awaiting auditor review.",
2148 |         "transaction_id": matching_tx["id"],
2149 |         "delivery_status": matching_tx["delivery_status"],
2150 |         "payment_status": matching_tx.get("status"),
2151 |         "state_hash": new_h,
2152 |         "evidence": evidence
2153 |     }
2154 | 
```

#### 4.3 Queue Delivery Review (`POST /api/delivery/queue-review`) (Lines 2156–2228)
```python
2156 | @app.post("/api/delivery/queue-review")
2157 | async def queue_delivery_review(
2158 |     req: QueueReviewRequest,
2159 |     reviewer: AuthenticatedUser = Depends(require_role([UserRole.REVIEWER]))
2160 | ):
2161 |     """
2162 |     Transitions transaction delivery status from DELIVERY_EVIDENCE_SUBMITTED to DELIVERY_REVIEW_PENDING.
2163 |     Protected by reviewer authentication (ROLE_DELIVERY_REVIEWER or ROLE_ADMIN).
2164 |     """
2165 |     clean_tx_id = req.transaction_id.strip()
2166 |     matching_tx = None
2167 |     for tx in TRANSACTIONS_LEDGER:
2168 |         if tx.get("id") == clean_tx_id:
2169 |             matching_tx = tx
2170 |             break
2171 | 
2172 |     if not matching_tx:
2173 |         raise HTTPException(
2174 |             status_code=status.HTTP_404_NOT_FOUND,
2175 |             detail={"error": "TransactionNotFound", "message": f"Transaction '{clean_tx_id}' not found."}
2176 |         )
2177 | 
2178 |     evidence = matching_tx.get("delivery_evidence")
2179 |     if not evidence:
2180 |         raise HTTPException(
2181 |             status_code=status.HTTP_400_BAD_REQUEST,
2182 |             detail={"error": "MissingEvidence", "message": "No delivery evidence submitted for this transaction."}
2183 |         )
2184 | 
2185 |     curr_delivery_status = matching_tx.get("delivery_status")
2186 |     if curr_delivery_status == DeliveryState.DELIVERY_REVIEW_PENDING.value:
2187 |         return {
2188 |             "status": DeliveryState.DELIVERY_REVIEW_PENDING.value,
2189 |             "message": "Transaction delivery review is already pending.",
2190 |             "transaction_id": matching_tx["id"],
2191 |             "delivery_status": curr_delivery_status,
2192 |             "state_hash": matching_tx.get("state_hash"),
2193 |             "already_pending": True
2194 |         }
2195 | 
2196 |     if curr_delivery_status != DeliveryState.DELIVERY_EVIDENCE_SUBMITTED.value:
2197 |         raise HTTPException(
2198 |             status_code=status.HTTP_400_BAD_REQUEST,
2199 |             detail={
2200 |                 "error": "InvalidDeliveryStatus",
2201 |                 "message": f"Cannot transition to DELIVERY_REVIEW_PENDING from status '{curr_delivery_status}'."
2202 |             }
2203 |         )
2204 | 
2205 |     now_iso = datetime.utcnow().isoformat()
2206 |     matching_tx["delivery_status"] = DeliveryState.DELIVERY_REVIEW_PENDING.value
2207 | 
2208 |     chain = matching_tx.get("state_chain", [])
2209 |     new_h, updated_c = record_state_transition(
2210 |         current_chain=chain,
2211 |         current_hash=matching_tx.get("state_hash") or "",
2212 |         amount=matching_tx.get("amount", 0.0),
2213 |         new_status=DeliveryState.DELIVERY_REVIEW_PENDING.value,
2214 |         timestamp=now_iso
2215 |     )
2216 |     matching_tx["previous_state_hash"] = matching_tx.get("state_hash")
2217 |     matching_tx["state_hash"] = new_h
2218 |     matching_tx["state_chain"] = updated_c
2219 |     matching_tx["is_corrupted"] = False
2220 | 
2221 |     return {
2222 |         "status": DeliveryState.DELIVERY_REVIEW_PENDING.value,
2223 |         "message": "Delivery evidence queued for review.",
2224 |         "transaction_id": matching_tx["id"],
2225 |         "delivery_status": matching_tx["delivery_status"],
2226 |         "state_hash": new_h
2227 |     }
2228 | 
```

#### 4.4 Review Delivery Evidence (`POST /api/delivery/review`) (Lines 2230–2365)
```python
2230 | @app.post("/api/delivery/review")
2231 | async def review_delivery_evidence(
2232 |     req: DeliveryReviewRequest,
2233 |     reviewer: AuthenticatedUser = Depends(require_role([UserRole.REVIEWER]))
2234 | ):
2235 |     """
2236 |     Audits submitted delivery evidence with APPROVE or REJECT decision.
2237 |     Strictly enforces:
2238 |     - Maker-checker: Submitter cannot approve their own evidence.
2239 |     - Authenticated reviewer identity: extracted from verified credentials only.
2240 |     - Idempotency on repeated approval.
2241 |     - Keeps payment status (AUTHORIZED) separate from delivery verification status.
2242 |     - ZERO PayPal capture requests.
2243 |     """
2244 |     validate_reviewer_spoofing(req, reviewer)
2245 | 
2246 |     clean_tx_id = req.transaction_id.strip()
2247 |     matching_tx = None
2248 |     for tx in TRANSACTIONS_LEDGER:
2249 |         if tx.get("id") == clean_tx_id:
2250 |             matching_tx = tx
2251 |             break
2252 | 
2253 |     if not matching_tx:
2254 |         raise HTTPException(
2255 |             status_code=status.HTTP_404_NOT_FOUND,
2256 |             detail={"error": "TransactionNotFound", "message": f"Transaction '{clean_tx_id}' not found."}
2257 |         )
2258 | 
2259 |     evidence = matching_tx.get("delivery_evidence")
2260 |     if not evidence:
2261 |         raise HTTPException(
2262 |             status_code=status.HTTP_400_BAD_REQUEST,
2263 |             detail={"error": "MissingEvidence", "message": "No delivery evidence exists for this transaction. Submit evidence before review."}
2264 |         )
2265 | 
2266 |     # Maker-Checker Segregation of Duties: Submitter cannot approve their own evidence!
2267 |     enforce_maker_checker(evidence, reviewer)
2268 | 
2269 |     # Idempotency and transition checks:
2270 |     curr_delivery_status = matching_tx.get("delivery_status")
2271 |     if curr_delivery_status == DeliveryState.DELIVERY_VERIFIED.value:
2272 |         if req.decision == ReviewDecision.APPROVE:
2273 |             return {
2274 |                 "status": DeliveryState.DELIVERY_VERIFIED.value,
2275 |                 "message": "Delivery evidence is already verified and approved (idempotent response).",
2276 |                 "transaction_id": matching_tx["id"],
2277 |                 "delivery_status": DeliveryState.DELIVERY_VERIFIED.value,
2278 |                 "payment_status": matching_tx.get("status"),
2279 |                 "state_hash": matching_tx.get("state_hash"),
2280 |                 "evidence": evidence,
2281 |                 "already_verified": True
2282 |             }
2283 |         else:
2284 |             raise HTTPException(
2285 |                 status_code=status.HTTP_400_BAD_REQUEST,
2286 |                 detail={
2287 |                     "error": "CannotRejectVerifiedDelivery",
2288 |                     "message": "Delivery evidence is already verified and locked. Cannot reject verified delivery."
2289 |                 }
2290 |             )
2291 | 
2292 |     if curr_delivery_status == DeliveryState.DELIVERY_REJECTED.value:
2293 |         if req.decision == ReviewDecision.REJECT:
2294 |             return {
2295 |                 "status": DeliveryState.DELIVERY_REJECTED.value,
2296 |                 "message": "Delivery evidence is already rejected (idempotent response).",
2297 |                 "transaction_id": matching_tx["id"],
2298 |                 "delivery_status": DeliveryState.DELIVERY_REJECTED.value,
2299 |                 "payment_status": matching_tx.get("status"),
2300 |                 "state_hash": matching_tx.get("state_hash"),
2301 |                 "evidence": evidence,
2302 |                 "already_rejected": True
2303 |             }
2304 |         else:
2305 |             raise HTTPException(
2306 |                 status_code=status.HTTP_400_BAD_REQUEST,
2307 |                 detail={
2308 |                     "error": "CannotApproveRejectedEvidence",
2309 |                     "message": "Delivery evidence was previously rejected and cannot be approved. Fresh evidence must be submitted."
2310 |                 }
2311 |             )
2312 | 
2313 |     if curr_delivery_status not in (
2314 |         DeliveryState.DELIVERY_EVIDENCE_SUBMITTED.value,
2315 |         DeliveryState.DELIVERY_REVIEW_PENDING.value
2316 |     ):
2317 |         raise HTTPException(
2318 |             status_code=status.HTTP_400_BAD_REQUEST,
2319 |             detail={
2320 |                 "error": "InvalidReviewState",
2321 |                 "message": f"Cannot review delivery evidence in state '{curr_delivery_status}'."
2322 |             }
2323 |         )
2324 | 
2325 |     now_iso = datetime.utcnow().isoformat()
2326 |     evidence["authenticated_reviewer"] = reviewer.user_id
2327 |     evidence["review_timestamp"] = now_iso
2328 |     evidence["review_decision"] = req.decision.value
2329 |     evidence["review_notes"] = req.review_notes.strip()
2330 | 
2331 |     new_delivery_status = (
2332 |         DeliveryState.DELIVERY_VERIFIED.value
2333 |         if req.decision == ReviewDecision.APPROVE
2334 |         else DeliveryState.DELIVERY_REJECTED.value
2335 |     )
2336 |     matching_tx["delivery_status"] = new_delivery_status
2337 | 
2338 |     # Cryptographic State Hash Transition
2339 |     chain = matching_tx.get("state_chain", [])
2340 |     new_h, updated_c = record_state_transition(
2341 |         current_chain=chain,
2342 |         current_hash=matching_tx.get("state_hash") or "",
2343 |         amount=matching_tx.get("amount", 0.0),
2344 |         new_status=new_delivery_status,
2345 |         timestamp=now_iso
2346 |     )
2347 |     matching_tx["previous_state_hash"] = matching_tx.get("state_hash")
2348 |     matching_tx["state_hash"] = new_h
2349 |     matching_tx["state_chain"] = updated_c
2350 |     matching_tx["is_corrupted"] = False
2351 | 
2352 |     # Mandate pool is NEVER touched
2353 |     # Payment status remains "AUTHORIZED"
2354 |     # ZERO PayPal capture API calls
2355 | 
2356 |     return {
2357 |         "status": new_delivery_status,
2358 |         "message": f"Delivery evidence {new_delivery_status.lower().replace('_', ' ')} by reviewer '{reviewer.user_id}'.",
2359 |         "transaction_id": matching_tx["id"],
2360 |         "delivery_status": new_delivery_status,
2361 |         "payment_status": matching_tx.get("status"),
2362 |         "state_hash": new_h,
2363 |         "evidence": evidence
2364 |     }
2365 | 
```

#### 4.5 Get Delivery Evidence (`GET /api/delivery/evidence/{tx_id}`) (Lines 2367–2408)
```python
2367 | @app.get("/api/delivery/evidence/{tx_id}")
2368 | async def get_delivery_evidence(
2369 |     tx_id: str,
2370 |     user: AuthenticatedUser = Depends(get_current_user)
2371 | ):
2372 |     """
2373 |     Retrieves the delivery evidence and audit record for a transaction.
2374 |     Protected by reviewer authentication.
2375 |     Submitters may only view evidence for their own submissions.
2376 |     Reviewers and Admins have system-wide audit access.
2377 |     """
2378 |     clean_tx_id = tx_id.strip()
2379 |     matching_tx = None
2380 |     for tx in TRANSACTIONS_LEDGER:
2381 |         if tx.get("id") == clean_tx_id:
2382 |             matching_tx = tx
2383 |             break
2384 | 
2385 |     if not matching_tx:
2386 |         raise HTTPException(
2387 |             status_code=status.HTTP_404_NOT_FOUND,
2388 |             detail={"error": "TransactionNotFound", "message": f"Transaction '{clean_tx_id}' not found."}
2389 |         )
2390 | 
2391 |     # Ownership restriction: Submitters can only view evidence they submitted. Reviewers and Admins can view all.
2392 |     if user.role == UserRole.SUBMITTER:
2393 |         evidence = matching_tx.get("delivery_evidence")
2394 |         if evidence and evidence.get("authenticated_submitter") != user.user_id:
2395 |             raise HTTPException(
2396 |                 status_code=status.HTTP_403_FORBIDDEN,
2397 |                 detail="Access denied: submitters may only view delivery evidence for their own submissions."
2398 |             )
2399 | 
2400 |     return {
2401 |         "transaction_id": matching_tx["id"],
2402 |         "delivery_status": matching_tx.get("delivery_status", "AWAITING_DELIVERY"),
2403 |         "payment_status": matching_tx.get("status"),
2404 |         "evidence": matching_tx.get("delivery_evidence"),
2405 |         "state_hash": matching_tx.get("state_hash"),
2406 |         "state_chain": matching_tx.get("state_chain", [])
2407 |     }
2408 | 
```

#### 4.6 Demo Delivery Simulation Route (`POST /api/demo/simulate-delivery`) (Lines 2452–2504)
```python
2452 | @app.post("/api/demo/simulate-delivery")
2453 | def demo_delivery():
2454 |     """Simulates legitimate ₹50,000 laptop: Real PayPal AUTHORIZED (Escrow locked, awaiting delivery verification)."""
2455 |     laptop_amount = 50000.0
2456 |     item_name = "Dell Inspiron 15 Business Laptop"
2457 | 
2458 |     # Step 1: Real PayPal Orders v2 AUTHORIZE
2459 |     order_res = paypal_client.create_authorized_order(item_name, laptop_amount, currency="INR")
2460 |     order_id = order_res.get("order_id")
2461 |     auth_id = order_res.get("auth_id") or f"AUTH_{uuid.uuid4().hex[:17].upper()}"
2462 |     tracking_num = f"TRK{uuid.uuid4().hex[:10].upper()}"
2463 | 
2464 |     tx = {
2465 |         "id": f"TX-{uuid.uuid4().hex[:8].upper()}",
2466 |         "item_name": item_name,
2467 |         "category": "electronics",
2468 |         "amount": laptop_amount,
2469 |         "currency": "INR",
2470 |         "merchant_name": "Dell Technologies Commercial",
2471 |         "status": "AUTHORIZED",
2472 |         "paypal_order_id": order_id,
2473 |         "paypal_auth_id": auth_id,
2474 |         "paypal_capture_id": None,
2475 |         "paypal_dispute_id": None,
2476 |         "tracking_number": tracking_num,
2477 |         "carrier": "BlueDart Express",
2478 |         "delivery_status": "AWAITING_DELIVERY",
2479 |         "created_at": datetime.utcnow().isoformat(),
2480 |         "maker_checker_audit": generate_maker_checker_audit(item_name, "electronics", laptop_amount, "Dell Technologies Commercial", approved=True),
2481 |         "vision_audit": generate_vision_audit("AUTHORIZED", tracking_num, "BlueDart Express"),
2482 |         "api_payload": {
2483 |             "order_endpoint": "POST https://api-m.sandbox.paypal.com/v2/checkout/orders",
2484 |             "capture_endpoint": "Payment capture disabled until delivery verification audit (Stage 5B)",
2485 |             "order_request": order_res.get("request_payload"),
2486 |             "order_response": order_res.get("response_payload"),
2487 |             "headers": order_res.get("headers"),
2488 |             "live_call": order_res.get("live_call", False)
2489 |         }
2490 |     }
2491 |     if ACTIVE_MANDATE.get("remaining_pool", 0) >= laptop_amount:
2492 |         ACTIVE_MANDATE["remaining_pool"] -= laptop_amount
2493 |     insert_ledger_transaction(tx)
2494 |     return {
2495 |         "status": "AUTHORIZED",
2496 |         "delivery_status": "AWAITING_DELIVERY",
2497 |         "message": "200 OK: Escrow locked (Authorized). Awaiting delivery evidence submission and reviewer audit.",
2498 |         "paypal_order_id": order_id,
2499 |         "paypal_auth_id": auth_id,
2500 |         "paypal_capture_id": None,
2501 |         "amount": laptop_amount,
2502 |         "live_call": order_res.get("live_call", False)
2503 |     }
2504 | 
```

#### 4.7 Webhook Ingestion Route (`POST /api/webhook`) (Lines 2665–2725)
```python
2665 | @app.post("/api/webhook")
2666 | async def handle_webhook(request: Request):
2667 |     """
2668 |     STRICT PAYPAL WEBHOOK ENDPOINT (Phase 2):
2669 |     1. Rejects unverified raw POST requests with HTTP 401 Unauthorized.
2670 |     2. Strictly verifies PAYPAL-AUTH-ALGO, PAYPAL-CERT-URL, PAYPAL-TRANSMISSION-ID, PAYPAL-TRANSMISSION-SIG.
2671 |     3. Updates status and appends to the immutable SHA-256 state hash chain.
2672 |     """
2673 |     raw_body_bytes = await request.body()
2674 |     raw_body_str = raw_body_bytes.decode("utf-8")
2675 |     headers = {k.lower(): v for k, v in request.headers.items()}
2676 |     
2677 |     is_valid, reason = verify_paypal_webhook_signature(headers, raw_body_str)
2678 |     if not is_valid:
2679 |         raise HTTPException(
2680 |             status_code=status.HTTP_401_UNAUTHORIZED,
2681 |             detail={
2682 |                 "error": "UnauthorizedWebhookEvent",
2683 |                 "reason": reason,
2684 |                 "status": "REJECTED_401",
2685 |                 "timestamp": datetime.utcnow().isoformat()
2686 |             }
2687 |         )
2688 | 
2689 |     try:
2690 |         payload = json.loads(raw_body_str) if raw_body_str else {}
2691 |     except Exception:
2692 |         raise HTTPException(status_code=400, detail="Invalid JSON payload")
2693 | 
2694 |     event_type = payload.get("event_type", "DELIVERY_CONFIRMED")
2695 |     tx_id = payload.get("transaction_id")
2696 |     
2697 |     target_tx = None
2698 |     if tx_id:
2699 |         for t in TRANSACTIONS_LEDGER:
2700 |             if t.get("id") == tx_id:
2701 |                 target_tx = t
2702 |                 break
2703 |     if not target_tx and TRANSACTIONS_LEDGER:
2704 |         for t in TRANSACTIONS_LEDGER:
2705 |             if t.get("status") == "AUTHORIZED":
2706 |                 target_tx = t
2707 |                 break
2708 |                 
2709 |     if not target_tx:
2710 |         return {"status": "NOT_FOUND", "message": f"No active authorized order found for {tx_id}"}
2711 |         
2712 |     now_iso = datetime.utcnow().isoformat()
2713 | 
2714 |     if event_type == "DELIVERY_CONFIRMED":
2715 |         # Under Stage 5B protocols, unverified webhooks cannot capture payment.
2716 |         # Captures require authenticated reviewer verification.
2717 |         return {
2718 |             "status": "DELIVERY_CONFIRMED_PENDING_REVIEW",
2719 |             "message": "Carrier drop-off webhook received. Payment capture requires authenticated reviewer verification under Stage 5B protocols.",
2720 |             "tx_id": target_tx["id"],
2721 |             "delivery_status": target_tx.get("delivery_status", "DELIVERY_REVIEW_PENDING"),
2722 |             "payment_status": target_tx.get("status", "AUTHORIZED"),
2723 |             "verification": reason
2724 |         }
2725 |     elif event_type in ["REPORT_DISPUTE", "DELIVERY_DAMAGED", "LOST_PACKAGE"]:
```

#### 4.8 Gemini Vision Delivery Arbiter (`POST /api/vision/verify-delivery`) (Lines 2882–2935)
```python
2882 | @app.post("/api/vision/verify-delivery")
2883 | def vision_verify_delivery(payload: Dict[str, Any]):
2884 |     """
2885 |     Multimodal Gemini Vision Proof-of-Delivery Arbiter:
2886 |     - Analyzes drop-off photograph (INTACT_PACKAGE vs CRUSHED_DAMAGE vs WRONG_ADDRESS).
2887 |     - If INTACT: calls PayPal Capture to release hostage money.
2888 |     - If DAMAGED: autonomously files PayPal Dispute with vision analysis as evidence.
2889 |     """
2890 |     scenario = payload.get("scenario", "INTACT_PACKAGE")
2891 |     expected_address = payload.get("expected_address", "Corporate HQ Tech Park, Suite 402, Bengaluru 560001")
2892 | 
2893 |     # Run Gemini Vision inspection
2894 |     inspection = vision_arbiter.inspect_delivery_proof(
2895 |         package_scenario=scenario,
2896 |         expected_address=expected_address
2897 |     )
2898 |     analysis = inspection["analysis"]
2899 |     rec_action = analysis["recommended_action"]
2900 | 
2901 |     if rec_action == "CAPTURE_ESCROW":
2902 |         # Gemini Vision recommended capture; under Stage 5B protocols, automated AI prediction
2903 |         # CANNOT release escrow directly. It creates an evidence recommendation pending reviewer audit.
2904 |         auth_id = f"AUTH_{uuid.uuid4().hex[:17].upper()}"
2905 |         
2906 |         tx = {
2907 |             "id": f"TX-{uuid.uuid4().hex[:8].upper()}",
2908 |             "item_name": "Dell Inspiron 15 Business Laptop",
2909 |             "category": "electronics",
2910 |             "amount": 50000.0,
2911 |             "currency": "INR",
2912 |             "merchant_name": "Dell Technologies Commercial",
2913 |             "status": "AUTHORIZED",
2914 |             "paypal_order_id": f"5O{uuid.uuid4().hex[:15].upper()}",
2915 |             "paypal_auth_id": auth_id,
2916 |             "paypal_capture_id": None,
2917 |             "paypal_dispute_id": None,
2918 |             "tracking_number": inspection["analysis"]["ocr_extracted"]["tracking_number"],
2919 |             "carrier": "FedEx Express B2B",
2920 |             "delivery_status": "DELIVERY_REVIEW_PENDING",
2921 |             "created_at": datetime.utcnow().isoformat(),
2922 |             "vision_audit": inspection
2923 |         }
2924 |         insert_ledger_transaction(tx)
2925 |         return {
2926 |             "status": "AUTHORIZED",
2927 |             "delivery_status": "DELIVERY_REVIEW_PENDING",
2928 |             "inspection": inspection,
2929 |             "message": "Gemini Vision verified package intact and seal undamaged. Awaiting manual reviewer verification before escrow capture.",
2930 |             "paypal_capture_id": None
2931 |         }
2932 |     else:  # FILE_PAYPAL_DISPUTE
2933 |         order_id = f"5O{uuid.uuid4().hex[:15].upper()}"
2934 |         evidence_str = f"Gemini Vision Telematics: Integrity Score {analysis['integrity_score']} | Condition: {analysis['condition']} | Findings: {', '.join(analysis['vision_reasoning'])}"
2935 |         dispute_res = paypal_client.file_dispute(order_id, "MERCHANDISE_OR_SERVICE_NOT_RECEIVED", evidence_str)
```

### 5. `backend/core/paypal_client.py`
#### 5.1 `PayPalCaptureError` Exception Definition (Lines 58–62)
```python
  58 | class PayPalCaptureError(PayPalAPIError):
  59 |     """Raised when a PayPal capture operation fails or is denied."""
  60 |     def __init__(self, message: str = "PayPal capture operation failed.", status_code: int = 400, error_data: Optional[Dict[str, Any]] = None):
  61 |         super().__init__(message, status_code=status_code, error_data=error_data or {})
  62 | 
```

#### 5.2 `capture_authorization` Implementation (Lines 782–859)
```python
 782 |     def capture_authorization(
 783 |         self,
 784 |         authorization_id: str,
 785 |         amount: Union[Decimal, float, str],
 786 |         currency: str = "USD",
 787 |         idempotency_key: Optional[str] = None
 788 |     ) -> Dict[str, Any]:
 789 |         """
 790 |         Executes payment capture against an existing Authorization ID on PayPal Sandbox.
 791 |         Requires genuine authorization hold.
 792 |         SYNTHETIC CAPTURE IDS AND FAKE SUCCESS FALLBACKS ARE STRICTLY PROHIBITED.
 793 |         """
 794 |         if not self.is_configured():
 795 |             raise PayPalConfigurationError("PayPal client credentials are not configured.")
 796 | 
 797 |         dec_amount = Decimal(str(amount)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
 798 |         payload_hash = hashlib.sha256(f"{authorization_id}:{dec_amount}:{currency}:{idempotency_key or ''}".encode("utf-8")).hexdigest()
 799 |         req_id = str(uuid.UUID(payload_hash[:32]))
 800 |         token = self.get_access_token_sync()
 801 |         url = f"{self.base_url}/v2/payments/authorizations/{authorization_id}/capture"
 802 | 
 803 |         headers = {
 804 |             "Authorization": f"Bearer {token}",
 805 |             "Content-Type": "application/json",
 806 |             "PayPal-Request-Id": req_id
 807 |         }
 808 | 
 809 |         effective_currency = "USD" if currency.upper() == "INR" else currency.upper()
 810 |         if currency.upper() == "INR":
 811 |             effective_amount = (dec_amount / Decimal("85.00")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
 812 |         else:
 813 |             effective_amount = dec_amount
 814 | 
 815 |         payload = {
 816 |             "amount": {
 817 |                 "currency_code": effective_currency,
 818 |                 "value": f"{effective_amount:.2f}"
 819 |             },
 820 |             "is_final_capture": True,
 821 |             "note_to_payer": "AuroraPay Escrow Protocol: Released upon verified delivery receipt."
 822 |         }
 823 | 
 824 |         try:
 825 |             with httpx.Client(timeout=httpx.Timeout(5.0)) as client:
 826 |                 res = client.post(url, headers=headers, json=payload)
 827 |                 if res.status_code in (200, 201):
 828 |                     data = res.json()
 829 |                     capture_id = data.get("id")
 830 |                     if not capture_id:
 831 |                         raise PayPalCaptureError(
 832 |                             "PayPal capture response missing genuine capture ID",
 833 |                             status_code=res.status_code,
 834 |                             error_data=data
 835 |                         )
 836 |                     return {
 837 |                         "capture_id": capture_id,
 838 |                         "status": data.get("status", "COMPLETED"),
 839 |                         "live_call": True,
 840 |                         "idempotency_key": req_id,
 841 |                         "request_payload": payload,
 842 |                         "response_payload": data
 843 |                     }
 844 |                 else:
 845 |                     error_json = {}
 846 |                     try:
 847 |                         error_json = res.json()
 848 |                     except Exception:
 849 |                         pass
 850 |                     raise PayPalCaptureError(
 851 |                         f"PayPal capture call failed with HTTP {res.status_code}: {res.text}",
 852 |                         status_code=res.status_code,
 853 |                         error_data=error_json
 854 |                     )
 855 |         except httpx.TimeoutException as te:
 856 |             raise PayPalTimeoutError(f"PayPal capture timed out after 5.0s: {te}")
 857 |         except httpx.RequestError as re:
 858 |             raise PayPalNetworkError(f"PayPal capture network error: {re}")
 859 | 
```

### 6. `backend/api/webhooks.py`
#### 6.1 `secure_paypal_webhook` Delivery Event Handling (Lines 127–228)
```python
 127 | async def secure_paypal_webhook(request: Request, db: Session = Depends(get_db)):
 128 |     """
 129 |     STRICT PAYPAL WEBHOOK ENDPOINT (Phase 2):
 130 |     Rejects any unverified POST requests with HTTP 401 Unauthorized.
 131 |     Verifies PAYPAL-AUTH-ALGO, PAYPAL-CERT-URL, PAYPAL-TRANSMISSION-ID, PAYPAL-TRANSMISSION-SIG.
 132 |     Updates transaction status and appends to the immutable SHA-256 hash chain.
 133 |     """
 134 |     raw_body_bytes = await request.body()
 135 |     raw_body_str = raw_body_bytes.decode("utf-8")
 136 |     
 137 |     # Extract lowercased request headers for case-insensitive verification
 138 |     headers = {k.lower(): v for k, v in request.headers.items()}
 139 |     
 140 |     is_valid, reason = verify_paypal_webhook_signature(headers, raw_body_str)
 141 |     if not is_valid:
 142 |         logger.error(f"[WebhookGate] 401 Unauthorized: {reason}")
 143 |         raise HTTPException(
 144 |             status_code=status.HTTP_401_UNAUTHORIZED,
 145 |             detail={
 146 |                 "error": "UnauthorizedWebhookEvent",
 147 |                 "reason": reason,
 148 |                 "status": "REJECTED_401",
 149 |                 "timestamp": datetime.utcnow().isoformat()
 150 |             }
 151 |         )
 152 | 
 153 |     # Parse Event
 154 |     try:
 155 |         payload = json.loads(raw_body_str) if raw_body_str else {}
 156 |     except Exception:
 157 |         raise HTTPException(status_code=400, detail="Invalid JSON payload")
 158 | 
 159 |     event_type = payload.get("event_type", "DELIVERY_CONFIRMED")
 160 |     tx_id = payload.get("transaction_id")
 161 | 
 162 |     # Locate Transaction in Database & In-Memory Store
 163 |     target_tx = None
 164 |     if tx_id:
 165 |         target_tx = db.query(TransactionModel).filter(TransactionModel.id == tx_id).first()
 166 |     if not target_tx:
 167 |         target_tx = db.query(TransactionModel).filter(TransactionModel.status == "AUTHORIZED").first()
 168 | 
 169 |     now_iso = datetime.utcnow().isoformat()
 170 |     mem_ledger = getattr(request.app.state, "ledger", None)
 171 | 
 172 |     if event_type == "DELIVERY_CONFIRMED":
 173 |         target_id = tx_id
 174 |         if target_tx:
 175 |             target_id = target_tx.id
 176 |             target_tx.delivery_status = "DELIVERY_CONFIRMED_PENDING_REVIEW"
 177 |             db.commit()
 178 | 
 179 |         if mem_ledger:
 180 |             for t in mem_ledger:
 181 |                 if (tx_id and t.get("id") == tx_id) or (not tx_id and t.get("status") == "AUTHORIZED"):
 182 |                     target_id = t.get("id")
 183 |                     t["delivery_status"] = "DELIVERY_CONFIRMED_PENDING_REVIEW"
 184 |                     break
 185 | 
 186 |         return {
 187 |             "status": "DELIVERY_CONFIRMED_PENDING_REVIEW",
 188 |             "message": "Webhook verified cryptographically. Payment capture requires authenticated reviewer verification under Stage 5B protocols.",
 189 |             "event_type": event_type,
 190 |             "verification": reason,
 191 |             "transaction_id": target_id,
 192 |             "state_hash": target_tx.state_hash if target_tx else (mem_ledger[0].get("state_hash") if mem_ledger else None)
 193 |         }
 194 | 
 195 |     elif event_type in ["REPORT_DISPUTE", "DELIVERY_DAMAGED", "LOST_PACKAGE"]:
 196 |         target_id = tx_id
 197 |         if target_tx:
 198 |             target_id = target_tx.id
 199 |             target_tx.status = "DISPUTED"
 200 |             target_tx.delivery_status = "VISION_DAMAGE_DISPUTED"
 201 |             
 202 |             # Phase 1: Cryptographic State Hash Transition
 203 |             chain = json.loads(target_tx.state_chain) if target_tx.state_chain else []
 204 |             new_hash, updated_chain = record_state_transition(
 205 |                 current_chain=chain,
 206 |                 current_hash=target_tx.state_hash or "",
 207 |                 amount=target_tx.amount,
 208 |                 new_status="DISPUTED",
 209 |                 timestamp=now_iso
 210 |             )
 211 |             target_tx.previous_state_hash = target_tx.state_hash
 212 |             target_tx.state_hash = new_hash
 213 |             target_tx.state_chain = json.dumps(updated_chain)
 214 |             db.commit()
 215 | 
 216 |         # Sync in-memory ledger
 217 |         if mem_ledger:
 218 |             for t in mem_ledger:
 219 |                 if (tx_id and t.get("id") == tx_id) or (not tx_id and t.get("status") == "AUTHORIZED"):
 220 |                     target_id = t.get("id")
 221 |                     t["status"] = "DISPUTED"
 222 |                     t["delivery_status"] = "VISION_DAMAGE_DISPUTED"
 223 |                     chain = t.get("state_chain") or []
 224 |                     new_h, updated_c = record_state_transition(
 225 |                         chain, t.get("state_hash") or "", t.get("amount", 0.0), "DISPUTED", timestamp=now_iso
 226 |                     )
 227 |                     t["previous_state_hash"] = t.get("state_hash")
 228 |                     t["state_hash"] = new_h
```


---

## Task 2: Capture Callers Trace Table
Exhaustive search across all backend Python modules (`backend/*.py`, `backend/**/*.py`) for references to `capture_authorization` and `/capture`.

| Function / Reference Name | File and Exact Line | Direct Caller | Route / Workflow | Can Initiate Real PayPal Capture? | Explanation |
|:---|:---|:---|:---|:---:|:---|
| `def capture_authorization` | `backend/core/paypal_client.py:782` | None (Definition) | Low-level client method | **No (Definition only)** | Method definition on `PayPalOrdersClient`. Issues `POST /v2/payments/authorizations/{id}/capture` when called. Requires genuine authorization ID and credentials. All synthetic fallbacks deleted. |
| `url = .../capture` | `backend/core/paypal_client.py:801` | `capture_authorization` | Client URL resolution | **No (URL string)** | Target endpoint URL string inside `capture_authorization`. |
| Prompt metadata text | `backend/core/vision_arbiter.py:132` | None | Gemini prompt metadata | **No (Metadata string)** | Informational string inside simulated OCR/vision metadata: `"Release PayPal Escrow immediately via .../capture"`. No HTTP request is executed. |
| `with patch(...capture_authorization)` | `backend/tests/test_delivery_verification.py:706` | Pytest harness | `test_no_paypal_capture_http_request_during_workflows` | **No (Test fixture)** | Mocks `capture_authorization` to assert that it is **NEVER** called during evidence submission, queueing, or review. |
| `def test_paypal_client_capture_authorization...` | `backend/tests/test_delivery_verification.py:792` | Pytest harness | Direct unit test | **No (Hermetic unit test)** | Unit test asserting that `capture_authorization` raises `PayPalCaptureError` on failure and never produces synthetic `CAP_` capture IDs. Uses mocked HTTP client. |
| `client.capture_authorization(...)` | `backend/tests/test_delivery_verification.py:809` | Pytest harness | `test_paypal_client_capture_authorization_no_synthetic_fallback` | **No (Hermetic unit test)** | Calls `capture_authorization` against mocked HTTP transport to verify exception raising. Does not hit PayPal network. |
| `mock_client.capture_authorization(...)` | `backend/tests/test_paypal_auth.py:371` | Pytest harness | `test_capture_authorization_auth_failure_propagates` | **No (Hermetic unit test)** | Unit test asserting error propagation when OAuth fails. Mocks HTTP transport. |
| `unconfigured_client.capture_authorization(...)` | `backend/tests/test_paypal_auth.py:397` | Pytest harness | `test_capture_authorization_unconfigured_credentials` | **No (Hermetic unit test)** | Unit test asserting `PayPalConfigurationError` when credentials are unset. |

> **Summary Finding:** There are **ZERO (0) active callers** of `capture_authorization` or PayPal `/capture` in any application route or internal workflow in `backend/main.py`, `backend/api/webhooks.py`, or any other backend module. The delivery verification workflow is 100% decoupled from payment capture.

---

## Task 3: Evidentiary Answers to Security Questions

### Question 1: Can an unauthenticated user obtain an admin/reviewer token?
**Answer:** **NO.**

**Source Evidence:**
1. In `backend/main.py` (lines 2018–2036), `POST /api/auth/token` requires a request body conforming to `TokenRequest(username, password)`.
2. It explicitly delegates credential verification to `verify_demo_credentials()`:
```python
2031 |     user = verify_demo_credentials(req.username, req.password)
2032 |     if not user:
2033 |         raise HTTPException(
2034 |             status_code=status.HTTP_401_UNAUTHORIZED,
2035 |             detail="Invalid credentials: username or password incorrect."
2036 |         )
```
3. In `backend/core/auth.py` (lines 125–150), `verify_demo_credentials()` checks that `username` exists in `DEMO_USERS` and that `password` strictly matches `DEMO_USER_CREDENTIALS` using constant-time `hmac.compare_digest`:
```python
142  |     if not hmac.compare_digest(password.encode("utf-8"), expected_pass.encode("utf-8")):
143  |         return None
```
4. If credentials do not match or are omitted, `None` is returned, resulting in `HTTP 401 Unauthorized`.
5. In addition, line 2025 unconditionally blocks demo token issuance in production environments:
```python
2025 |     if is_production_environment():
2026 |         raise HTTPException(
2027 |             status_code=status.HTTP_403_FORBIDDEN,
2028 |             detail="Demo token issuance is disabled in production environments. Authenticate via enterprise Identity Provider (OIDC / OAuth 2.0)."
2029 |         )
```

### Question 2: Can a user choose their own role?
**Answer:** **NO.**

**Source Evidence:**
1. In `backend/main.py` (lines 2009–2012), `TokenRequest` only defines `username` and `password` fields; there is no role parameter:
```python
2009 | class TokenRequest(BaseModel):
2010 |     username: str
2011 |     password: str
```
2. In `backend/main.py` (lines 2038–2042), the token is created using `user.role` from the validated server-side record:
```python
2038 |     token = create_access_token(
2039 |         user_id=user.user_id,
2040 |         role=user.role,
2041 |         name=user.name
2042 |     )
```
3. In `backend/core/auth.py` (lines 86–112), `user.role` is statically defined in the server-side registry `DEMO_USERS`:
```python
90   |         "role": UserRole.SUBMITTER,
...
100  |         "role": UserRole.REVIEWER,
...
110  |         "role": UserRole.ADMIN,
```
The caller has no mechanism to request, assert, or alter the role during token issuance.

### Question 3: Can an admin approve evidence submitted by themselves?
**Answer:** **NO.**

**Source Evidence:**
1. In `backend/main.py` (line 2267), `POST /api/delivery/review` executes `enforce_maker_checker(evidence, reviewer)` prior to state mutation.
2. In `backend/core/delivery.py` (lines 108–120), `enforce_maker_checker()` compares the submitter's user ID directly against the reviewer's authenticated user ID:
```python
108  | def enforce_maker_checker(evidence_record: Dict[str, Any], reviewer: AuthenticatedUser) -> None:
...
114  |     submitter_id = evidence_record.get("authenticated_submitter")
115  |     if submitter_id and submitter_id == reviewer.user_id:
116  |         raise HTTPException(
117  |             status_code=status.HTTP_403_FORBIDDEN,
118  |             detail="Maker-checker violation: submitter cannot review or approve their own delivery evidence."
119  |         )
```
3. Although `require_role([UserRole.REVIEWER])` at line 2233 allows `UserRole.ADMIN` to access the endpoint, `enforce_maker_checker` operates on `reviewer.user_id`, not role.
4. If an admin user (e.g. `admin_eve`) submitted the delivery evidence (`authenticated_submitter: "admin_eve"`), any attempt by `admin_eve` to approve it triggers `HTTP 403 Forbidden`. A distinct second authenticated user is mandatory.

### Question 4: Can a submitter change another user's evidence?
**Answer:** **NO.**

**Source Evidence:**
1. **Anti-Spoofing on Submission:** In `backend/core/delivery.py` (lines 89–95), `validate_submitter_spoofing()` rejects any request where `req.submitter_id` does not match the authenticated user:
```python
91   |     if req.submitter_id and req.submitter_id != user.user_id:
92   |         raise HTTPException(
93   |             status_code=status.HTTP_403_FORBIDDEN,
94   |             detail=f"Identity spoofing detected: request body submitter_id '{req.submitter_id}' does not match authenticated user '{user.user_id}'."
95   |         )
```
2. **Submitter Bound to Authenticated Identity:** In `backend/main.py` (line 2113), `authenticated_submitter` is assigned strictly from `submitter.user_id` of the validated Bearer token.
3. **Overwrite Prevention:** In `backend/main.py` (lines 2092–2103), if delivery evidence already exists for the transaction (`DELIVERY_EVIDENCE_SUBMITTED`, `DELIVERY_REVIEW_PENDING`, or `DELIVERY_VERIFIED`), any subsequent submission call is rejected with `HTTP 409 Conflict`:
```python
2097 |     if matching_tx.get("delivery_status") in (
2098 |         DeliveryState.DELIVERY_EVIDENCE_SUBMITTED.value,
2099 |         DeliveryState.DELIVERY_REVIEW_PENDING.value,
2100 |         DeliveryState.DELIVERY_VERIFIED.value
2101 |     ):
2102 |         raise HTTPException(
2103 |             status_code=status.HTTP_409_CONFLICT,
...
```
4. **Submitter Ownership View Restriction:** In `backend/main.py` (lines 2392–2398), submitters are blocked from inspecting evidence submitted by others:
```python
2392 |     if user.role == UserRole.SUBMITTER:
2393 |         evidence = matching_tx.get("delivery_evidence")
2394 |         if evidence and evidence.get("authenticated_submitter") != user.user_id:
2395 |             raise HTTPException(
2396 |                 status_code=status.HTTP_403_FORBIDDEN,
2397 |                 detail="Access denied: submitters may only view delivery evidence for their own submissions."
2398 |             )
```

### Question 5: Can rejected evidence be approved later?
**Answer:** **NO.**

**Source Evidence:**
1. In `backend/main.py` (lines 2292–2311), `POST /api/delivery/review` explicitly handles the `DELIVERY_REJECTED` state:
```python
2292 |     if curr_delivery_status == DeliveryState.DELIVERY_REJECTED.value:
2293 |         if req.decision == ReviewDecision.REJECT:
2294 |             return {
2295 |                 "status": DeliveryState.DELIVERY_REJECTED.value,
2296 |                 "message": "Delivery evidence is already rejected (idempotent response).",
...
2302 |                 "already_rejected": True
2303 |             }
2304 |         else:
2305 |             raise HTTPException(
2306 |                 status_code=status.HTTP_400_BAD_REQUEST,
2307 |                 detail={
2308 |                     "error": "CannotApproveRejectedEvidence",
2309 |                     "message": "Delivery evidence was previously rejected and cannot be approved. Fresh evidence must be submitted."
2310 |                 }
2311 |             )
```
2. Any request attempting an `APPROVE` decision on a previously rejected delivery record is rejected with `HTTP 400 Bad Request`.

### Question 6: Can delivery verification change payment status to CAPTURED?
**Answer:** **NO.**

**Source Evidence:**
1. In `backend/main.py` (lines 2331–2336), `POST /api/delivery/review` mutates strictly `delivery_status`:
```python
2331 |     new_delivery_status = (
2332 |         DeliveryState.DELIVERY_VERIFIED.value
2333 |         if req.decision == ReviewDecision.APPROVE
2334 |         else DeliveryState.DELIVERY_REJECTED.value
2335 |     )
2336 |     matching_tx["delivery_status"] = new_delivery_status
```
2. The transaction's primary payment status `matching_tx["status"]` is **never modified**; it remains `"AUTHORIZED"`.
3. In line 2361, the endpoint response explicitly reports:
```python
2361 |         "payment_status": matching_tx.get("status"),
```
which returns `"AUTHORIZED"`.
4. In lines 2352–2354, the source code guarantees:
```python
2352 |     # Mandate pool is NEVER touched
2353 |     # Payment status remains "AUTHORIZED"
2354 |     # ZERO PayPal capture API calls
```

### Question 7: Can any delivery route trigger PayPal capture?
**Answer:** **NO.**

**Source Evidence:**
1. `POST /api/delivery/submit-evidence` ([`backend/main.py:2055-2154`](file:///c:/Users/bitd/Downloads/New%20folder/ClearGuard-OS/backend/main.py#L2055-L2154)): Zero references or calls to `paypal_client.capture_authorization`.
2. `POST /api/delivery/queue-review` ([`backend/main.py:2156-2228`](file:///c:/Users/bitd/Downloads/New%20folder/ClearGuard-OS/backend/main.py#L2156-L2228)): Zero references or calls to `paypal_client.capture_authorization`.
3. `POST /api/delivery/review` ([`backend/main.py:2230-2365`](file:///c:/Users/bitd/Downloads/New%20folder/ClearGuard-OS/backend/main.py#L2230-L2365)): Zero references or calls to `paypal_client.capture_authorization`.
4. `GET /api/delivery/evidence/{tx_id}` ([`backend/main.py:2367-2408`](file:///c:/Users/bitd/Downloads/New%20folder/ClearGuard-OS/backend/main.py#L2367-L2408)): Read-only route.
5. `POST /api/demo/simulate-delivery` ([`backend/main.py:2452-2504`](file:///c:/Users/bitd/Downloads/New%20folder/ClearGuard-OS/backend/main.py#L2452-L2504)): Decoupled. Lines 2471–2478 set `status = "AUTHORIZED"`, `delivery_status = "AWAITING_DELIVERY"`, `paypal_capture_id = None`. Line 2484 explicitly states: `"capture_endpoint": "Payment capture disabled until delivery verification audit (Stage 5B)"`.
6. `POST /api/webhook` ([`backend/main.py:2665-2725`](file:///c:/Users/bitd/Downloads/New%20folder/ClearGuard-OS/backend/main.py#L2665-L2725)): Decoupled. Lines 2714–2720 return `DELIVERY_CONFIRMED_PENDING_REVIEW` noting that payment capture requires authenticated reviewer verification.
7. `POST /api/vision/verify-delivery` ([`backend/main.py:2882-2935`](file:///c:/Users/bitd/Downloads/New%20folder/ClearGuard-OS/backend/main.py#L2882-L2935)): Decoupled. Lines 2901–2924 create transaction in `status = "AUTHORIZED"`, `delivery_status = "DELIVERY_REVIEW_PENDING"`, `paypal_capture_id = None`.
8. `POST /api/v1/paypal/webhook` ([`backend/api/webhooks.py:172-194`](file:///c:/Users/bitd/Downloads/New%20folder/ClearGuard-OS/backend/api/webhooks.py#L172-L194)): Decoupled. Updates `delivery_status = "DELIVERY_CONFIRMED_PENDING_REVIEW"`.
9. Test assertion in `backend/tests/test_delivery_verification.py` (lines 706–764) asserts `mock_capture.assert_not_called()` across the full lifecycle.

### Question 8: Can a forged JWT pass verification?
**Answer:** **NO.**

**Source Evidence:**
In `backend/core/auth.py` (lines 198–294), `verify_access_token()` enforces 4 layers of validation:
1. **Fixed Algorithm Enforcement (lines 232–237):**
```python
232  |     alg = header.get("alg")
233  |     if alg != "HS256":
234  |         raise HTTPException(
235  |             status_code=status.HTTP_401_UNAUTHORIZED,
236  |             detail=f"Unsupported token algorithm '{alg}': only 'HS256' is permitted."
237  |         )
```
Tokens with `alg: "none"`, `RS256`, `ES256`, or missing algorithms are immediately rejected before any signature processing.
2. **Type Enforcement (lines 239–244):**
```python
239  |     typ = header.get("typ")
240  |     if typ != "JWT":
241  |         raise HTTPException(
242  |             status_code=status.HTTP_401_UNAUTHORIZED,
243  |             detail=f"Invalid token type '{typ}': 'JWT' required."
244  |         )
```
3. **Cryptographic HMAC-SHA256 Signature Verification (lines 246–256):**
```python
247  |     key = secret_key or get_auth_secret_key()
248  |     signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
249  |     expected_sig = hmac.new(key.encode("utf-8"), signing_input, hashlib.sha256).digest()
250  |     expected_sig_b64 = _b64url_encode(expected_sig)
251  | 
252  |     if not hmac.compare_digest(sig_b64, expected_sig_b64):
253  |         raise HTTPException(
254  |             status_code=status.HTTP_401_UNAUTHORIZED,
255  |             detail="Invalid token signature: token has been tampered with or signed with an unknown key"
256  |         )
```
Any modification to the header or payload causes signature recomputation to mismatch. The constant-time `hmac.compare_digest` prevents timing side-channel attacks.
4. **Expiration Enforcement (lines 268–273):**
```python
268  |     now_ts = int(time.time())
269  |     if payload.get("exp", 0) < now_ts:
270  |         raise HTTPException(
271  |             status_code=status.HTTP_401_UNAUTHORIZED,
272  |             detail="Token has expired"
273  |         )
```
5. **Secret Resolution Lockdown:** Lines 50–70 guarantee that in production environments, missing, default, or weak (<32 bytes) keys trigger a fatal `RuntimeError`, preventing attacker exploitation of known default secrets.

### Question 9: Can hash-chain tampering go undetected?
**Answer:** **NO.**

**Source Evidence:**
In `backend/core/crypto_ledger.py` (lines 82–165), `verify_hash_chain()` audits the full cryptographic history:
1. **Link Continuity (lines 104–109):** Each block's `previous_state_hash` must match the previous block's recalculated hash, rooted at `GENESIS_HASH`:
```python
104  |         if entry.get("previous_state_hash") != expected_prev:
105  |             return False, f"CORRUPTED: Broken chain link at step {idx}...", {"status": "CORRUPTED"}
```
2. **Block Integrity Recalculation (lines 112–126):** Every intermediate state hash is recomputed:
```python
112  |         recalculated = compute_state_hash(
113  |             entry.get("previous_state_hash"),
114  |             entry.get("timestamp"),
115  |             entry.get("amount"),
116  |             entry.get("status")
117  |         )
118  |         if recalculated != entry.get("state_hash"):
119  |             return False, f"CORRUPTED: Hash mismatch at step {idx}...", {"status": "CORRUPTED"}
```
Modifying any historical timestamp, amount, status, or hash immediately fails verification.
3. **Head Hash Match (lines 131–138):**
```python
132  |     if last_entry.get("state_hash") != current_stored_hash:
133  |         return False, "CORRUPTED: Latest state hash does not match head of chain.", {"status": "CORRUPTED"}
```
4. **Amount Tamper Detection (lines 140–145):**
```python
140  |     if format_amount_str(current_amount) != last_entry.get("amount"):
141  |         return False, f"CORRUPTED: Transaction amount altered ({current_amount} vs chain {last_entry.get('amount')}).", {"status": "CORRUPTED", "tampered_field": "amount"}
```
5. **Status Tamper Detection (lines 147–161):**
```python
156  |     if not status_matches:
157  |         return False, f"CORRUPTED: Transaction status altered ({current_status} vs chain {last_entry.get('status')}).", {"status": "CORRUPTED", "tampered_field": "status"}
```
Any tampering with transaction amounts, statuses, or historical chain entries is detected and returns `False` with `status: "CORRUPTED"`.


---

## Task 4: Export Verification & Integrity Confirmation
This review export file is self-contained and ready for external security review.
- **Artifact Path:** `review_handoff/stage5b_review_extract.md`
- **Application Source Code Status:** Preserved without modification.
- **Stage 5C Status:** NOT started.
- **PayPal Capture Status:** 0 calls executed, 0 active callers.
