import logging
import re
import shutil
import tempfile
from pathlib import Path

import yaml
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from pydantic import BaseModel, Field

from app.gateway.authorization import require_tenant_admin, require_tenant_context
from app.gateway.path_utils import resolve_thread_virtual_path
from deerflow.database.user_config_service import (
    create_tenant_shared_skill,
    delete_tenant_shared_skill,
    get_available_skills,
    get_tenant_shared_skill_settings,
    list_tenant_shared_skills,
    set_tenant_shared_skill_enabled,
    update_tenant_shared_skill,
    update_tenant_shared_skill_settings,
)
from deerflow.skills import Skill, get_skills_root_path, load_skills
from deerflow.skills.installer import SkillAlreadyExistsError, install_skill_from_archive

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["skills"])
_SKILL_NAME_PATTERN = re.compile(r"^[a-z0-9-]+$")


class SkillResponse(BaseModel):
    """Response model for skill information."""

    name: str = Field(..., description="Name of the skill")
    description: str = Field(..., description="Description of what the skill does")
    license: str | None = Field(None, description="License information")
    category: str = Field(..., description="Category of the skill (public or custom)")
    enabled: bool = Field(default=True, description="Whether this skill is enabled")
    bound_tools: list[str] = Field(default_factory=list, description="Bound tool names")
    prompt_template: str | None = Field(None, description="Prompt template for this skill")
    strategy: str | None = Field(None, description="Execution strategy for this skill")
    instructions: str | None = Field(None, description="Skill instructions from SKILL.md body")


class SkillsListResponse(BaseModel):
    """Response model for listing all skills."""

    skills: list[SkillResponse]


class AvailableSkillResponse(SkillResponse):
    scope: str = Field(..., description="Resource scope: global or tenant")
    source: str = Field(..., description="Skill source classification")
    managed_by_current_user: bool = Field(..., description="Whether current user can manage this skill")
    effective_permissions: list[str] = Field(default_factory=list, description="Effective permissions for current user")


class AvailableSkillsListResponse(BaseModel):
    skills: list[AvailableSkillResponse]


class SkillUpdateRequest(BaseModel):
    """Request model for updating a skill."""

    enabled: bool = Field(..., description="Whether to enable or disable the skill")


class TenantSkillCreateRequest(BaseModel):
    name: str = Field(..., description="Skill name")
    description: str = Field(..., description="Skill description")
    instructions: str | None = Field(default=None, description="Skill instructions")
    enabled: bool = Field(default=True, description="Whether skill is enabled")
    category: str | None = Field(default=None, description="Skill category")
    bound_tools: list[str] | None = Field(default=None, description="Bound tools")
    prompt_template: str | None = Field(default=None, description="Prompt template")
    strategy: str | None = Field(default=None, description="Execution strategy")


class TenantSkillPatchRequest(BaseModel):
    description: str | None = Field(default=None, description="Skill description")
    instructions: str | None = Field(default=None, description="Skill instructions")
    enabled: bool | None = Field(default=None, description="Whether skill is enabled")
    category: str | None = Field(default=None, description="Skill category")
    bound_tools: list[str] | None = Field(default=None, description="Bound tools")
    prompt_template: str | None = Field(default=None, description="Prompt template")
    strategy: str | None = Field(default=None, description="Execution strategy")


def _is_platform_admin(request: Request) -> bool:
    role = getattr(request.state, "user_role", None)
    return isinstance(role, str) and role.lower() in {"platform_admin", "admin"}


def _is_tenant_admin(request: Request) -> bool:
    role = getattr(request.state, "tenant_role", None)
    return isinstance(role, str) and role.lower() == "tenant_admin"


class SkillInstallRequest(BaseModel):
    """Request model for installing a skill from a .skill or .zip file."""

    thread_id: str = Field(..., description="The thread ID where the archive file is located")
    path: str = Field(..., description="Virtual path to the .skill or .zip file (e.g., mnt/user-data/outputs/my-skill.skill)")


