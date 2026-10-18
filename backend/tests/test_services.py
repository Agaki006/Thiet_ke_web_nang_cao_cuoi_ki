from pathlib import Path

from eth_account import Account
from eth_account.messages import encode_defunct
from PIL import Image
import pytest

from app.services.image_service import InvalidImageError, phash_file, sha256_file, validate_image
from app.services.wallet_service import build_message, recover_address
from app.routers import artworks as artworks_router


def test_image_hashes_and_invalid_file(tmp_path: Path):
    image_path = tmp_path / "image.png"
    Image.new("RGB", (32, 32), "red").save(image_path)
    validate_image(image_path)
    assert len(sha256_file(image_path)) == 64
    assert len(phash_file(image_path)) == 16

    invalid_path = tmp_path / "not-image.bin"
    invalid_path.write_bytes(b"not an image")
    with pytest.raises(InvalidImageError):
        validate_image(invalid_path)


def test_wallet_signature_recovers_expected_address():
    account = Account.create()
    message = build_message("owner@example.com", "one-time-nonce")
    signed = Account.sign_message(encode_defunct(text=message), account.key)
    recovered = recover_address(message, signed.signature.hex())
    assert recovered.lower() == account.address.lower()


def test_safe_registration_tx_lookup_returns_none_on_rpc_error(monkeypatch):
    def fail_lookup(_file_hash):
        raise RuntimeError("RPC unavailable")

    monkeypatch.setattr(artworks_router, "find_registration_tx", fail_lookup)
    assert artworks_router._safe_find_registration_tx("ab" * 32) is None
