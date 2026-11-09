"""
ClearGuard-OS Reviewer Authentication & Role-Based Access Control (RBAC) Module
Stage 5B Implementation — Security Hardened

Architecture & Security Controls:
1. Cryptographically signed HMAC-SHA256 Bearer tokens with fixed-algorithm enforcement (alg: HS256, typ: JWT).
2. Dynamic environment secret loading via get_auth_secret_key().
   - Production lockdown: Fails immediately if CLEARGUARD_AUTH_SECRET is unset, default, or weak (<32 bytes).
3. Structured roles: ROLE_DELIVERY_SUBMITTER, ROLE_DELIVERY_REVIEWER, ROLE_ADMIN.
4. Token issuance requires verified credentials.
   - Public calls cannot claim arbitrary reviewer or admin roles without secret credentials.
5. Reviewer identity extracted exclusively from cryptographically verified claims, never request bodies.
6. Constant-time signature comparison (hmac.compare_digest) against timing side-channels.
7. Fixed expiration and claim integrity validation.

LIMITATIONS OF DEMO-ONLY AUTHENTICATION:
1. In-memory demo account registry (DEMO_USERS) with pre-configured credentials for hackathon/CI testing.
   Production deployment requires integration with an enterprise Identity Provider (e.g. Okta, Azure AD, Auth0)
   via OIDC/OAuth 2.0 with asymmetric key pairs (RS256/ES256) and JWKS rotation.
2. Tokens are signed with a symmetric secret key (CLEARGUARD_AUTH_SECRET).
3. Tokens lack distributed revocation/blacklisting; session termination is client-side or by TTL expiration.
"""

import os
import hmac
import hashlib
import base64
import json
import time
import logging
from enum import Enum
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Union, Callable
from pydantic import BaseModel, ConfigDict
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = logging.getLogger("clearguard.auth")

DEFAULT_DEV_SECRET = "clearguard-hackathon-hmac-sha256-signing-secret-key-32b!"
DEFAULT_TOKEN_TTL_SECONDS = 3600  # 1 hour

RECOGNIZED_ENVIRONMENTS = {
    "production": ("production", "prod"),
    "development": ("development", "dev", "local"),
    "test": ("test", "testing"),
}


def get_validated_environment() -> str:
    """
    Strict fail-closed environment resolver (SEC-09):
    1. Evaluates APP_ENV and ENVIRONMENT.
    2. Missing environment returns "UNCONFIGURED" (fails closed: demo auth and simulation disabled).
    3. If both exist, requires them to resolve to the same canonical environment; conflicting values raise RuntimeError.
    4. Rejects unrecognized environment names (e.g., 'staging', 'productn', 'unknown') with RuntimeError.
    5. Returns canonical string: 'production', 'development', 'test', or 'UNCONFIGURED'.
    """
    raw_app = os.getenv("APP_ENV")
    raw_env = os.getenv("ENVIRONMENT")

    if raw_app is not None:
        raw_app = raw_app.strip()
    if raw_env is not None:
        raw_env = raw_env.strip()

    if not raw_app and not raw_env:
        return "UNCONFIGURED"

    def canonicalize(val: Optional[str]) -> Optional[str]:
        if not val:
            return None
        low = val.lower()
        for canon, aliases in RECOGNIZED_ENVIRONMENTS.items():
            if low in aliases:
                return canon
        return f"UNKNOWN:{val}"

    canon_app = canonicalize(raw_app)
    canon_env = canonicalize(raw_env)

    # Check for conflict if both are set
    if canon_app and canon_env:
        if canon_app != canon_env:
            raise RuntimeError(
                f"ENVIRONMENT_CONFLICT: Conflicting environment configuration: "
                f"APP_ENV='{raw_app}' vs ENVIRONMENT='{raw_env}'."
            )
        resolved = canon_app
    else:
        resolved = canon_app or canon_env

    if resolved and resolved.startswith("UNKNOWN:"):
        unknown_val = resolved[len("UNKNOWN:"):]
        raise RuntimeError(
            f"INVALID_ENVIRONMENT: Unrecognized environment value: '{unknown_val}'. "
            f"Allowed environments are: development, test, production."
        )

    return resolved or "UNCONFIGURED"


def is_production_environment() -> bool:
    """Returns True if running in a validated production environment."""
    return get_validated_environment() == "production"


def is_development_or_test_environment() -> bool:
    """Returns True ONLY if running in an explicitly validated development or test environment."""
    return get_validated_environment() in ("development", "test")


