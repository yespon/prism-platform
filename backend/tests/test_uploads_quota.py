import pytest

from app.gateway.routers import uploads


def test_upload_quota_blocks_when_hard_limit_exceeded(monkeypatch):
    monkeypatch.setattr(uploads, "_calculate_user_upload_bytes", lambda _user_id: 100)
    monkeypatch.setenv("ADMIN_UPLOAD_BYTES_HARD_LIMIT", "120")

    calls = []
    monkeypatch.setattr(uploads, "record_audit_event", lambda *args, **kwargs: calls.append((args, kwargs)))

    with pytest.raises(Exception) as exc_info:
        uploads._enforce_upload_quota("u1", "t1", incoming_bytes=30)

    assert "Upload quota exceeded" in str(exc_info.value)
    assert calls
    assert calls[0][0][0] == "upload.quota.blocked"


def test_upload_quota_warns_when_soft_limit_exceeded(monkeypatch):
    monkeypatch.setattr(uploads, "_calculate_user_upload_bytes", lambda _user_id: 100)
    monkeypatch.delenv("ADMIN_UPLOAD_BYTES_HARD_LIMIT", raising=False)
    monkeypatch.setenv("ADMIN_UPLOAD_BYTES_SOFT_LIMIT", "110")

    calls = []
    monkeypatch.setattr(uploads, "record_audit_event", lambda *args, **kwargs: calls.append((args, kwargs)))

    uploads._enforce_upload_quota("u1", "t1", incoming_bytes=20)

    assert calls
    assert calls[0][0][0] == "upload.quota.soft_limit_exceeded"


def test_upload_quota_noop_without_limits(monkeypatch):
    monkeypatch.setattr(uploads, "_calculate_user_upload_bytes", lambda _user_id: 100)
    monkeypatch.delenv("ADMIN_UPLOAD_BYTES_HARD_LIMIT", raising=False)
    monkeypatch.delenv("ADMIN_UPLOAD_BYTES_SOFT_LIMIT", raising=False)

    uploads._enforce_upload_quota("u1", "t1", incoming_bytes=20)
