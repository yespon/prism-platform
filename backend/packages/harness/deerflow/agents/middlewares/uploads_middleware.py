"""Middleware to expose uploaded files information to agent context."""

import logging
from pathlib import Path
from typing import NotRequired, override

from langchain.agents import AgentState
from langchain.agents.middleware import AgentMiddleware
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.runtime import Runtime

from deerflow.config.paths import Paths, get_paths
from deerflow.uploads.manager import upload_attachment_id

logger = logging.getLogger(__name__)


class UploadsMiddlewareState(AgentState):
    """State schema for uploads middleware."""

    uploaded_files: NotRequired[list[dict] | None]


class UploadsMiddleware(AgentMiddleware[UploadsMiddlewareState]):
    """Middleware to expose uploaded files information into the agent context.

    Reads file metadata from structured additional_kwargs.attachments and injects
    a system context message before the last human message so the model knows
    which files are available. Legacy additional_kwargs.files is fallback-only.
    """

    state_schema = UploadsMiddlewareState

    def __init__(self, base_dir: str | None = None):
        """Initialize the middleware.

        Args:
            base_dir: Base directory for thread data. Defaults to Paths resolution.
        """
        super().__init__()
        self._paths = Paths(base_dir) if base_dir else get_paths()

    def _create_files_message(self, files: list[dict], *, explicit_references: bool = False) -> str:
        """Create a formatted system context listing uploaded files.

        Args:
            files: Files available for this message.

        Returns:
            Formatted string for a system message.
        """
        lines = ["Attachment context for this turn:"]

        if explicit_references:
            lines.append("The following files were explicitly referenced for this message:")
        else:
            lines.append("The following files were uploaded in this message:")
        lines.append("")
        if files:
            for file in files:
                size_kb = file["size"] / 1024
                size_str = f"{size_kb:.1f} KB" if size_kb < 1024 else f"{size_kb / 1024:.1f} MB"
                lines.append(f"- {file['filename']} ({size_str})")
                lines.append(f"  Path: {file['path']}")
                lines.append("")
        else:
            lines.append("(empty)")

        lines.append("You can read these files using the `read_file` tool with the paths shown above.")

        return "\n".join(lines)

    def _attachments_from_kwargs(self, message: HumanMessage, uploads_dir: Path | None = None) -> list[dict] | None:
        """Extract structured attachment references from additional_kwargs.attachments."""
        kwargs_attachments = (message.additional_kwargs or {}).get("attachments")
        if not isinstance(kwargs_attachments, list):
            return None

        files = []
        for item in kwargs_attachments:
            if not isinstance(item, dict):
                continue
            stored_filename = item.get("stored_filename") or item.get("filename") or ""
            original_filename = item.get("original_filename") or stored_filename
            virtual_path = item.get("virtual_path") or ""
            attachment_id = item.get("attachment_id") or ""
            if not stored_filename or Path(stored_filename).name != stored_filename:
                continue
            if not isinstance(virtual_path, str) or not virtual_path.startswith("/mnt/user-data/uploads/"):
                continue
            if uploads_dir is not None and not (uploads_dir / stored_filename).is_file():
                continue
            files.append(
                {
                    "attachment_id": str(attachment_id),
                    "filename": stored_filename,
                    "stored_filename": stored_filename,
                    "original_filename": str(original_filename),
                    "size": int(item.get("size") or 0),
                    "path": virtual_path,
                    "extension": Path(stored_filename).suffix,
                    "content_type": str(item.get("content_type") or ""),
                }
            )

        return files

    def _files_from_kwargs(self, message: HumanMessage, uploads_dir: Path | None = None) -> list[dict] | None:
        """Extract file info from message additional_kwargs.files.

        The frontend sends uploaded file metadata in additional_kwargs.files
        after a successful upload. Each entry has: filename, size (bytes),
        path (virtual path), status.

        Args:
            message: The human message to inspect.
            uploads_dir: Physical uploads directory used to verify file existence.
                         When provided, entries whose files no longer exist are skipped.

        Returns:
            List of file dicts with virtual paths, or None if the field is absent or empty.
        """
        kwargs_files = (message.additional_kwargs or {}).get("files")
        if not isinstance(kwargs_files, list) or not kwargs_files:
            return None

        logger.info(
            "[UploadsMiddleware] legacy additional_kwargs.files consumed as compatibility fallback; "
            "please migrate client payload to additional_kwargs.attachments"
        )

        files = []
        for f in kwargs_files:
            if not isinstance(f, dict):
                continue
            filename = f.get("filename") or ""
            if not filename or Path(filename).name != filename:
                continue
            if uploads_dir is not None and not (uploads_dir / filename).is_file():
                continue
            files.append(
                {
                    "filename": filename,
                    "size": int(f.get("size") or 0),
                    "path": f"/mnt/user-data/uploads/{filename}",
                    "extension": Path(filename).suffix,
                }
            )
        return files if files else None

    @override
    def before_agent(self, state: UploadsMiddlewareState, runtime: Runtime) -> dict | None:
        """Inject uploaded files information before agent execution.

        Files come from explicit additional_kwargs.attachments.
        If absent, legacy additional_kwargs.files is consumed as compatibility fallback.

        Injects a system attachment context message before the last human message.

        Args:
            state: Current agent state.
            runtime: Runtime context containing thread_id.

        Returns:
            State updates including uploaded files list.
        """
        messages = list(state.get("messages", []))
        if not messages:
            return None

        last_message_index = len(messages) - 1
        last_message = messages[last_message_index]

        if not isinstance(last_message, HumanMessage):
            return None

        # Resolve uploads directory for existence checks
        thread_id = (runtime.context or {}).get("thread_id")
        user_id = (runtime.context or {}).get("user_id", "local")
        tenant_id = (runtime.context or {}).get("tenant_id")
        uploads_dir = self._paths.sandbox_uploads_dir(user_id, thread_id, tenant_id=tenant_id) if thread_id else None

        # Prefer explicit structured references, fallback to legacy files metadata.
        referenced_files = self._attachments_from_kwargs(last_message, uploads_dir)
        if referenced_files is not None:
            validated_references = []
            for file in referenced_files:
                expected_id = upload_attachment_id(thread_id or "", file["filename"])
                attachment_id = str(file.get("attachment_id") or "")
                if attachment_id and thread_id and attachment_id != expected_id:
                    continue
                validated_references.append(file)
            referenced_files = validated_references
        explicit_references = referenced_files is not None
        new_files = referenced_files if referenced_files is not None else (self._files_from_kwargs(last_message, uploads_dir) or [])

        if not explicit_references and new_files:
            logger.warning(
                "[UploadsMiddleware] falling back to legacy additional_kwargs.files for thread_id=%s, file_count=%s",
                thread_id,
                len(new_files),
            )

        if explicit_references and not new_files:
            return {"uploaded_files": []}

        if not new_files:
            return None

        logger.debug("Files injected for this turn: %s", [f["filename"] for f in new_files])

        files_message = self._create_files_message(new_files, explicit_references=explicit_references)
        messages.insert(last_message_index, SystemMessage(content=files_message))

        return {
            "uploaded_files": new_files,
            "messages": messages,
        }
