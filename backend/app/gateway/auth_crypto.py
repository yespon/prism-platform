import hashlib
import secrets
import unicodedata


def _normalize_password(password: str) -> str:
    """Match Better Auth behavior by normalizing password input with NFKC."""
    return unicodedata.normalize("NFKC", password)


def _derive_key(password: str, salt_hex: str) -> str:
    key = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt_hex.encode("utf-8"),
        n=16384,
        r=16,
        p=1,
        dklen=64,
        maxmem=128 * 16384 * 16 * 2,
    )
    return key.hex()

def hash_password(password: str) -> str:
    """
    Hashes a password using scrypt with parameters matching default Better Auth (noble/hashes).
    Format returned: {salt_hex}:{derived_key_hex}
    """
    password = _normalize_password(password)
    salt_bytes = secrets.token_bytes(16)
    salt_hex = salt_bytes.hex()

    key_hex = _derive_key(password, salt_hex)
    return f"{salt_hex}:{key_hex}"

def verify_password(hash_str: str, password: str) -> bool:
    """
    Verifies a password against a string hashed by hash_password.
    """
    try:
        salt_hex, key_hex = hash_str.split(":")

        # Primary path: Better Auth-compatible normalized verification.
        normalized_password = _normalize_password(password)
        if _derive_key(normalized_password, salt_hex) == key_hex:
            return True

        # Compatibility path: allow verification of legacy hashes created
        # before NFKC normalization was introduced.
        if normalized_password != password and _derive_key(password, salt_hex) == key_hex:
            return True

        return False
    except Exception:
        return False
