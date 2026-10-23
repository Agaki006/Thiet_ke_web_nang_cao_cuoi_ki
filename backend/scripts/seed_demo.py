"""Seed a small, repeatable MediaGuard exhibition dataset.

Run from backend/:
    python scripts/seed_demo.py
Use --reset-demo to remove only rows created by this script.
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw
from sqlalchemy import select, delete

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db import SessionLocal, Base, engine, ensure_sqlite_columns
from app.models import Artwork, User
# Dùng đúng thư mục upload của backend (biến UPLOAD_DIR) để /media phục vụ được file seed,
# cả khi chạy local lẫn trong Docker (UPLOAD_DIR=/data/uploads nằm trong volume).
from app.routers.artworks import UPLOAD_DIR
from app.services.auth_service import hash_password
from app.services.image_service import phash_file

UPLOADS = UPLOAD_DIR.resolve()
SEED_PREFIX = "[Demo]"

DEMO_WORKS = [
    ("image", "Coastal Light", "A quiet study of morning light along the central coast.", ["photography", "coast", "light"]),
    ("image", "Night Transit", "A cinematic frame about movement, distance and city nights.", ["cinema", "night", "city"]),
    ("image", "Tropical Geometry", "Architecture, shadow and green space arranged as a visual rhythm.", ["architecture", "geometry", "tropical"]),
    ("written", "Letters from the Monsoon", "A short essay about memory, rain and returning home.", ["essay", "memory", "vietnam"]),
    ("written", "The Last Blue Hour", "A short story about two strangers sharing one final train ride.", ["short story", "fiction", "travel"]),
    ("written", "Notes on Making", "A reflective article on craft, patience and creative practice.", ["article", "craft", "creative"]),
    ("written", "Small Weather", "A compact poem about ordinary days and changing skies.", ["poem", "nature", "minimal"]),
    ("written", "Field Notes 01", "A research note documenting a small urban ecology observation.", ["research", "city", "field notes"]),
]


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def make_image(path: Path, colors: tuple[str, str]) -> None:
    image = Image.new("RGB", (900, 620), colors[0])
    draw = ImageDraw.Draw(image)
    for x in range(0, 900, 45):
        draw.line((x, 0, x - 180, 620), fill=colors[1], width=8)
    draw.ellipse((560, 100, 840, 380), fill=colors[1])
    image.save(path, format="PNG")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset-demo", action="store_true")
    args = parser.parse_args()
    Base.metadata.create_all(bind=engine)
    ensure_sqlite_columns()
    UPLOADS.mkdir(parents=True, exist_ok=True)
    db = SessionLocal()
    try:
        if args.reset_demo:
            db.execute(delete(Artwork).where(Artwork.title.like(f"{SEED_PREFIX}%")))
            db.commit()
        authors = []
        for email, wallet in [
            ("demo.artist@mediaguard.local", "0x0000000000000000000000000000000000000101"),
            ("demo.writer@mediaguard.local", "0x0000000000000000000000000000000000000102"),
            ("demo.studio@mediaguard.local", "0x0000000000000000000000000000000000000103"),
        ]:
            user = db.scalar(select(User).where(User.email == email))
            if not user:
                user = User(email=email, password_hash=hash_password("demo-password-please-change"), wallet_address=wallet, wallet_verified_at=__import__("datetime").datetime.now(__import__("datetime").timezone.utc))
                db.add(user); db.flush()
            authors.append(user)
        colors = [("#183c58", "#65e5d0"), ("#34245e", "#f3a46f"), ("#1e5555", "#b8a7ff")]
        for index, (kind, title, description, tags) in enumerate(DEMO_WORKS):
            full_title = f"{SEED_PREFIX} {title}"
            if db.scalar(select(Artwork).where(Artwork.title == full_title)):
                continue
            owner = authors[index % len(authors)]
            if kind == "image":
                path = UPLOADS / f"demo_{index}.png"
                make_image(path, colors[index % len(colors)])
                data = path.read_bytes()
                sha = digest(data); phash = phash_file(path)
                row = Artwork(owner_id=owner.id, file_path=str(path), sha256=sha, phash=phash, title=full_title, description=description, tags=json.dumps(tags), originality=98 - index, status="approved_local", show_contact_email=False, media_type="image", work_type="artwork", language=None, license="All rights reserved", visibility="public", show_public_preview=False, allow_download=False)
            else:
                text = f"{title}\n\n{description}\n\nThis is a curated demonstration text for the MediaGuard public exhibition. It shows how a written work can have a private source file, a public proof record, and an optional reading preview."
                path = UPLOADS / f"demo_{index}.txt"; path.write_text(text, encoding="utf-8")
                data = path.read_bytes(); sha = digest(data)
                row = Artwork(owner_id=owner.id, file_path=str(path), sha256=sha, phash="", title=full_title, description=description, tags=json.dumps(tags), originality=97 - index, status="approved_local", show_contact_email=False, media_type="written", work_type=tags[0], language="English", word_count=len(text.split()), page_count=1, content_text=" ".join(text.split()), preview_text=text[:400], license="All rights reserved", visibility="public", show_public_preview=True, allow_download=False)
            db.add(row)
        db.commit()
        print("Seed complete: 8 demo works are available in the public exhibition.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
