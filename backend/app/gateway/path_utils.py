"""Shared path resolution for thread virtual paths (e.g. mnt/user-data/outputs/...)."""

from pathlib import Path

from fastapi import HTTPException

from deerflow.config.paths import get_paths


def resolve_thread_virtual_path(
    user_id: str,
    thread_id: str,
    virtual_path: str,
    tenant_id: str | None = None,
) -> Path:
    """Resolve a virtual path to the actual filesystem path under thread user-data.

    Args:
        user_id: The user ID.
        thread_id: The thread ID.
        virtual_path: The virtual path as seen inside the sandbox
                      (e.g., /mnt/user-data/outputs/file.txt).

    Returns:
        The resolved filesystem path.

    Raises:
        HTTPException: If the path is invalid or outside allowed directories.
    """
    try:
        return get_paths().resolve_virtual_path(user_id, thread_id, virtual_path, tenant_id=tenant_id)
    except ValueError as e:
        status = 403 if "traversal" in str(e) else 400
        raise HTTPException(status_code=status, detail=str(e))
