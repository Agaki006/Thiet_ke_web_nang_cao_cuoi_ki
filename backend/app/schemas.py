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
    image_url: str | None
    download_url: str | None
    author_email: EmailStr | None
    author_wallet: str | None
    media_type: str
    work_type: str | None
    language: str | None
    word_count: int | None
    page_count: int | None
    preview_text: str | None
    license: str
    visibility: str
    show_public_preview: bool
    allow_download: bool
    created_at: datetime
    # Derived per request from the authenticated subject; never client-supplied.
    is_owner: bool = False

class VerifyResult(BaseModel):
    sha256: str
    media_type: str = "image"
    registered: bool
    artwork_id: int | None = None
    similarity_percent: float = 0
    suspected_artwork_id: int | None = None
    suspected_artwork_title: str | None = None
    suspected_artwork_image_url: str | None = None
    suspected_artwork_media_type: str | None = None
    matched_title: str | None = None
    matched_wallet: str | None = None
    matched_created_at: datetime | None = None
    matched_status: str | None = None
    matched_tx_hash: str | None = None
    matched_image_url: str | None = None
    matched_block_number: int | None = None
    matched_block_timestamp: datetime | None = None
    on_chain_registered: bool = False
    message: str
