from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class WalletNonce(BaseModel):
    nonce: str
    message: str
    expires_at: datetime

class WalletVerify(BaseModel):
    wallet_address: str
    signature: str
    nonce: str

class ArtworkOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    description: str
    tags: list[str]
    sha256: str
    phash: str
    originality: int
    status: str
    tx_hash: str | None
    image_url: str
    author_email: EmailStr
    author_wallet: str | None
    created_at: datetime

class VerifyResult(BaseModel):
    sha256: str
    registered: bool
    artwork_id: int | None = None
    similarity_percent: float = 0
    suspected_artwork_id: int | None = None
    on_chain_registered: bool = False
    message: str
