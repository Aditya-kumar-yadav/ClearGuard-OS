import asyncio

# Global single-process transaction ledger lock (SEC-07, SEC-10, SEC-14)
# Scoped to a single process asyncio event loop.
# Multi-worker deployments (e.g. Gunicorn/Uvicorn with multiple workers) require Stage 6 distributed database locking.
LEDGER_LOCK = asyncio.Lock()

