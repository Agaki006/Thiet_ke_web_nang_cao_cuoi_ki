import io
import os
from datetime import datetime, timezone
from pathlib import Path

os.environ.setdefault("DATABASE_URL", "sqlite:////tmp/mediaguard-api-tests.db")
os.environ.setdefault("JWT_SECRET", "0123456789abcdef0123456789abcdef")
os.environ.setdefault("ENV", "test")

from fastapi.testclient import TestClient
from PIL import Image

from app.main import app
from app.db import SessionLocal
from app.models import Artwork, User
from app.routers import artworks as artwork_router
from app.services.auth_service import hash_password

client = TestClient(app)


def png_bytes(color="red"):
    buffer = io.BytesIO()
    Image.new("RGB", (32, 32), color).save(buffer, format="PNG")
    return buffer.getvalue()


def test_auth_and_verify_endpoint(monkeypatch):
    email = "api-test@example.com"
    response = client.post("/auth/register", json={"email": email, "password": "correct-horse-battery-staple"})
    assert response.status_code in {201, 409}
    token = client.post("/auth/login", json={"email": email, "password": "correct-horse-battery-staple"}).json()["access_token"]
    assert token

    monkeypatch.setattr(artwork_router, "VERIFY_LIMITER", type("Limiter", (), {"allow": lambda self, key: True})())
    response = client.post("/verify", files={"file": ("image.png", png_bytes(), "image/png")})
    assert response.status_code == 200
    assert response.json()["registered"] is False


def test_retry_chain_updates_existing_artwork(monkeypatch):
    db = SessionLocal()
    user = User(email="retry@example.com", password_hash=hash_password("correct-horse-battery-staple"), wallet_address="0x0000000000000000000000000000000000000001", wallet_verified_at=datetime.now(timezone.utc))
    db.add(user); db.commit(); db.refresh(user)
    artwork = Artwork(owner_id=user.id, file_path="/tmp/artwork", sha256="11" * 32, phash="00" * 8, title="Retry", originality=100, status="chain_failed")
    db.add(artwork); db.commit(); db.refresh(artwork)
    user_id, artwork_id = user.id, artwork.id
    db.close()

    token = client.post("/auth/login", json={"email": "retry@example.com", "password": "correct-horse-battery-staple"}).json()["access_token"]
    monkeypatch.setattr(artwork_router, "verify_on_chain", lambda file_hash: False)
    monkeypatch.setattr(artwork_router, "register_on_chain", lambda *args: "0x" + "ab" * 32)
    response = client.post(f"/artworks/{artwork_id}/retry-chain", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200, response.text
    assert response.json()["status"] == "protected"
