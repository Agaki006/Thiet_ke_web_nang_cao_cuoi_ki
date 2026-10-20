import re
from difflib import SequenceMatcher
from pathlib import Path

from pypdf import PdfReader


class InvalidWrittenWorkError(ValueError):
    pass


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("\ufeff", " ")).strip()


def extract_written_content(path: Path, media_type: str) -> tuple[str, int]:
    try:
        if media_type == "pdf":
            reader = PdfReader(str(path))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
            page_count = len(reader.pages)
        else:
            text = path.read_text(encoding="utf-8")
            page_count = 1
    except Exception as exc:
        raise InvalidWrittenWorkError("Không thể đọc nội dung tác phẩm viết") from exc
    normalized = normalize_text(text)
    if not normalized:
        raise InvalidWrittenWorkError("Tác phẩm không có văn bản có thể đọc được")
    return normalized, page_count


def text_similarity(text_a: str, text_b: str) -> float:
    if not text_a or not text_b:
        return 0.0
    return round(SequenceMatcher(None, text_a, text_b).ratio() * 100, 2)
