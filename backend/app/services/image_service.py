import hashlib
from pathlib import Path
from PIL import Image
import imagehash

def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()

def phash_file(path: Path) -> str:
    with Image.open(path) as image:
        return str(imagehash.phash(image.convert("RGB")))

def similarity_percent(phash_a: str, phash_b: str) -> float:
    distance = imagehash.hex_to_hash(phash_a) - imagehash.hex_to_hash(phash_b)
    max_distance = len(imagehash.hex_to_hash(phash_a))
    return max(0.0, round((1 - distance / max_distance) * 100, 2))
