import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./mediaguard.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_sqlite_columns():
    """Additive migration for legacy SQLite databases created before wallet fields."""
    if not DATABASE_URL.startswith("sqlite"):
        return
    columns = {row["name"] for row in inspect(engine).get_columns("users")}
    additions = {
        "wallet_nonce": "VARCHAR(128)",
        "wallet_nonce_expires_at": "DATETIME",
        "wallet_verified_at": "DATETIME",
    }
    with engine.begin() as connection:
        for name, sql_type in additions.items():
            if name not in columns:
                connection.execute(text(f"ALTER TABLE users ADD COLUMN {name} {sql_type}"))
        artwork_columns = {row["name"] for row in inspect(engine).get_columns("artworks")}
        artwork_additions = {
            "show_contact_email": "BOOLEAN NOT NULL DEFAULT 0",
            "media_type": "VARCHAR(20) NOT NULL DEFAULT 'image'",
            "work_type": "VARCHAR(30)",
            "language": "VARCHAR(30)",
            "word_count": "INTEGER",
            "page_count": "INTEGER",
            "content_text": "TEXT NOT NULL DEFAULT ''",
            "preview_text": "TEXT",
            "license": "VARCHAR(80) NOT NULL DEFAULT 'All rights reserved'",
            "visibility": "VARCHAR(20) NOT NULL DEFAULT 'public'",
            "show_public_preview": "BOOLEAN NOT NULL DEFAULT 0",
            "allow_download": "BOOLEAN NOT NULL DEFAULT 0",
        }
        for name, sql_type in artwork_additions.items():
            if name not in artwork_columns:
                connection.execute(text(f"ALTER TABLE artworks ADD COLUMN {name} {sql_type}"))
