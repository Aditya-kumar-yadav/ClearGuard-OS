import os
import pytest

@pytest.fixture(autouse=True)
def ensure_test_environment(monkeypatch):
    """
    Ensures tests default to explicit test environment if neither
    APP_ENV nor ENVIRONMENT is set in the host environment.
    Individual tests can override via monkeypatch.
    """
    if "APP_ENV" not in os.environ and "ENVIRONMENT" not in os.environ:
        monkeypatch.setenv("APP_ENV", "test")