class SkillInstallResponse(BaseModel):
    """Response model for skill installation."""

    success: bool = Field(..., description="Whether the installation was successful")
    skill_name: str = Field(..., description="Name of the installed skill")
    message: str = Field(..., description="Installation result message")


def _skill_to_response(skill: Skill) -> SkillResponse:
    """Convert a Skill object to a SkillResponse."""
    return SkillResponse(
        name=skill.name,
        description=skill.description,
        license=skill.license,
        category=skill.category,
        enabled=skill.enabled,
        bound_tools=[],
        prompt_template=None,
        strategy=None,
        instructions=_read_skill_instructions(skill.skill_dir),
    )


def _validate_manual_skill_name(skill_name: str) -> str:
    name = skill_name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Skill name is required")
    if "/" in name or "\\" in name or ".." in name:
        raise HTTPException(status_code=400, detail="Skill name contains unsafe path characters")
    if not _SKILL_NAME_PATTERN.fullmatch(name):
        raise HTTPException(
            status_code=400,
            detail="Skill name must be hyphen-case using lowercase letters, digits, and hyphens only",
        )
    if name.startswith("-") or name.endswith("-") or "--" in name or len(name) > 64:
        raise HTTPException(status_code=400, detail="Skill name is not a valid skill identifier")
    return name


def _normalize_skill_description(description: str) -> str:
    text = description.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Skill description is required")
    if "<" in text or ">" in text:
        raise HTTPException(status_code=400, detail="Skill description cannot contain angle brackets")
    return " ".join(text.splitlines())


def _tenant_skill_relative_path(tenant_id: str, skill_name: str) -> str:
    return (Path(tenant_id) / skill_name).as_posix()


def _tenant_skill_dir(tenant_id: str, skill_name: str) -> Path:
    return get_skills_root_path() / "custom" / tenant_id / skill_name


def _split_skill_markdown(content: str) -> tuple[dict[str, object], str]:
    match = re.match(r"^---\n(.*?)\n---\s*\n?(.*)$", content, re.DOTALL)
    if not match:
        return {}, ""
    try:
        frontmatter = yaml.safe_load(match.group(1)) or {}
    except yaml.YAMLError:
        frontmatter = {}
    if not isinstance(frontmatter, dict):
        frontmatter = {}
    return frontmatter, match.group(2).strip()


def _read_skill_file_payload(skill_dir: Path) -> tuple[str | None, str | None]:
    skill_file = skill_dir / "SKILL.md"
    if not skill_file.exists():
        return None, None
    frontmatter, instructions = _split_skill_markdown(skill_file.read_text(encoding="utf-8"))
    description = frontmatter.get("description")
    description_text = str(description).strip() if isinstance(description, str) and description.strip() else None
    return description_text, instructions or None


def _read_skill_instructions(skill_dir: Path) -> str | None:
    _, instructions = _read_skill_file_payload(skill_dir)
    return instructions


def _render_skill_markdown(name: str, description: str, instructions: str | None) -> str:
    body = (instructions or "").strip() or f"# {name}\n"
    return f"---\nname: {name}\ndescription: {description}\n---\n\n{body}\n"


def _write_skill_markdown(skill_dir: Path, *, name: str, description: str, instructions: str | None) -> None:
    skill_dir.mkdir(parents=True, exist_ok=True)
    content = _render_skill_markdown(name, description, instructions)
    (skill_dir / "SKILL.md").write_text(content, encoding="utf-8")


def _resolve_skill_runtime_dir(tenant_id: str, row_name: str, install_dir: str | None, relative_path: str | None) -> Path:
    if isinstance(install_dir, str) and install_dir.strip():
        return Path(install_dir)
    if isinstance(relative_path, str) and relative_path.strip():
        return get_skills_root_path() / "custom" / relative_path.strip()
    return _tenant_skill_dir(tenant_id, row_name)


