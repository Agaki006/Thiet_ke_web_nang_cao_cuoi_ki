from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .db import Base, engine
from .routers import auth, artworks

Base.metadata.create_all(bind=engine)
app = FastAPI(title="MediaGuard API", version="0.1.0", description="Đăng ký bản quyền ảnh bằng SHA-256, pHash và blockchain")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(auth.router)
app.include_router(artworks.router)

@app.get("/health")
def health(): return {"status": "ok", "service": "mediaguard-api"}
