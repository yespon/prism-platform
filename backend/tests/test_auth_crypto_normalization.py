import hashlib

from app.gateway.auth_crypto import hash_password, verify_password


def _legacy_hash_without_nfkc(password: str, salt_hex: str) -> str:
    key = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt_hex.encode("utf-8"),
        n=16384,
        r=16,
        p=1,
        dklen=64,
        maxmem=128 * 16384 * 16 * 2,
    )
    return f"{salt_hex}:{key.hex()}"


def test_hash_password_matches_nfkc_behavior() -> None:
    full_width = "ＡＢＣ１２３"
    normalized = "ABC123"

    hashed = hash_password(full_width)

    assert verify_password(hashed, full_width) is True
    assert verify_password(hashed, normalized) is True


def test_verify_password_supports_legacy_non_nfkc_hashes() -> None:
    full_width = "ＡＢＣ１２３"
    normalized = "ABC123"
    legacy_hash = _legacy_hash_without_nfkc(full_width, "0123456789abcdef0123456789abcdef")

    assert verify_password(legacy_hash, full_width) is True
    assert verify_password(legacy_hash, normalized) is False
