"""Tests for recursive skills loading."""

from pathlib import Path

from deerflow.skills.loader import get_skills_root_path, load_skills


def _write_skill(skill_dir: Path, name: str, description: str) -> None:
    """Write a minimal SKILL.md for tests."""
    skill_dir.mkdir(parents=True, exist_ok=True)
    content = f"---\nname: {name}\ndescription: {description}\n---\n\n# {name}\n"
    (skill_dir / "SKILL.md").write_text(content, encoding="utf-8")


def test_get_skills_root_path_points_to_project_root_skills():
    """get_skills_root_path() should point to deer-flow/skills (sibling of backend/), not backend/packages/skills."""
    path = get_skills_root_path()
    assert path.name == "skills", f"Expected 'skills', got '{path.name}'"
    assert (path.parent / "backend").is_dir(), (
        f"Expected skills path's parent to be project root containing 'backend/', but got {path}"
    )


def test_load_skills_discovers_nested_skills_and_sets_container_paths(tmp_path: Path):
    """Public skills should be discovered recursively with correct container paths."""
    skills_root = tmp_path / "skills"

    _write_skill(skills_root / "public" / "root-skill", "root-skill", "Root skill")
    _write_skill(skills_root / "public" / "parent" / "child-skill", "child-skill", "Child skill")
    _write_skill(skills_root / "custom" / "team" / "helper", "team-helper", "Team helper")

    skills = load_skills(skills_path=skills_root, use_config=False, enabled_only=False)
    by_name = {skill.name: skill for skill in skills}

    assert {"root-skill", "child-skill"} <= set(by_name)
    assert "team-helper" not in by_name

    root_skill = by_name["root-skill"]
    child_skill = by_name["child-skill"]

    assert root_skill.skill_path == "root-skill"
    assert root_skill.get_container_file_path() == "/mnt/skills/public/root-skill/SKILL.md"

    assert child_skill.skill_path == "parent/child-skill"
    assert child_skill.get_container_file_path() == "/mnt/skills/public/parent/child-skill/SKILL.md"


def test_load_skills_skips_hidden_directories(tmp_path: Path):
    """Hidden directories should be excluded from recursive discovery."""
    skills_root = tmp_path / "skills"

    _write_skill(skills_root / "public" / "visible" / "ok-skill", "ok-skill", "Visible skill")
    _write_skill(
        skills_root / "public" / "visible" / ".hidden" / "secret-skill",
        "secret-skill",
        "Hidden skill",
    )

    skills = load_skills(skills_path=skills_root, use_config=False, enabled_only=False)
    names = {skill.name for skill in skills}

    assert "ok-skill" in names
    assert "secret-skill" not in names


def test_load_skills_with_tenant_context_loads_only_registered_custom_skills(tmp_path: Path, monkeypatch):
    """Tenant runtime should only expose custom skills registered to the active tenant."""
    skills_root = tmp_path / "skills"
    _write_skill(skills_root / "public" / "visible" / "public-skill", "public-skill", "Visible skill")
    _write_skill(skills_root / "custom" / "tenant-a" / "my-skill", "my-skill", "My skill")
    _write_skill(skills_root / "custom" / "tenant-b" / "other-skill", "other-skill", "Other skill")

    monkeypatch.setattr("deerflow.skills.loader.get_current_tenant_id", lambda: None)
    monkeypatch.setattr("deerflow.skills.loader.load_user_skill_records", lambda _uid, tenant_id=None: [])

    skills = load_skills(skills_path=skills_root, use_config=False, enabled_only=False)
    assert len(skills) == 1
    assert skills[0].name == "public-skill"
    assert skills[0].enabled is True

    monkeypatch.setattr("deerflow.skills.loader.get_current_tenant_id", lambda: "tenant-a")
    monkeypatch.setattr(
        "deerflow.skills.loader.load_user_skill_records",
        lambda _uid, tenant_id=None: [
            {"name": "public-skill", "category": "public", "enabled": False},
            {
                "name": "my-skill",
                "category": "custom",
                "enabled": True,
                "relative_path": "tenant-a/my-skill",
                "install_dir": str(skills_root / "custom" / "tenant-a" / "my-skill"),
            },
        ],
    )
    skills = load_skills(skills_path=skills_root, use_config=False, enabled_only=False)
    assert len(skills) == 2

    public_skill = next(s for s in skills if s.name == "public-skill")
    assert public_skill.enabled is False

    my_skill = next(s for s in skills if s.name == "my-skill")
    assert my_skill.enabled is True
    assert all(s.name != "other-skill" for s in skills)
