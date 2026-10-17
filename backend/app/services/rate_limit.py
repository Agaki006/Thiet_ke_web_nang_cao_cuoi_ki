import os
import time
from collections import defaultdict, deque
from threading import Lock

class SlidingWindowLimiter:
    def __init__(self, limit: int, window_seconds: int = 60, max_keys: int = 10000):
        self.limit = max(1, limit)
        self.window_seconds = window_seconds
        self.max_keys = max_keys
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def allow(self, key: str) -> bool:
        now = time.monotonic()
        with self._lock:
            hits = self._hits[key]
            while hits and now - hits[0] >= self.window_seconds:
                hits.popleft()
            if len(hits) >= self.limit:
                return False
            hits.append(now)
            if len(self._hits) > self.max_keys:
                stale = [k for k, values in self._hits.items() if not values or now - values[-1] >= self.window_seconds]
                for stale_key in stale[: max(1, len(stale) - self.max_keys // 2)]:
                    self._hits.pop(stale_key, None)
            return True

VERIFY_LIMITER = SlidingWindowLimiter(int(os.getenv("VERIFY_RATE_LIMIT", "30")))
AUTH_LIMITER = SlidingWindowLimiter(int(os.getenv("AUTH_RATE_LIMIT", "10")))
