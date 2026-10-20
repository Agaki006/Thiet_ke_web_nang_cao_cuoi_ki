import io
from datetime import datetime, timezone
from uuid import uuid4

from fastapi.testclient import TestClient
from eth_account import Account
from eth_account.messages import encode_defunct
from PIL import Image
from sqlalchemy import select

from app.main import app
from app.db import SessionLocal
from app.models import Artwork, User
from app.routers import artworks as artwork_router
from app.services.auth_service import hash_password
from app.services.rate_limit import SlidingWindowLimiter
from app.services.wallet_service import build_message

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

    monkeypatch.setattr(artwork_router, "VERIFY_LIMITER", SlidingWindowLimiter(limit=1))
    response = client.post("/verify", files={"file": ("image.png", png_bytes(), "image/png")})
    assert response.status_code == 200
    assert response.json()["registered"] is False
    response = client.post("/verify", files={"file": ("image.png", png_bytes(), "image/png")})
    assert response.status_code == 429


def test_retry_chain_updates_existing_artwork(monkeypatch):
    db = SessionLocal()
    email = f"retry-{uuid4().hex}@example.com"
    password = "correct-horse-battery-staple"
    user = User(email=email, password_hash=hash_password(password), wallet_address="0x0000000000000000000000000000000000000001", wallet_verified_at=datetime.now(timezone.utc))
    db.add(user); db.commit(); db.refresh(user)
    artwork = Artwork(owner_id=user.id, file_path="/tmp/artwork", sha256=uuid4().hex * 2, phash="00" * 8, title="Retry", originality=100, status="chain_failed")
    db.add(artwork); db.commit(); db.refresh(artwork)
    user_id, artwork_id = user.id, artwork.id
    db.close()

    token = client.post("/auth/login", json={"email": email, "password": password}).json()["access_token"]
    monkeypatch.setattr(artwork_router, "verify_on_chain", lambda file_hash: False)
    monkeypatch.setattr(artwork_router, "register_on_chain", lambda *args: "0x" + "ab" * 32)
    response = client.post(f"/artworks/{artwork_id}/retry-chain", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200, response.text
    assert response.json()["status"] == "protected"


def test_metamask_signature_and_nonce_errors():
    email = f"wallet-{uuid4().hex}@example.com"
    password = "correct-horse-battery-staple"
    register = client.post("/auth/register", json={"email": email, "password": password})
    assert register.status_code == 201, register.text
    token = register.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    nonce_response = client.post("/auth/wallet/nonce", headers=headers)
    assert nonce_response.status_code == 200, nonce_response.text
    nonce_data = nonce_response.json()
    account = Account.create()

    wrong_nonce = "definitely-not-the-issued-nonce"
    wrong_message = build_message(email, wrong_nonce)
    wrong_signature = Account.sign_message(encode_defunct(text=wrong_message), account.key).signature.hex()
    rejected = client.post("/auth/wallet/verify", headers=headers, json={
        "wallet_address": account.address,
        "signature": wrong_signature,
        "nonce": wrong_nonce,
    })
    assert rejected.status_code == 400
    assert "Nonce" in rejected.json()["detail"]

    signature = Account.sign_message(encode_defunct(text=nonce_data["message"]), account.key).signature.hex()
    verified = client.post("/auth/wallet/verify", headers=headers, json={
        "wallet_address": account.address,
        "signature": signature,
        "nonce": nonce_data["nonce"],
    })
    assert verified.status_code == 200, verified.text

    replayed = client.post("/auth/wallet/verify", headers=headers, json={
        "wallet_address": account.address,
        "signature": signature,
        "nonce": nonce_data["nonce"],
    })
    assert replayed.status_code == 400
    assert "Nonce" in replayed.json()["detail"]


def test_register_written_work_with_public_preview(monkeypatch):
    email = f"writer-{uuid4().hex}@example.com"
    password = "correct-horse-battery-staple"
    register = client.post("/auth/register", json={"email": email, "password": password})
    assert register.status_code == 201, register.text
    token = register.json()["access_token"]
    db = SessionLocal()
    user = db.scalar(select(User).where(User.email == email))
    user.wallet_address = "0x0000000000000000000000000000000000000001"
    user.wallet_verified_at = datetime.now(timezone.utc)
    db.commit(); db.close()
    monkeypatch.setattr(artwork_router, "register_on_chain", lambda *args: None)
    monkeypatch.setattr(artwork_router, "verify_on_chain", lambda *args: False)
    content = "Những ngày bên sông Hàn là một bài viết thử nghiệm. " * 12
    response = client.post("/artworks/register", headers={"Authorization": f"Bearer {token}"}, files={"file": ("essay.txt", content.encode(), "text/plain")}, data={
        "title": "Những ngày bên sông Hàn", "media_type": "written", "work_type": "essay", "language": "Vietnamese",
        "show_public_preview": "true", "show_contact_email": "true", "license": "All rights reserved",
    })
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["media_type"] == "written"
    assert body["preview_text"].startswith("Những ngày")
    assert body["author_email"] == email
    assert body["download_url"] is None
