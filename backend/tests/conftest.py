import os
import pytest
from core.kill_switch import kill_switch

@pytest.fixture(autouse=True)
def ensure_test_environment(monkeypatch):
    """
    Ensures tests default to explicit test environment if neither
    APP_ENV nor ENVIRONMENT is set in the host environment.
    Individual tests can override via monkeypatch.
    Also ensures kill_switch is in clean state before and after each test.
    """
    if "APP_ENV" not in os.environ and "ENVIRONMENT" not in os.environ:
        monkeypatch.setenv("APP_ENV", "test")
    kill_switch.reset_lockdown()
    yield
    kill_switch.reset_lockdown()

