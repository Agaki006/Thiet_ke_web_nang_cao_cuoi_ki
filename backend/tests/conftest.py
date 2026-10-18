import os
import shutil
import tempfile
from pathlib import Path

# Được import trước các test module, nên app sẽ bind vào DB tạm ngay từ đầu.
_TEST_DIR = Path(tempfile.mkdtemp(prefix="mediaguard-tests-"))
os.environ["DATABASE_URL"] = f"sqlite:///{_TEST_DIR / 'test.db'}"
os.environ.setdefault("JWT_SECRET", "0123456789abcdef0123456789abcdef")
os.environ.setdefault("ENV", "test")

import pytest

@pytest.fixture(scope="session", autouse=True)
def cleanup_test_database():
    yield
    shutil.rmtree(_TEST_DIR, ignore_errors=True)