def get_auth_secret_key() -> str:
    """
    Dynamically loads and validates the auth secret key from the environment.
    Enforces that production and unconfigured environments CANNOT silently run with missing, default, or weak secrets.
    """
    env = get_validated_environment()
    secret = os.getenv("CLEARGUARD_AUTH_SECRET")

    if not secret:
        if env == "production":
            raise RuntimeError(
                "CRITICAL SECURITY CONFIGURATION ERROR: CLEARGUARD_AUTH_SECRET must be explicitly "
                "configured in production environments. Default keys are strictly prohibited."
            )
        elif env != "development" and env != "test":
            raise RuntimeError(
                "CRITICAL SECURITY CONFIGURATION ERROR: CLEARGUARD_AUTH_SECRET must be explicitly "
                "configured when not running in explicit development or test mode."
            )
        return DEFAULT_DEV_SECRET

    if env == "production" and secret == DEFAULT_DEV_SECRET:
        raise RuntimeError(
            "CRITICAL SECURITY CONFIGURATION ERROR: CLEARGUARD_AUTH_SECRET cannot use the default demo/dev key in production."
        )

    if len(secret) < 32:
        if env == "production" or (env != "development" and env != "test"):
            raise RuntimeError(
                "CRITICAL SECURITY CONFIGURATION ERROR: CLEARGUARD_AUTH_SECRET must be at least 32 characters."
            )
    return secret


class UserRole(str, Enum):
    SUBMITTER = "ROLE_DELIVERY_SUBMITTER"
    REVIEWER = "ROLE_DELIVERY_REVIEWER"
    ADMIN = "ROLE_ADMIN"


class AuthenticatedUser(BaseModel):
    user_id: str
    role: UserRole
    name: str

    model_config = ConfigDict(frozen=True)


DEMO_USERS: Dict[str, Dict[str, Any]] = {
    "submitter_alice": {
        "user_id": "submitter_alice",
        "name": "Alice Submitter (Logistics Specialist)",
        "role": UserRole.SUBMITTER,
    },
    "submitter_bob": {
        "user_id": "submitter_bob",
        "name": "Bob Submitter (Warehouse Dispatch)",
        "role": UserRole.SUBMITTER,
    },
    "reviewer_charlie": {
        "user_id": "reviewer_charlie",
        "name": "Charlie Reviewer (Operations Auditor)",
        "role": UserRole.REVIEWER,
    },
    "reviewer_dave": {
        "user_id": "reviewer_dave",
        "name": "Dave Reviewer (Risk Manager)",
        "role": UserRole.REVIEWER,
    },
    "admin_eve": {
        "user_id": "admin_eve",
        "name": "Eve Admin (Compliance Officer)",
        "role": UserRole.ADMIN,
    },
}

# Pre-configured demo user passwords for hackathon / CI verification.
# Configurable via environment variables.
DEMO_USER_CREDENTIALS: Dict[str, str] = {
    "submitter_alice": os.getenv("DEMO_SUBMITTER_ALICE_PASSWORD", "AliceLogistics2026!"),
    "submitter_bob": os.getenv("DEMO_SUBMITTER_BOB_PASSWORD", "BobWarehouse2026!"),
    "reviewer_charlie": os.getenv("DEMO_REVIEWER_CHARLIE_PASSWORD", "CharlieAuditor2026!"),
    "reviewer_dave": os.getenv("DEMO_REVIEWER_DAVE_PASSWORD", "DaveRiskOps2026!"),
    "admin_eve": os.getenv("DEMO_ADMIN_EVE_PASSWORD", "EveComplianceAdmin2026!"),
}


def verify_demo_credentials(username: str, password: Optional[str]) -> Optional[AuthenticatedUser]:
    """
    Validates credentials for demo user token issuance.
    Uses constant-time comparison to prevent timing attacks.
    Returns AuthenticatedUser if valid; None otherwise.
    Strictly prohibited unless running in an explicitly validated development or test environment (SEC-09).
    """
    if not is_development_or_test_environment():
        logger.warning(
            f"[Auth] Demo credential verification rejected: not in explicit development or test environment (user '{username}')."
        )
        return None

    if not username or not password:
        return None

    clean_user = username.strip()
    user_info = DEMO_USERS.get(clean_user)
    expected_pass = DEMO_USER_CREDENTIALS.get(clean_user)

    if not user_info or not expected_pass:
        return None

    # Constant-time password check
    if not hmac.compare_digest(password.encode("utf-8"), expected_pass.encode("utf-8")):
        return None

    return AuthenticatedUser(
        user_id=user_info["user_id"],
        role=user_info["role"],
        name=user_info["name"]
    )


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _b64url_decode(s: str) -> bytes:
    padding = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + padding)


