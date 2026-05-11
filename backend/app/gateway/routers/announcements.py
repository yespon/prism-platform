from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import desc
from sqlmodel import select

from app.gateway.audit import record_audit_event
from app.gateway.authorization import require_platform_admin, require_tenant_context
from deerflow.database.models import PlatformAnnouncement, PlatformAnnouncementRead
from deerflow.database.session import get_session_factory

router = APIRouter(prefix="/api", tags=["announcements"])

ALLOWED_TYPES = {"model_change", "tool_change", "skill_change", "maintenance", "security", "general"}
ALLOWED_SEVERITIES = {"info", "warning", "critical"}
ALLOWED_SCOPES = {"platform_all", "tenant_scoped", "role_scoped", "tenant_role_scoped"}
ALLOWED_STATUSES = {"draft", "scheduled", "published", "expired", "archived"}


class AnnouncementBasePayload(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1)
    type: str = Field(default="general")
    severity: str = Field(default="info")
    scope: str = Field(default="platform_all")
    target_roles: list[str] = Field(default_factory=list)
    target_tenant_ids: list[str] = Field(default_factory=list)
    publish_at: datetime
    expire_at: datetime
    pinned_until: datetime | None = None
    status: str = Field(default="draft")


class AnnouncementCreateRequest(AnnouncementBasePayload):
    pass


class AnnouncementUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    content: str | None = Field(default=None, min_length=1)
    type: str | None = None
    severity: str | None = None
    scope: str | None = None
    target_roles: list[str] | None = None
    target_tenant_ids: list[str] | None = None
    publish_at: datetime | None = None
    expire_at: datetime | None = None
    pinned_until: datetime | None = None
    status: str | None = None


class AnnouncementReadState(BaseModel):
    read_at: datetime | None = None
    dismissed_at: datetime | None = None
    is_read: bool = False
    is_dismissed: bool = False


class AnnouncementItem(BaseModel):
    id: int
    title: str
    content: str
    type: str
    severity: str
    scope: str
    target_roles: list[str]
    target_tenant_ids: list[str]
    publish_at: datetime
    expire_at: datetime
    pinned_until: datetime | None
    status: str
    created_by: str
    created_at: datetime
    updated_at: datetime
    read_state: AnnouncementReadState | None = None


class AnnouncementListResponse(BaseModel):
    items: list[AnnouncementItem]


class AnnouncementActionResponse(BaseModel):
    status: str


def _utc_now() -> datetime:
    return datetime.now(UTC)


def _to_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


def _normalize_csv_list(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        item = value.strip()
        if not item or item in seen:
            continue
        seen.add(item)
        result.append(item)
    return result


def _canonicalize_role(value: str) -> str:
    normalized = value.strip().lower()
    # Backward compatibility for historical role labels.
    if normalized in {"owner", "admin", "tenant_admin"}:
        return "tenant_admin"
    if normalized in {"member", "tenant_member"}:
        return "tenant_member"
    return normalized


def _normalize_role_set(request: Request) -> set[str]:
    roles: set[str] = set()
    user_role = getattr(request.state, "user_role", None)
    tenant_role = getattr(request.state, "tenant_role", None)
    if isinstance(user_role, str) and user_role.strip():
        roles.add(user_role.strip().lower())
    if isinstance(tenant_role, str) and tenant_role.strip():
        roles.add(tenant_role.strip().lower())
    return roles


def _validate_common_fields(
    *,
    title: str,
    type_value: str,
    severity: str,
    scope: str,
    status: str,
    publish_at: datetime,
    expire_at: datetime,
    target_roles: list[str],
    target_tenant_ids: list[str],
) -> None:
    if not title.strip():
        raise HTTPException(status_code=400, detail="title is required")
    if type_value not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="invalid type")
    if severity not in ALLOWED_SEVERITIES:
        raise HTTPException(status_code=400, detail="invalid severity")
    if scope not in ALLOWED_SCOPES:
        raise HTTPException(status_code=400, detail="invalid scope")
    if status not in ALLOWED_STATUSES:
        raise HTTPException(status_code=400, detail="invalid status")

    publish_dt = _to_utc(publish_at)
    expire_dt = _to_utc(expire_at)
    if publish_dt >= expire_dt:
        raise HTTPException(status_code=400, detail="publish_at must be earlier than expire_at")

    if scope in {"tenant_scoped", "tenant_role_scoped"} and not target_tenant_ids:
        raise HTTPException(status_code=400, detail="target_tenant_ids is required for selected scope")
    if scope in {"role_scoped", "tenant_role_scoped"} and not target_roles:
        raise HTTPException(status_code=400, detail="target_roles is required for selected scope")