def _build_skill_response(
    *,
    tenant_id: str,
    row_name: str,
    category: str,
    enabled: bool,
    settings: dict[str, object] | None = None,
    install_dir: str | None = None,
    relative_path: str | None = None,
) -> SkillResponse:
    resolved = next((s for s in load_skills(enabled_only=False) if s.name == row_name), None)
    skill_dir = _resolve_skill_runtime_dir(tenant_id, row_name, install_dir, relative_path)
    file_description, instructions = _read_skill_file_payload(skill_dir)
    settings = settings or {}
    return SkillResponse(
        name=row_name,
        description=(resolved.description if resolved is not None else file_description) or "",
        license=resolved.license if resolved is not None else None,
        category=category,
        enabled=enabled,
        bound_tools=settings.get("bound_tools") or [],
        prompt_template=settings.get("prompt_template"),
        strategy=settings.get("strategy"),
        instructions=instructions,
    )


@router.get(
    "/skills",
    response_model=SkillsListResponse,
    summary="List All Skills",
    description="Retrieve a list of all available skills from both public and custom directories.",
)
async def list_skills(request: Request) -> SkillsListResponse:
    require_tenant_context(request)
    try:
        skills = load_skills(enabled_only=False)
        return SkillsListResponse(skills=[_skill_to_response(skill) for skill in skills])
    except Exception as e:
        logger.error(f"Failed to load skills: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to load skills: {str(e)}")


@router.get(
    "/skills/available",
    response_model=AvailableSkillsListResponse,
    summary="List Available Skills",
    description="Return platform built-in and tenant-shared skills for current tenant context.",
)
async def list_available_skills(request: Request) -> AvailableSkillsListResponse:
    tenant_id = require_tenant_context(request)
    try:
        rows = await get_available_skills(
            request.state.user_id,
            tenant_id,
            is_tenant_admin=_is_tenant_admin(request),
            is_platform_admin=_is_platform_admin(request),
        )
        enriched_rows = []
        for row in rows:
            if row.get("scope") == "tenant":
                description, instructions = _read_skill_file_payload(
                    _resolve_skill_runtime_dir(
                        tenant_id,
                        str(row.get("name") or ""),
                        row.get("install_dir"),
                        row.get("relative_path"),
                    )
                )
                if description:
                    row["description"] = description
                row["instructions"] = instructions
            enriched_rows.append(row)
        return AvailableSkillsListResponse(skills=[AvailableSkillResponse.model_validate(row) for row in enriched_rows])
    except Exception as e:
        logger.error(f"Failed to load available skills: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to load available skills: {str(e)}")


@router.get(
    "/tenants/skills",
    response_model=SkillsListResponse,
    summary="List Tenant Shared Skills",
    dependencies=[Depends(require_tenant_admin)],
)
async def list_tenant_skills(request: Request) -> SkillsListResponse:
    tenant_id = require_tenant_context(request)
    rows = await list_tenant_shared_skills(tenant_id)
    settings_by_name = await get_tenant_shared_skill_settings(tenant_id)
    skills = []
    for row in rows:
        settings = settings_by_name.get(row.name) or {}
        skills.append(
            _build_skill_response(
                tenant_id=tenant_id,
                row_name=row.name,
                category=row.category,
                enabled=row.enabled,
                settings=settings,
                install_dir=getattr(row, "install_dir", None),
                relative_path=getattr(row, "relative_path", None),
            )
        )
    return SkillsListResponse(skills=skills)


