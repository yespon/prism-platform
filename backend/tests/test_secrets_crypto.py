from deerflow.database import secrets_crypto as crypto


def test_encrypt_decrypt_text_roundtrip(monkeypatch):
    monkeypatch.setenv("DEERFLOW_SECRETS_ENCRYPTION_KEY", "unit-test-key")
    crypto.reset_crypto_cache()

    plaintext = "my-secret"
    encrypted = crypto.encrypt_text(plaintext)

    assert encrypted.startswith("enc:v1:")
    assert crypto.decrypt_text(encrypted) == plaintext


def test_encrypt_model_settings_only_sensitive_fields(monkeypatch):
    monkeypatch.setenv("DEERFLOW_SECRETS_ENCRYPTION_KEY", "unit-test-key")
    crypto.reset_crypto_cache()

    settings = {
        "name": "demo",
        "api_key": "sk-123",
        "max_tokens": 1024,
        "nested": {"client_secret": "c-secret", "label": "safe"},
    }

    encrypted = crypto.encrypt_model_settings(settings)
    assert encrypted["name"] == "demo"
    assert encrypted["api_key"].startswith("enc:v1:")
    assert encrypted["nested"]["client_secret"].startswith("enc:v1:")
    assert encrypted["nested"]["label"] == "safe"

    decrypted = crypto.decrypt_model_settings(encrypted)
    assert decrypted == settings


def test_encrypt_decrypt_mcp_payload(monkeypatch):
    monkeypatch.setenv("DEERFLOW_SECRETS_ENCRYPTION_KEY", "unit-test-key")
    crypto.reset_crypto_cache()

    payload = {
        "enabled": True,
        "env": {"OPENAI_API_KEY": "k-1", "SAFE": "ok"},
        "headers": {"Authorization": "Bearer abc"},
        "oauth": {"client_secret": "s-1", "token_url": "https://x.example.com"},
    }

    encrypted = crypto.encrypt_mcp_server_payload(payload)
    assert encrypted["env"]["OPENAI_API_KEY"].startswith("enc:v1:")
    assert encrypted["headers"]["Authorization"].startswith("enc:v1:")
    assert encrypted["oauth"]["client_secret"].startswith("enc:v1:")
    assert encrypted["oauth"]["token_url"].startswith("enc:v1:")

    decrypted = crypto.decrypt_mcp_server_payload(encrypted)
    assert decrypted == payload


def test_no_key_keeps_plaintext(monkeypatch):
    monkeypatch.delenv("DEERFLOW_SECRETS_ENCRYPTION_KEY", raising=False)
    crypto.reset_crypto_cache()

    assert crypto.encrypt_text("plain") == "plain"
    assert crypto.decrypt_text("enc:v1:unknown") == "enc:v1:unknown"


def test_text_with_explicit_key_helpers_support_rotation():
    old_key = "old-secret-key"
    new_key = "new-secret-key"

    encrypted_old = crypto.encrypt_text_with_key("value-1", old_key)
    assert encrypted_old.startswith("enc:v1:")
    assert crypto.decrypt_text_with_key(encrypted_old, old_key) == "value-1"

    decrypted = crypto.decrypt_text_with_key(encrypted_old, old_key)
    reencrypted = crypto.encrypt_text_with_key(decrypted, new_key)
    assert reencrypted.startswith("enc:v1:")
    assert crypto.decrypt_text_with_key(reencrypted, new_key) == "value-1"


def test_payload_with_explicit_key_helpers_support_rotation():
    old_key = "old-secret-key"
    new_key = "new-secret-key"

    payload = {
        "mcpServers": {
            "demo": {
                "env": {"OPENAI_API_KEY": "k-old"},
                "headers": {"Authorization": "Bearer old"},
                "oauth": {"client_secret": "s-old"},
            }
        }
    }

    encrypted_old = crypto.encrypt_extensions_payload_with_key(payload, old_key)
    plain = crypto.decrypt_extensions_payload_with_key(encrypted_old, old_key)
    encrypted_new = crypto.encrypt_extensions_payload_with_key(plain, new_key)

    assert crypto.decrypt_extensions_payload_with_key(encrypted_new, new_key) == payload
