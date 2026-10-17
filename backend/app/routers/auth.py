from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import User
from ..schemas import UserRegister, Token
from ..services.auth_service import hash_password, verify_password, create_token

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=Token, status_code=201)
def register(data: UserRegister, db: Session = Depends(get_db)):
    if db.scalar(select(User).where(User.email == data.email)):
        raise HTTPException(409, "Email đã tồn tại")
    user = User(email=data.email, password_hash=hash_password(data.password), wallet_address=data.wallet_address)
    db.add(user); db.commit(); db.refresh(user)
    return Token(access_token=create_token(str(user.id)))

@router.post("/login", response_model=Token)
def login(data: UserRegister, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == data.email))
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email hoặc mật khẩu không đúng")
    return Token(access_token=create_token(str(user.id)))