def create_access_token(
    user_id: str,
    role: Union[UserRole, str],
    name: str = "",
    expires_delta: Optional[timedelta] = None,
    secret_key: Optional[str] = None
) -> str:
    """
    Creates a tamper-evident HMAC-SHA256 signed Bearer token.
    Token format: header.payload.signature
    Fixed algorithm: HS256
    """
    role_str = role.value if isinstance(role, UserRole) else str(role)
    now_ts = int(time.time())
    ttl = int(expires_delta.total_seconds()) if expires_delta else DEFAULT_TOKEN_TTL_SECONDS
    exp_ts = now_ts + ttl
    key = secret_key or get_auth_secret_key()

    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": user_id,
        "role": role_str,
        "name": name,
        "iat": now_ts,
        "exp": exp_ts,
    }

    header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")

    signature = hmac.new(key.encode("utf-8"), signing_input, hashlib.sha256).digest()
    sig_b64 = _b64url_encode(signature)

    return f"{header_b64}.{payload_b64}.{sig_b64}"


def verify_access_token(token: str, secret_key: Optional[str] = None) -> AuthenticatedUser:
    """
    Cryptographically verifies an HMAC-SHA256 token and validates expiration.
    Enforces:
    - Fixed algorithm: only 'HS256' is accepted; attacker-controlled 'none', 'RS256', etc. are rejected.
    - Constant-time signature comparison against timing attacks.
    - Token expiration and mandatory claims ('sub', 'role').
    Raises HTTPException 401 on malformed, expired, incorrectly signed, or invalid tokens.
    """
    if not token or not isinstance(token, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication token"
        )

    parts = token.strip().split(".")
    if len(parts) != 3:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token structure: expected header.payload.signature"
        )

    header_b64, payload_b64, sig_b64 = parts

    # 1. Decode and strictly validate token header (Fixed Algorithm Enforcement)
    try:
        header_bytes = _b64url_decode(header_b64)
        header = json.loads(header_bytes.decode("utf-8"))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Malformed token header: {str(e)}"
        )

    alg = header.get("alg")
    if alg != "HS256":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Unsupported token algorithm '{alg}': only 'HS256' is permitted."
        )

    typ = header.get("typ")
    if typ != "JWT":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token type '{typ}': 'JWT' required."
        )

    # 2. Cryptographic HMAC-SHA256 signature verification
    key = secret_key or get_auth_secret_key()
    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    expected_sig = hmac.new(key.encode("utf-8"), signing_input, hashlib.sha256).digest()
    expected_sig_b64 = _b64url_encode(expected_sig)

    if not hmac.compare_digest(sig_b64, expected_sig_b64):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token signature: token has been tampered with or signed with an unknown key"
        )

    # 3. Decode and validate payload claims
    try:
        payload_bytes = _b64url_decode(payload_b64)
        payload = json.loads(payload_bytes.decode("utf-8"))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Malformed token payload: {str(e)}"
        )

    now_ts = int(time.time())
    if payload.get("exp", 0) < now_ts:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )

    sub = payload.get("sub")
    role_str = payload.get("role")
    name = payload.get("name", "")

    if not sub or not role_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing required claims ('sub', 'role')"
        )

    try:
        user_role = UserRole(role_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token contains unrecognized role '{role_str}'"
        )

    return AuthenticatedUser(user_id=sub, role=user_role, name=name)


# FastAPI Security Scheme (auto_error=False to allow clean custom 401 exceptions)
http_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer)
) -> AuthenticatedUser:
    """
    FastAPI dependency that extracts and validates Bearer credentials.
    Rejects missing or invalid credentials with HTTP 401.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided. Authorization: Bearer <token> header required."
        )

    if credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization scheme: Bearer required"
        )

    return verify_access_token(credentials.credentials)


def require_role(allowed_roles: Union[UserRole, List[UserRole]]) -> Callable:
    """
    Role-based access control dependency factory.
    Admins are always authorized for reviewer/submitter actions (subject to maker-checker).
    Raises HTTP 403 Forbidden if user role is insufficient.
    """
    if isinstance(allowed_roles, UserRole):
        roles_set = {allowed_roles, UserRole.ADMIN}
    else:
        roles_set = set(allowed_roles) | {UserRole.ADMIN}

    async def _role_checker(user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
        if user.role not in roles_set:
            required_names = [r.value for r in roles_set]
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions: requires one of {required_names}, got '{user.role.value}'"
            )
        return user

    return _role_checker