def _is_user_visible(
    announcement: PlatformAnnouncement,
    *,
    tenant_id: str,
    current_roles: set[str],
    now: datetime,
    include_expired: bool,
) -> bool:
    publish_at = _to_utc(announcement.publish_at)
    expire_at = _to_utc(announcement.expire_at)

    if announcement.status != "published":
        return False
    if now < publish_at:
        return False
    if not include_expired and now >= expire_at:
        return False

    target_tenants = {item.strip() for item in (announcement.target_tenant_ids_json or []) if item.strip()}
    target_roles = {_canonicalize_role(item) for item in (announcement.target_roles_json or []) if item.strip()}
    normalized_current_roles = {_canonicalize_role(item) for item in current_roles if item.strip()}

    if announcement.scope == "platform_all":
        return True
    if announcement.scope == "tenant_scoped":
        return tenant_id in target_tenants
    if announcement.scope == "role_scoped":
        return bool(target_roles & normalized_current_roles)
    if announcement.scope == "tenant_role_scoped":
        return tenant_id in target_tenants and bool(target_roles & normalized_current_roles)
    return False


def _serialize_item(
    announcement: PlatformAnnouncement,
    read_state: PlatformAnnouncementRead | None,
) -> AnnouncementItem:
    state = None
    if read_state is not None:
        state = AnnouncementReadState(
            read_at=read_state.read_at,
            dismissed_at=read_state.dismissed_at,
            is_read=read_state.read_at is not None,
            is_dismissed=read_state.dismissed_at is not None,
        )

    return AnnouncementItem(
        id=int(announcement.id or 0),
        title=announcement.title,
        content=announcement.content,
        type=announcement.type,
        severity=announcement.severity,
        scope=announcement.scope,
        target_roles=list(announcement.target_roles_json or []),
        target_tenant_ids=list(announcement.target_tenant_ids_json or []),
        publish_at=announcement.publish_at,
        expire_at=announcement.expire_at,
        pinned_until=announcement.pinned_until,
        status=announcement.status,
        created_by=announcement.created_by,
        created_at=announcement.created_at,
        updated_at=announcement.updated_at,
        read_state=state,
    )


def _require_user_id(request: Request) -> str:
    user_id = getattr(request.state, "user_id", None)
    if not isinstance(user_id, str) or not user_id.strip():
        raise HTTPException(status_code=401, detail="Authentication required")
    return user_id


@router.get("/admin/announcements", response_model=AnnouncementListResponse, dependencies=[Depends(require_platform_admin)])
async def list_admin_announcements() -> AnnouncementListResponse:
    session_factory = get_session_factory()
    async with session_factory() as session:
        rows = (
            await session.exec(
                select(PlatformAnnouncement).order_by(desc(PlatformAnnouncement.created_at), desc(PlatformAnnouncement.id))
            )
        ).all()
    return AnnouncementListResponse(items=[_serialize_item(row, None) for row in rows])


@router.post("/admin/announcements", response_model=AnnouncementItem, dependencies=[Depends(require_platform_admin)])
async def create_admin_announcement(request: Request, body: AnnouncementCreateRequest) -> AnnouncementItem:
    actor_id = _require_user_id(request)
    now = _utc_now()

    target_roles = _normalize_csv_list(body.target_roles)
    target_tenants = _normalize_csv_list(body.target_tenant_ids)
    publish_at = _to_utc(body.publish_at)
    expire_at = _to_utc(body.expire_at)

    _validate_common_fields(
        title=body.title,
        type_value=body.type,
        severity=body.severity,
        scope=body.scope,
        status=body.status,
        publish_at=publish_at,
        expire_at=expire_at,
        target_roles=target_roles,
        target_tenant_ids=target_tenants,
    )

    record = PlatformAnnouncement(
        title=body.title.strip(),
        content=body.content,
        type=body.type,
        severity=body.severity,
        scope=body.scope,
        target_roles_json=target_roles,
        target_tenant_ids_json=target_tenants,
        publish_at=publish_at,
        expire_at=expire_at,
        pinned_until=_to_utc(body.pinned_until) if body.pinned_until else None,
        status=body.status,
        created_by=actor_id,
        created_at=now,
        updated_at=now,
    )

    session_factory = get_session_factory()
    async with session_factory() as session:
        session.add(record)
        await session.commit()
        await session.refresh(record)

    record_audit_event(
        "platform.announcement.created",
        actor_id=actor_id,
        scope="platform",
        metadata={"announcement_id": record.id, "title": record.title},
    )
    return _serialize_item(record, None)


