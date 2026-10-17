import secrets
from datetime import datetime, timedelta, timezone
from eth_account import Account
from eth_account.messages import encode_defunct

NONCE_TTL_MINUTES = 10

def new_nonce() -> str: return secrets.token_urlsafe(32)
def build_message(email: str, nonce: str) -> str:
    return f"MediaGuard wallet verification\nEmail: {email}\nNonce: {nonce}\nThis signature does not authorize transactions."
def expires_at() -> datetime: return datetime.now(timezone.utc) + timedelta(minutes=NONCE_TTL_MINUTES)
def recover_address(message: str, signature: str) -> str:
    return Account.recover_message(encode_defunct(text=message), signature=signature)
