import os
import uuid
from decimal import Decimal
from datetime import datetime
from typing import AsyncGenerator, Generator
from sqlalchemy import Column, String, Numeric, Boolean, DateTime, Text, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from dotenv import load_dotenv

load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./aurorapay.db")

# Convert standard postgres/sqlite URLs to their async driver variants for non-blocking I/O
if DATABASE_URL.startswith("postgresql://"):
    ASYNC_DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgres://"):
    ASYNC_DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("sqlite:///"):
    ASYNC_DATABASE_URL = DATABASE_URL.replace("sqlite:///", "sqlite+aiosqlite:///", 1)
else:
    ASYNC_DATABASE_URL = DATABASE_URL

# --- Async Connection Pool (Optimized for High-Concurrency Multi-Agent Requests) ---
if "sqlite" in ASYNC_DATABASE_URL:
    async_engine = create_async_engine(
        ASYNC_DATABASE_URL,
        connect_args={"check_same_thread": False},
        pool_pre_ping=True,
    )
    sync_engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        pool_pre_ping=True,
    )
else:
    # PostgreSQL async connection pooling with 10 base workers + 20 overflow burst
    async_engine = create_async_engine(
        ASYNC_DATABASE_URL,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
        pool_recycle=1800,
    )
    sync_engine = create_engine(
        DATABASE_URL,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
        pool_recycle=1800,
    )

AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

SyncSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)
Base = declarative_base()

# --- Database Models with Strict Decimal Numeric(18, 2) Types ---
class MandateModel(Base):
    __tablename__ = "mandates"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False, default="Autonomous Enterprise Spending Mandate")
    
    # Financial precision: Numeric(18, 2) prevents floating-point distortion
    max_single_spend = Column(Numeric(18, 2), nullable=False, default=Decimal("55000.00"))
    total_budget = Column(Numeric(18, 2), nullable=False, default=Decimal("250000.00"))
    remaining_budget = Column(Numeric(18, 2), nullable=False, default=Decimal("150000.00"))
    
    allowed_categories = Column(String, nullable=False, default="electronics,hardware,cloud,office")
    require_escrow = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    currency = Column(String, default="INR")
    created_at = Column(DateTime, default=datetime.utcnow)

class TransactionModel(Base):
    __tablename__ = "transactions"

    id = Column(String, primary_key=True, default=lambda: f"TX-{uuid.uuid4().hex[:8].upper()}")
    item_name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    
    # Financial precision: Numeric(18, 2)
    amount = Column(Numeric(18, 2), nullable=False, default=Decimal("0.00"))
    currency = Column(String, default="INR")
    merchant_name = Column(String, nullable=False)
    
    # State of Money: AUTHORIZED (Locked), CAPTURED (Paid), DISPUTED (Refund Demanded), BLOCKED (403 Violation)
    status = Column(String, nullable=False, default="AUTHORIZED")
    block_reason = Column(Text, nullable=True)
    
    paypal_order_id = Column(String, nullable=True)
    paypal_auth_id = Column(String, nullable=True)
    paypal_capture_id = Column(String, nullable=True)
    paypal_dispute_id = Column(String, nullable=True)
    dispute_reason = Column(Text, nullable=True)
    dispute_evidence = Column(Text, nullable=True)
    
    tracking_number = Column(String, nullable=True)
    carrier = Column(String, nullable=True)
    delivery_status = Column(String, default="IN_TRANSIT")
    
    # Phase 1: Cryptographic Immutable Ledger Chain
    state_hash = Column(String(64), nullable=True, index=True)
    previous_state_hash = Column(String(64), nullable=True)
    state_chain = Column(Text, nullable=True) # Serialized JSON array of state hash steps
    is_corrupted = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Ensure tables exist in synchronous bootstrap
try:
    Base.metadata.create_all(bind=sync_engine)
except Exception as e:
    print(f"[Database] Warning creating tables on sync_engine: {e}")

# Async session generator for non-blocking FastAPI route handlers
async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

# Synchronous session generator for backward-compatible dependencies
def get_db() -> Generator:
    db = SyncSessionLocal()
    try:
        yield db
    finally:
        db.close()