@router.get("/admin/announcements/{announcement_id}", response_model=AnnouncementItem, dependencies=[Depends(require_platform_admin)])
async def get_admin_announcement(announcement_id: int) -> AnnouncementItem:
    session_factory = get_session_factory()
    async with session_factory() as session:
        item = await session.get(PlatformAnnouncement, announcement_id)
        if item is None:
            raise HTTPException(status_code=404, detail="Announcement not found")
    return _serialize_item(item, None)


@router.put("/admin/announcements/{announcement_id}", response_model=AnnouncementItem, dependencies=[Depends(require_platform_admin)])
async def update_admin_announcement(
    request: Request,
    announcement_id: int,
    body: AnnouncementUpdateRequest,
) -> AnnouncementItem:
    actor_id = _require_user_id(request)

    session_factory = get_session_factory()
    async with session_factory() as session:
        item = await session.get(PlatformAnnouncement, announcement_id)
        if item is None:
            raise HTTPException(status_code=404, detail="Announcement not found")

        next_title = body.title.strip() if isinstance(body.title, str) else item.title
        next_content = body.content if body.content is not None else item.content
        next_type = body.type if body.type is not None else item.type
        next_severity = body.severity if body.severity is not None else item.severity
        next_scope = body.scope if body.scope is not None else item.scope
        next_status = body.status if body.status is not None else item.status
        next_publish_at = _to_utc(body.publish_at) if body.publish_at is not None else _to_utc(item.publish_at)
        next_expire_at = _to_utc(body.expire_at) if body.expire_at is not None else _to_utc(item.expire_at)

        next_roles = (
            _normalize_csv_list(body.target_roles)
            if body.target_roles is not None
            else _normalize_csv_list(item.target_roles_json or [])
        )
        next_tenants = (
            _normalize_csv_list(body.target_tenant_ids)
            if body.target_tenant_ids is not None
            else _normalize_csv_list(item.target_tenant_ids_json or [])
        )

        _validate_common_fields(
            title=next_title,
            type_value=next_type,
            severity=next_severity,
            scope=next_scope,
            status=next_status,
            publish_at=next_publish_at,
            expire_at=next_expire_at,
            target_roles=next_roles,
            target_tenant_ids=next_tenants,
        )

        item.title = next_title
        item.content = next_content
        item.type = next_type
        item.severity = next_severity
        item.scope = next_scope
        item.status = next_status
        item.target_roles_json = next_roles
        item.target_tenant_ids_json = next_tenants
        item.publish_at = next_publish_at
        item.expire_at = next_expire_at
        item.pinned_until = _to_utc(body.pinned_until) if body.pinned_until is not None else item.pinned_until
        item.updated_at = _utc_now()

        session.add(item)
        await session.commit()
        await session.refresh(item)

    record_audit_event(
        "platform.announcement.updated",
        actor_id=actor_id,
        scope="platform",
        metadata={"announcement_id": item.id, "title": item.title},
    )
    return _serialize_item(item, None)


@router.post("/admin/announcements/{announcement_id}/publish", response_model=AnnouncementActionResponse, dependencies=[Depends(require_platform_admin)])
async def publish_admin_announcement(request: Request, announcement_id: int) -> AnnouncementActionResponse:
    actor_id = _require_user_id(request)
    now = _utc_now()

    session_factory = get_session_factory()
    async with session_factory() as session:
        item = await session.get(PlatformAnnouncement, announcement_id)
        if item is None:
            raise HTTPException(status_code=404, detail="Announcement not found")
        item.status = "published"
        item.updated_at = now
        session.add(item)
        await session.commit()

    record_audit_event(
        "platform.announcement.published",
        actor_id=actor_id,
        scope="platform",
        metadata={"announcement_id": announcement_id},
    )
    return AnnouncementActionResponse(status="ok")


