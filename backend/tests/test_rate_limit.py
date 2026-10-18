from app.services.rate_limit import SlidingWindowLimiter
from concurrent.futures import ThreadPoolExecutor


def test_limiter_rejects_and_prunes_expired_bucket(monkeypatch):
    clock = [100.0]
    monkeypatch.setattr("app.services.rate_limit.time.monotonic", lambda: clock[0])
    limiter = SlidingWindowLimiter(limit=2, window_seconds=60, max_keys=3)

    assert limiter.allow("client") is True
    assert limiter.allow("client") is True
    assert limiter.allow("client") is False

    clock[0] = 161.0
    assert limiter.allow("client") is True


def test_limiter_bounds_stale_keys(monkeypatch):
    clock = [10.0]
    monkeypatch.setattr("app.services.rate_limit.time.monotonic", lambda: clock[0])
    limiter = SlidingWindowLimiter(limit=1, window_seconds=10, max_keys=2)
    limiter.allow("a")
    limiter.allow("b")
    clock[0] = 30.0
    limiter.allow("c")
    assert len(limiter._hits) <= 2


def test_limiter_allows_at_most_limit_under_concurrency():
    limiter = SlidingWindowLimiter(limit=5, window_seconds=60)
    with ThreadPoolExecutor(max_workers=20) as pool:
        results = list(pool.map(lambda _: limiter.allow("same-client"), range(20)))
    assert sum(results) == 5
