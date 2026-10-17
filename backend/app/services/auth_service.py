import os
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from jose import jwt
from passlib.context import CryptContext

load_dotenv()
SECRET = os.getenv("JWT_SECRET")
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)

def create_token(subject: str) -> str:
    if not SECRET or len(SECRET) < 32:
        raise RuntimeError("JWT_SECRET phải được cấu hình và dài tối thiểu 32 ký tự")
    exp = datetime.now(timezone.utc) + timedelta(hours=24)
    return jwt.encode({"sub": subject, "exp": exp}, SECRET, algorithm=ALGORITHM)

def decode_token(token: str) -> str:
    if not SECRET or len(SECRET) < 32:
        raise RuntimeError("JWT_SECRET phải được cấu hình và dài tối thiểu 32 ký tự")
    payload = jwt.decode(token, SECRET, algorithms=[ALGORITHM])
    return str(payload["sub"])