@router.post("/admin/announcements/{announcement_id}/archive", response_model=AnnouncementActionResponse, dependencies=[Depends(require_platform_admin)])
async def archive_admin_announcement(request: Request, announcement_id: int) -> AnnouncementActionResponse:
    actor_id = _require_user_id(request)
    now = _utc_now()

    session_factory = get_session_factory()
    async with session_factory() as session:
        item = await session.get(PlatformAnnouncement, announcement_id)
        if item is None:
            raise HTTPException(status_code=404, detail="Announcement not found")
        item.status = "archived"
        item.updated_at = now
        session.add(item)
        await session.commit()

    record_audit_event(
        "platform.announcement.archived",
        actor_id=actor_id,
        scope="platform",
        metadata={"announcement_id": announcement_id},
    )
    return AnnouncementActionResponse(status="ok")


@router.delete("/admin/announcements/{announcement_id}", response_model=AnnouncementActionResponse, dependencies=[Depends(require_platform_admin)])
async def delete_admin_announcement(request: Request, announcement_id: int) -> AnnouncementActionResponse:
    actor_id = _require_user_id(request)

    session_factory = get_session_factory()
    async with session_factory() as session:
        item = await session.get(PlatformAnnouncement, announcement_id)
        if item is None:
            raise HTTPException(status_code=404, detail="Announcement not found")
        await session.delete(item)
        await session.commit()

    record_audit_event(
        "platform.announcement.deleted",
        actor_id=actor_id,
        scope="platform",
        metadata={"announcement_id": announcement_id},
    )
    return AnnouncementActionResponse(status="ok")


def _sort_active_key(item: AnnouncementItem) -> tuple[datetime, datetime, int]:
    pinned = _to_utc(item.pinned_until) if item.pinned_until else datetime.min.replace(tzinfo=UTC)
    publish = _to_utc(item.publish_at)
    return pinned, publish, item.id


async def _build_read_map(
    *,
    user_id: str,
    tenant_id: str,
    announcement_ids: list[int],
) -> dict[int, PlatformAnnouncementRead]:
    if not announcement_ids:
        return {}

    session_factory = get_session_factory()
    async with session_factory() as session:
        rows = (
            await session.exec(
                select(PlatformAnnouncementRead).where(
                    PlatformAnnouncementRead.user_id == user_id,
                    PlatformAnnouncementRead.tenant_id == tenant_id,
                    PlatformAnnouncementRead.announcement_id.in_(announcement_ids),
                )
            )
        ).all()
    return {int(row.announcement_id): row for row in rows}


@router.get("/announcements/active", response_model=AnnouncementListResponse)
async def list_active_announcements(
    request: Request,
    limit: int = Query(default=3, ge=1, le=20),
) -> AnnouncementListResponse:
    user_id = _require_user_id(request)
    tenant_id = require_tenant_context(request)
    roles = _normalize_role_set(request)
    now = _utc_now()

    session_factory = get_session_factory()
    async with session_factory() as session:
        rows = (
            await session.exec(
                select(PlatformAnnouncement)
                .where(PlatformAnnouncement.status == "published")
                .order_by(desc(PlatformAnnouncement.publish_at), desc(PlatformAnnouncement.id))
            )
        ).all()

    visible_rows = [
        row
        for row in rows
        if _is_user_visible(row, tenant_id=tenant_id, current_roles=roles, now=now, include_expired=False)
    ]

    ids = [int(row.id or 0) for row in visible_rows]
    read_map = await _build_read_map(user_id=user_id, tenant_id=tenant_id, announcement_ids=ids)

    items = [_serialize_item(row, read_map.get(int(row.id or 0))) for row in visible_rows]
    items.sort(key=_sort_active_key, reverse=True)
    return AnnouncementListResponse(items=items[:limit])