@router.post(
    "/tenants/skills",
    response_model=SkillResponse,
    status_code=201,
    summary="Create Tenant Shared Skill",
    dependencies=[Depends(require_tenant_admin)],
)
async def create_tenant_skill(request: Request, body: TenantSkillCreateRequest) -> SkillResponse:
    tenant_id = require_tenant_context(request)
    normalized_name = _validate_manual_skill_name(body.name)
    normalized_description = _normalize_skill_description(body.description)
    relative_path = _tenant_skill_relative_path(tenant_id, normalized_name)
    install_dir = str(_tenant_skill_dir(tenant_id, normalized_name))
    try:
        row = await create_tenant_shared_skill(
            tenant_id,
            skill_name=normalized_name,
            enabled=body.enabled,
            category=body.category,
            relative_path=relative_path,
            install_dir=install_dir,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc))

    try:
        _write_skill_markdown(
            _tenant_skill_dir(tenant_id, row.name),
            name=row.name,
            description=normalized_description,
            instructions=body.instructions,
        )
        settings = await update_tenant_shared_skill_settings(
            tenant_id,
            row.name,
            bound_tools=body.bound_tools,
            prompt_template=body.prompt_template,
            strategy=body.strategy,
        )
    except Exception:
        await delete_tenant_shared_skill(tenant_id, row.name)
        raise

    return _build_skill_response(
        tenant_id=tenant_id,
        row_name=row.name,
        category=row.category,
        enabled=row.enabled,
        settings=settings,
        install_dir=getattr(row, "install_dir", None),
        relative_path=getattr(row, "relative_path", None),
    )


@router.put(
    "/tenants/skills/{skill_name}",
    response_model=SkillResponse,
    summary="Update Tenant Shared Skill",
    dependencies=[Depends(require_tenant_admin)],
)
async def update_tenant_skill(skill_name: str, request: SkillUpdateRequest, api_request: Request) -> SkillResponse:
    tenant_id = require_tenant_context(api_request)
    row = await set_tenant_shared_skill_enabled(tenant_id, skill_name, request.enabled)
    settings_by_name = await get_tenant_shared_skill_settings(tenant_id)
    settings = settings_by_name.get(row.name) or {}
    return _build_skill_response(
        tenant_id=tenant_id,
        row_name=row.name,
        category=row.category,
        enabled=row.enabled,
        settings=settings,
        install_dir=getattr(row, "install_dir", None),
        relative_path=getattr(row, "relative_path", None),
    )


