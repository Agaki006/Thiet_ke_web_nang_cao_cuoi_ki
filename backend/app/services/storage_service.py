import os
from pathlib import Path

import cloudinary
import cloudinary.uploader


def cloud_enabled() -> bool:
    return all(os.getenv(k) for k in ("CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"))


def is_remote(path) -> bool:
    return bool(path) and str(path).startswith(("http://", "https://"))


def upload_file(path: Path, media_type: str) -> str:
    cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
        api_key=os.getenv("CLOUDINARY_API_KEY"),
        api_secret=os.getenv("CLOUDINARY_API_SECRET"),
        secure=True,
    )
    is_image = media_type == "image"
    result = cloudinary.uploader.upload(
        str(path),
        resource_type="image" if is_image else "raw",
        folder="mediaguard",
        public_id=path.stem if is_image else path.name,
        overwrite=False,
    )
    return result["secure_url"]


def media_url(file_path) -> str:
    if is_remote(file_path):
        return str(file_path)
    return f"/api/media/{Path(file_path).name}"