from deerflow.config import app_config as cfg


def test_warns_once_in_production_when_encryption_key_missing(monkeypatch):
    monkeypatch.setenv("DEERFLOW_ENV", "production")
    monkeypatch.delenv("DEERFLOW_SECRETS_ENCRYPTION_KEY", raising=False)
    monkeypatch.setattr(cfg, "_secrets_key_warning_emitted", False)

    warnings = []
    monkeypatch.setattr(cfg.logger, "warning", lambda message: warnings.append(message))

    cfg._warn_if_missing_secrets_key_for_prod()
    cfg._warn_if_missing_secrets_key_for_prod()

    assert len(warnings) == 1
    assert "DEERFLOW_SECRETS_ENCRYPTION_KEY" in warnings[0]


def test_no_warning_in_non_production(monkeypatch):
    monkeypatch.setenv("DEERFLOW_ENV", "development")
    monkeypatch.delenv("DEERFLOW_SECRETS_ENCRYPTION_KEY", raising=False)
    monkeypatch.setattr(cfg, "_secrets_key_warning_emitted", False)

    warnings = []
    monkeypatch.setattr(cfg.logger, "warning", lambda message: warnings.append(message))

    cfg._warn_if_missing_secrets_key_for_prod()
    assert warnings == []


def test_no_warning_when_key_exists(monkeypatch):
    monkeypatch.setenv("DEERFLOW_ENV", "production")
    monkeypatch.setenv("DEERFLOW_SECRETS_ENCRYPTION_KEY", "configured-key")
    monkeypatch.setattr(cfg, "_secrets_key_warning_emitted", False)

    warnings = []
    monkeypatch.setattr(cfg.logger, "warning", lambda message: warnings.append(message))

    cfg._warn_if_missing_secrets_key_for_prod()
    assert warnings == []