@router.get("/announcements", response_model=AnnouncementListResponse)
async def list_user_announcements(
    request: Request,
    include_history: bool = Query(default=True),
    limit: int = Query(default=50, ge=1, le=200),
) -> AnnouncementListResponse:
    user_id = _require_user_id(request)
    tenant_id = require_tenant_context(request)
    roles = _normalize_role_set(request)
    now = _utc_now()

    session_factory = get_session_factory()
    async with session_factory() as session:
        rows = (
            await session.exec(
                select(PlatformAnnouncement)
                .where(PlatformAnnouncement.status == "published")
                .order_by(desc(PlatformAnnouncement.publish_at), desc(PlatformAnnouncement.id))
            )
        ).all()

    visible_rows = [
        row
        for row in rows
        if _is_user_visible(
            row,
            tenant_id=tenant_id,
            current_roles=roles,
            now=now,
            include_expired=include_history,
        )
    ]

    ids = [int(row.id or 0) for row in visible_rows]
    read_map = await _build_read_map(user_id=user_id, tenant_id=tenant_id, announcement_ids=ids)

    items = [_serialize_item(row, read_map.get(int(row.id or 0))) for row in visible_rows]
    items.sort(key=lambda item: (_to_utc(item.publish_at), item.id), reverse=True)
    return AnnouncementListResponse(items=items[:limit])


async def _get_visible_announcement_or_404(
    *,
    request: Request,
    announcement_id: int,
    include_expired: bool,
) -> PlatformAnnouncement:
    tenant_id = require_tenant_context(request)
    roles = _normalize_role_set(request)
    now = _utc_now()

    session_factory = get_session_factory()
    async with session_factory() as session:
        item = await session.get(PlatformAnnouncement, announcement_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Announcement not found")

    if not _is_user_visible(item, tenant_id=tenant_id, current_roles=roles, now=now, include_expired=include_expired):
        raise HTTPException(status_code=404, detail="Announcement not found")
    return item


@router.get("/announcements/{announcement_id}", response_model=AnnouncementItem)
async def get_user_announcement(request: Request, announcement_id: int) -> AnnouncementItem:
    user_id = _require_user_id(request)
    tenant_id = require_tenant_context(request)
    item = await _get_visible_announcement_or_404(
        request=request,
        announcement_id=announcement_id,
        include_expired=True,
    )
    read_map = await _build_read_map(user_id=user_id, tenant_id=tenant_id, announcement_ids=[announcement_id])
    return _serialize_item(item, read_map.get(announcement_id))


async def _upsert_read_state(
    *,
    user_id: str,
    tenant_id: str,
    announcement_id: int,
    mark_read: bool,
    mark_dismissed: bool,
) -> None:
    now = _utc_now()
    session_factory = get_session_factory()
    async with session_factory() as session:
        state = await session.scalar(
            select(PlatformAnnouncementRead).where(
                PlatformAnnouncementRead.announcement_id == announcement_id,
                PlatformAnnouncementRead.user_id == user_id,
                PlatformAnnouncementRead.tenant_id == tenant_id,
            )
        )

        if state is None:
            state = PlatformAnnouncementRead(
                announcement_id=announcement_id,
                user_id=user_id,
                tenant_id=tenant_id,
                read_at=now if mark_read else None,
                dismissed_at=now if mark_dismissed else None,
                created_at=now,
                updated_at=now,
            )
            session.add(state)
        else:
            if mark_read and state.read_at is None:
                state.read_at = now
            if mark_dismissed:
                state.dismissed_at = now
            state.updated_at = now
            session.add(state)

        await session.commit()


@router.post("/announcements/{announcement_id}/read", response_model=AnnouncementActionResponse)
async def mark_announcement_read(request: Request, announcement_id: int) -> AnnouncementActionResponse:
    user_id = _require_user_id(request)
    tenant_id = require_tenant_context(request)
    await _get_visible_announcement_or_404(
        request=request,
        announcement_id=announcement_id,
        include_expired=True,
    )
    await _upsert_read_state(
        user_id=user_id,
        tenant_id=tenant_id,
        announcement_id=announcement_id,
        mark_read=True,
        mark_dismissed=False,
    )
    return AnnouncementActionResponse(status="ok")


@router.post("/announcements/{announcement_id}/dismiss", response_model=AnnouncementActionResponse)
async def dismiss_announcement(request: Request, announcement_id: int) -> AnnouncementActionResponse:
    user_id = _require_user_id(request)
    tenant_id = require_tenant_context(request)
    await _get_visible_announcement_or_404(
        request=request,
        announcement_id=announcement_id,
        include_expired=True,
    )
    await _upsert_read_state(
        user_id=user_id,
        tenant_id=tenant_id,
        announcement_id=announcement_id,
        mark_read=False,
        mark_dismissed=True,
    )
    return AnnouncementActionResponse(status="ok")