@router.patch(
    "/tenants/skills/{skill_name}",
    response_model=SkillResponse,
    summary="Patch Tenant Shared Skill",
    dependencies=[Depends(require_tenant_admin)],
)
async def patch_tenant_skill(skill_name: str, request: TenantSkillPatchRequest, api_request: Request) -> SkillResponse:
    tenant_id = require_tenant_context(api_request)
    try:
        row = await update_tenant_shared_skill(
            tenant_id,
            skill_name,
            enabled=request.enabled,
            category=request.category,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    settings = await update_tenant_shared_skill_settings(
        tenant_id,
        row.name,
        bound_tools=request.bound_tools,
        prompt_template=request.prompt_template,
        strategy=request.strategy,
    )

    if request.description is not None or request.instructions is not None:
        skill_dir = _resolve_skill_runtime_dir(
            tenant_id,
            row.name,
            getattr(row, "install_dir", None),
            getattr(row, "relative_path", None),
        )
        current_description, current_instructions = _read_skill_file_payload(skill_dir)
        description_to_write = (
            _normalize_skill_description(request.description)
            if request.description is not None
            else (current_description or row.name)
        )
        instructions_to_write = request.instructions if request.instructions is not None else current_instructions
        _write_skill_markdown(
            skill_dir,
            name=row.name,
            description=description_to_write,
            instructions=instructions_to_write,
        )

    return _build_skill_response(
        tenant_id=tenant_id,
        row_name=row.name,
        category=row.category,
        enabled=row.enabled,
        settings=settings,
        install_dir=getattr(row, "install_dir", None),
        relative_path=getattr(row, "relative_path", None),
    )


@router.delete(
    "/tenants/skills/{skill_name}",
    status_code=204,
    summary="Delete Tenant Shared Skill",
    dependencies=[Depends(require_tenant_admin)],
)
async def delete_tenant_skill(skill_name: str, request: Request):
    tenant_id = require_tenant_context(request)
    skill_dir = _tenant_skill_dir(tenant_id, skill_name)
    try:
        await delete_tenant_shared_skill(tenant_id, skill_name)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    if skill_dir.exists():
        shutil.rmtree(skill_dir, ignore_errors=True)


@router.post(
    "/tenants/skills/import",
    response_model=SkillResponse,
    status_code=201,
    summary="Import Tenant Shared Skill",
    dependencies=[Depends(require_tenant_admin)],
)
async def import_tenant_skill(request: Request, archive: UploadFile = File(...)) -> SkillResponse:
    tenant_id = require_tenant_context(request)
    filename = archive.filename or ""
    suffix = Path(filename).suffix.lower()
    if suffix not in {".skill", ".zip"}:
        raise HTTPException(status_code=400, detail="File must have .skill or .zip extension")

    temp_path: Path | None = None
    installed_dir: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp_file:
            temp_path = Path(temp_file.name)
            while chunk := await archive.read(1024 * 1024):
                temp_file.write(chunk)

        result = install_skill_from_archive(
            temp_path,
            target_relative_path=tenant_id,
        )
        skill_name = str(result.get("skill_name") or "").strip()
        installed_dir = Path(str(result.get("install_dir") or _tenant_skill_dir(tenant_id, skill_name)))
        row = await create_tenant_shared_skill(
            tenant_id,
            enabled=True,
            skill_name=skill_name,
            category=str(result.get("category") or "custom"),
            relative_path=str(result.get("relative_path") or _tenant_skill_relative_path(tenant_id, skill_name)),
            install_dir=str(installed_dir),
        )
        settings = await get_tenant_shared_skill_settings(tenant_id)
        return _build_skill_response(
            tenant_id=tenant_id,
            row_name=row.name,
            category=row.category,
            enabled=row.enabled,
            settings=settings.get(row.name) or {},
            install_dir=getattr(row, "install_dir", None),
            relative_path=getattr(row, "relative_path", None),
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except SkillAlreadyExistsError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except RuntimeError as e:
        if installed_dir is not None:
            shutil.rmtree(installed_dir, ignore_errors=True)
        raise HTTPException(status_code=409, detail=str(e))
    except ValueError as e:
        if installed_dir is not None:
            shutil.rmtree(installed_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        if installed_dir is not None:
            shutil.rmtree(installed_dir, ignore_errors=True)
        logger.error("Failed to import tenant skill: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to import skill: {str(e)}")
    finally:
        await archive.close()
        if temp_path is not None:
            temp_path.unlink(missing_ok=True)


@router.get(
    "/skills/{skill_name}",
    response_model=SkillResponse,
    summary="Get Skill Details",
    description="Retrieve detailed information about a specific skill by its name.",
)
async def get_skill(skill_name: str, request: Request) -> SkillResponse:
    require_tenant_context(request)
    try:
        skills = load_skills(enabled_only=False)
        skill = next((s for s in skills if s.name == skill_name), None)

        if skill is None:
            raise HTTPException(status_code=404, detail=f"Skill '{skill_name}' not found")

        return _skill_to_response(skill)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get skill {skill_name}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get skill: {str(e)}")


@router.post(
    "/skills/install",
    response_model=SkillInstallResponse,
    summary="Install Skill",
    description="Tenant admins install a .skill or .zip archive and register it as a tenant-shared skill.",
    dependencies=[Depends(require_tenant_admin)],
)
async def install_skill(request: SkillInstallRequest, api_request: Request) -> SkillInstallResponse:
    tenant_id = require_tenant_context(api_request)
    try:
        skill_file_path = resolve_thread_virtual_path(
            api_request.state.user_id,
            request.thread_id,
            request.path,
            tenant_id=getattr(api_request.state, "tenant_id", None),
        )
        target_relative_path = tenant_id
        result = install_skill_from_archive(
            skill_file_path,
            target_relative_path=target_relative_path,
        )
        skill_name = result.get("skill_name")
        if isinstance(skill_name, str) and skill_name:
            await create_tenant_shared_skill(
                tenant_id,
                enabled=True,
                skill_name=skill_name,
                category=str(result.get("category") or "custom"),
                relative_path=str(result.get("relative_path") or target_relative_path),
                install_dir=str(result.get("install_dir") or ""),
            )
        return SkillInstallResponse(**result)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except SkillAlreadyExistsError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to install skill: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to install skill: {str(e)}")
