import json, os, uuid
from pathlib import Path
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import Artwork, User
from ..schemas import ArtworkOut, VerifyResult
from ..services.auth_service import decode_token
from ..services.image_service import sha256_file, phash_file, similarity_percent

oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/login")
router = APIRouter(tags=["artworks"])
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads")); UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED = {"image/jpeg", "image/png", "image/webp"}

def current_user(token: str = Depends(oauth2), db: Session = Depends(get_db)) -> User:
    try: user_id = int(decode_token(token))
    except (JWTError, ValueError, KeyError): raise HTTPException(401, "Token không hợp lệ")
    user = db.get(User, user_id)
    if not user: raise HTTPException(401, "Không tìm thấy người dùng")
    return user

def parse_artwork(row: Artwork) -> ArtworkOut:
    return ArtworkOut(id=row.id, title=row.title, description=row.description, tags=json.loads(row.tags), sha256=row.sha256, phash=row.phash, originality=row.originality, status=row.status, tx_hash=row.tx_hash, created_at=row.created_at)

@router.get("/artworks", response_model=list[ArtworkOut])
def list_artworks(db: Session = Depends(get_db)):
    return [parse_artwork(x) for x in db.scalars(select(Artwork).order_by(Artwork.created_at.desc())).all()]

@router.post("/artworks/register", response_model=ArtworkOut, status_code=201)
async def register_artwork(file: UploadFile = File(...), title: str = Form("Untitled"), description: str = Form(""), tags: str = Form("[]"), user: User = Depends(current_user), db: Session = Depends(get_db)):
    if file.content_type not in ALLOWED: raise HTTPException(415, "Chỉ nhận JPEG, PNG hoặc WebP")
    target = UPLOAD_DIR / f"{uuid.uuid4().hex}_{Path(file.filename or 'image').name}"
    target.write_bytes(await file.read())
    sha = sha256_file(target)
    if db.scalar(select(Artwork).where(Artwork.sha256 == sha)):
        target.unlink(missing_ok=True); raise HTTPException(409, "Ảnh trùng SHA-256 với tác phẩm đã đăng ký")
    phash = phash_file(target)
    nearest, best = None, 0.0
    for row in db.scalars(select(Artwork)).all():
        score = similarity_percent(phash, row.phash)
        if score > best: best, nearest = score, row
    if best >= 85:
        target.unlink(missing_ok=True); raise HTTPException(409, {"message": "Ảnh quá giống tác phẩm đã đăng ký", "similarity_percent": best, "suspected_artwork_id": nearest.id})
    try: tag_list = json.loads(tags)
    except json.JSONDecodeError: tag_list = [x.strip() for x in tags.split(",") if x.strip()]
    row = Artwork(owner_id=user.id, file_path=str(target), sha256=sha, phash=phash, title=title, description=description, tags=json.dumps(tag_list), originality=round(100-best), status="approved")
    db.add(row); db.commit(); db.refresh(row)
    return parse_artwork(row)

@router.post("/verify", response_model=VerifyResult)
async def verify_artwork(file: UploadFile = File(...), db: Session = Depends(get_db)):
    target = UPLOAD_DIR / f"verify_{uuid.uuid4().hex}"
    target.write_bytes(await file.read())
    sha, phash = sha256_file(target), phash_file(target); target.unlink(missing_ok=True)
    exact = db.scalar(select(Artwork).where(Artwork.sha256 == sha))
    if exact: return VerifyResult(sha256=sha, registered=True, artwork_id=exact.id, similarity_percent=100, message="Đã xác minh chính xác trên hệ thống")
    nearest, best = None, 0.0
    for row in db.scalars(select(Artwork)).all():
        score = similarity_percent(phash, row.phash)
        if score > best: best, nearest = score, row
    return VerifyResult(sha256=sha, registered=False, suspected_artwork_id=nearest.id if nearest else None, similarity_percent=best, message=f"Không trùng tuyệt đối; giống gần nhất {best}%" if nearest else "Chưa có dữ liệu đối chiếu")
