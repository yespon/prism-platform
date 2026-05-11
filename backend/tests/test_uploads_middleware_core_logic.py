"""Core behaviour tests for UploadsMiddleware.

Covers:
- _files_from_kwargs: parsing, validation, existence check, virtual-path construction
- _create_files_message: output format for current-turn attachment context
- before_agent: full injection pipeline (system attachment context insertion,
    preserved human content/additional_kwargs, explicit attachment precedence,
    edge-cases)
"""

from pathlib import Path
from unittest.mock import MagicMock

from langchain_core.messages import AIMessage, HumanMessage

from deerflow.agents.middlewares.uploads_middleware import UploadsMiddleware
from deerflow.config.paths import Paths
from deerflow.uploads.manager import upload_attachment_id

THREAD_ID = "thread-abc123"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _middleware(tmp_path: Path) -> UploadsMiddleware:
    return UploadsMiddleware(base_dir=str(tmp_path))


def _runtime(thread_id: str | None = THREAD_ID, user_id: str = "local", tenant_id: str | None = None) -> MagicMock:
    rt = MagicMock()
    rt.context = {"thread_id": thread_id, "user_id": user_id, "tenant_id": tenant_id}
    return rt


def _uploads_dir(tmp_path: Path, thread_id: str = THREAD_ID, tenant_id: str | None = None) -> Path:
    d = Paths(str(tmp_path)).sandbox_uploads_dir("local", thread_id, tenant_id=tenant_id)
    d.mkdir(parents=True, exist_ok=True)
    return d


def _human(content, files=None, **extra_kwargs):
    additional_kwargs = dict(extra_kwargs)
    if files is not None:
        additional_kwargs["files"] = files
    return HumanMessage(content=content, additional_kwargs=additional_kwargs)


# ---------------------------------------------------------------------------
# _files_from_kwargs
# ---------------------------------------------------------------------------


class TestFilesFromKwargs:
    def test_returns_none_when_files_field_absent(self, tmp_path):
        mw = _middleware(tmp_path)
        msg = HumanMessage(content="hello")
        assert mw._files_from_kwargs(msg) is None

    def test_returns_none_for_empty_files_list(self, tmp_path):
        mw = _middleware(tmp_path)
        msg = _human("hello", files=[])
        assert mw._files_from_kwargs(msg) is None

    def test_returns_none_for_non_list_files(self, tmp_path):
        mw = _middleware(tmp_path)
        msg = _human("hello", files="not-a-list")
        assert mw._files_from_kwargs(msg) is None

    def test_skips_non_dict_entries(self, tmp_path):
        mw = _middleware(tmp_path)
        msg = _human("hi", files=["bad", 42, None])
        assert mw._files_from_kwargs(msg) is None

    def test_skips_entries_with_empty_filename(self, tmp_path):
        mw = _middleware(tmp_path)
        msg = _human("hi", files=[{"filename": "", "size": 100, "path": "/mnt/user-data/uploads/x"}])
        assert mw._files_from_kwargs(msg) is None

    def test_always_uses_virtual_path(self, tmp_path):
        """path field must be /mnt/user-data/uploads/<filename> regardless of what the frontend sent."""
        mw = _middleware(tmp_path)
        msg = _human(
            "hi",
            files=[{"filename": "report.pdf", "size": 1024, "path": "/some/arbitrary/path/report.pdf"}],
        )
        result = mw._files_from_kwargs(msg)
        assert result is not None
        assert result[0]["path"] == "/mnt/user-data/uploads/report.pdf"

    def test_skips_file_that_does_not_exist_on_disk(self, tmp_path):
        mw = _middleware(tmp_path)
        uploads_dir = _uploads_dir(tmp_path)
        # file is NOT written to disk
        msg = _human("hi", files=[{"filename": "missing.txt", "size": 50, "path": "/mnt/user-data/uploads/missing.txt"}])
        assert mw._files_from_kwargs(msg, uploads_dir) is None

    def test_accepts_file_that_exists_on_disk(self, tmp_path):
        mw = _middleware(tmp_path)
        uploads_dir = _uploads_dir(tmp_path)
        (uploads_dir / "data.csv").write_text("a,b,c")
        msg = _human("hi", files=[{"filename": "data.csv", "size": 5, "path": "/mnt/user-data/uploads/data.csv"}])
        result = mw._files_from_kwargs(msg, uploads_dir)
        assert result is not None
        assert len(result) == 1
        assert result[0]["filename"] == "data.csv"
        assert result[0]["path"] == "/mnt/user-data/uploads/data.csv"

    def test_skips_nonexistent_but_accepts_existing_in_mixed_list(self, tmp_path):
        mw = _middleware(tmp_path)
        uploads_dir = _uploads_dir(tmp_path)
        (uploads_dir / "present.txt").write_text("here")
        msg = _human(
            "hi",
            files=[
                {"filename": "present.txt", "size": 4, "path": "/mnt/user-data/uploads/present.txt"},
                {"filename": "gone.txt", "size": 4, "path": "/mnt/user-data/uploads/gone.txt"},
            ],
        )
        result = mw._files_from_kwargs(msg, uploads_dir)
        assert result is not None
        assert [f["filename"] for f in result] == ["present.txt"]

    def test_no_existence_check_when_uploads_dir_is_none(self, tmp_path):
        """Without an uploads_dir argument the existence check is skipped entirely."""
        mw = _middleware(tmp_path)
        msg = _human("hi", files=[{"filename": "phantom.txt", "size": 10, "path": "/mnt/user-data/uploads/phantom.txt"}])
        result = mw._files_from_kwargs(msg, uploads_dir=None)
        assert result is not None
        assert result[0]["filename"] == "phantom.txt"

    def test_size_is_coerced_to_int(self, tmp_path):
        mw = _middleware(tmp_path)
        msg = _human("hi", files=[{"filename": "f.txt", "size": "2048", "path": "/mnt/user-data/uploads/f.txt"}])
        result = mw._files_from_kwargs(msg)
        assert result is not None
        assert result[0]["size"] == 2048

    def test_missing_size_defaults_to_zero(self, tmp_path):
        mw = _middleware(tmp_path)
        msg = _human("hi", files=[{"filename": "f.txt", "path": "/mnt/user-data/uploads/f.txt"}])
        result = mw._files_from_kwargs(msg)
        assert result is not None
        assert result[0]["size"] == 0


# ---------------------------------------------------------------------------
# _create_files_message
# ---------------------------------------------------------------------------


class TestCreateFilesMessage:
    def _new_file(self, filename="notes.txt", size=1024):
        return {"filename": filename, "size": size, "path": f"/mnt/user-data/uploads/{filename}"}

    def test_new_files_section_always_present(self, tmp_path):
        mw = _middleware(tmp_path)
        msg = mw._create_files_message([self._new_file()])
        assert "Attachment context for this turn:" in msg
        assert "uploaded in this message" in msg
        assert "notes.txt" in msg
        assert "/mnt/user-data/uploads/notes.txt" in msg

    def test_size_formatting_kb(self, tmp_path):
        mw = _middleware(tmp_path)
        msg = mw._create_files_message([self._new_file(size=2048)])
        assert "2.0 KB" in msg

    def test_size_formatting_mb(self, tmp_path):
        mw = _middleware(tmp_path)
        msg = mw._create_files_message([self._new_file(size=2 * 1024 * 1024)])
        assert "2.0 MB" in msg

    def test_read_file_instruction_included(self, tmp_path):
        mw = _middleware(tmp_path)
        msg = mw._create_files_message([self._new_file()])
        assert "read_file" in msg

    def test_empty_new_files_produces_empty_marker(self, tmp_path):
        mw = _middleware(tmp_path)
        msg = mw._create_files_message([])
        assert "(empty)" in msg
        assert "Attachment context for this turn:" in msg


# ---------------------------------------------------------------------------
# before_agent
# ---------------------------------------------------------------------------


class TestBeforeAgent:
    def _state(self, *messages):
        return {"messages": list(messages)}

    def test_returns_none_when_messages_empty(self, tmp_path):
        mw = _middleware(tmp_path)
        assert mw.before_agent({"messages": []}, _runtime()) is None

    def test_returns_none_when_last_message_is_not_human(self, tmp_path):
        mw = _middleware(tmp_path)
        state = self._state(HumanMessage(content="q"), AIMessage(content="a"))
        assert mw.before_agent(state, _runtime()) is None

    def test_returns_none_when_no_files_in_kwargs(self, tmp_path):
        mw = _middleware(tmp_path)
        state = self._state(_human("plain message"))
        assert mw.before_agent(state, _runtime()) is None

    def test_returns_none_when_all_files_missing_from_disk(self, tmp_path):
        mw = _middleware(tmp_path)
        _uploads_dir(tmp_path)  # directory exists but is empty
        msg = _human("hi", files=[{"filename": "ghost.txt", "size": 10, "path": "/mnt/user-data/uploads/ghost.txt"}])
        state = self._state(msg)
        assert mw.before_agent(state, _runtime()) is None

    def test_inserts_system_attachment_context_for_string_content(self, tmp_path):
        mw = _middleware(tmp_path)
        uploads_dir = _uploads_dir(tmp_path)
        (uploads_dir / "report.pdf").write_bytes(b"pdf")

        msg = _human("please analyse", files=[{"filename": "report.pdf", "size": 3, "path": "/mnt/user-data/uploads/report.pdf"}])
        state = self._state(msg)
        result = mw.before_agent(state, _runtime())

        assert result is not None
        system_msg = result["messages"][-2]
        updated_msg = result["messages"][-1]
        assert system_msg.type == "system"
        assert "report.pdf" in str(system_msg.content)
        assert isinstance(updated_msg.content, str)
        assert updated_msg.content == "please analyse"

    def test_inserts_system_attachment_context_for_list_content(self, tmp_path):
        mw = _middleware(tmp_path)
        uploads_dir = _uploads_dir(tmp_path)
        (uploads_dir / "data.csv").write_bytes(b"a,b")

        msg = _human(
            [{"type": "text", "text": "analyse this"}],
            files=[{"filename": "data.csv", "size": 3, "path": "/mnt/user-data/uploads/data.csv"}],
        )
        state = self._state(msg)
        result = mw.before_agent(state, _runtime())

        assert result is not None
        system_msg = result["messages"][-2]
        updated_msg = result["messages"][-1]
        assert system_msg.type == "system"
        assert "data.csv" in str(system_msg.content)
        assert updated_msg.content == [{"type": "text", "text": "analyse this"}]

    def test_preserves_additional_kwargs_on_updated_message(self, tmp_path):
        mw = _middleware(tmp_path)
        uploads_dir = _uploads_dir(tmp_path)
        (uploads_dir / "img.png").write_bytes(b"png")

        files_meta = [{"filename": "img.png", "size": 3, "path": "/mnt/user-data/uploads/img.png", "status": "uploaded"}]
        msg = _human("check image", files=files_meta, element="task")
        state = self._state(msg)
        result = mw.before_agent(state, _runtime())

        assert result is not None
        updated_kwargs = result["messages"][-1].additional_kwargs
        assert updated_kwargs.get("files") == files_meta
        assert updated_kwargs.get("element") == "task"

    def test_uploaded_files_returned_in_state_update(self, tmp_path):
        mw = _middleware(tmp_path)
        uploads_dir = _uploads_dir(tmp_path)
        (uploads_dir / "notes.txt").write_bytes(b"hello")

        msg = _human("review", files=[{"filename": "notes.txt", "size": 5, "path": "/mnt/user-data/uploads/notes.txt"}])
        result = mw.before_agent(self._state(msg), _runtime())

        assert result is not None
        assert result["uploaded_files"] == [
            {
                "filename": "notes.txt",
                "size": 5,
                "path": "/mnt/user-data/uploads/notes.txt",
                "extension": ".txt",
            }
        ]

    def test_historical_files_are_never_auto_injected(self, tmp_path):
        mw = _middleware(tmp_path)
        uploads_dir = _uploads_dir(tmp_path)
        (uploads_dir / "old.txt").write_bytes(b"old")
        (uploads_dir / "new.txt").write_bytes(b"new")

        msg = _human("go", files=[{"filename": "new.txt", "size": 3, "path": "/mnt/user-data/uploads/new.txt"}])
        result = mw.before_agent(self._state(msg), _runtime())

        assert result is not None
        content = result["messages"][-2].content
        assert "new.txt" in content
        assert "old.txt" not in content
        assert "previous messages" not in content

    def test_no_historical_section_when_upload_dir_is_empty(self, tmp_path):
        mw = _middleware(tmp_path)
        uploads_dir = _uploads_dir(tmp_path)
        (uploads_dir / "only.txt").write_bytes(b"x")

        msg = _human("go", files=[{"filename": "only.txt", "size": 1, "path": "/mnt/user-data/uploads/only.txt"}])
        result = mw.before_agent(self._state(msg), _runtime())

        content = result["messages"][-2].content
        assert "previous messages" not in content

    def test_no_historical_scan_when_thread_id_is_none(self, tmp_path):
        mw = _middleware(tmp_path)
        msg = _human("go", files=[{"filename": "f.txt", "size": 1, "path": "/mnt/user-data/uploads/f.txt"}])
        # thread_id=None → _files_from_kwargs skips existence check, no dir scan
        result = mw.before_agent(self._state(msg), _runtime(thread_id=None))
        # With no existence check, the file passes through and context injection happens
        assert result is not None
        content = result["messages"][-2].content
        assert "previous messages" not in content

    def test_message_id_preserved_on_updated_message(self, tmp_path):
        mw = _middleware(tmp_path)
        uploads_dir = _uploads_dir(tmp_path)
        (uploads_dir / "f.txt").write_bytes(b"x")

        msg = _human("go", files=[{"filename": "f.txt", "size": 1, "path": "/mnt/user-data/uploads/f.txt"}])
        msg.id = "original-id-42"
        result = mw.before_agent(self._state(msg), _runtime())

        assert result["messages"][-1].id == "original-id-42"

    def test_tenant_scoped_upload_lookup_isolated(self, tmp_path):
        mw = _middleware(tmp_path)
        tenant_a_dir = _uploads_dir(tmp_path, tenant_id="tenant-a")
        _uploads_dir(tmp_path, tenant_id="tenant-b")

        (tenant_a_dir / "shared-name.txt").write_text("tenant-a")

        msg = _human(
            "process",
            files=[{"filename": "shared-name.txt", "size": 8, "path": "/mnt/user-data/uploads/shared-name.txt"}],
        )

        # File exists in tenant-a, so injection happens.
        result_a = mw.before_agent(self._state(msg), _runtime(tenant_id="tenant-a"))
        assert result_a is not None

        # Same thread and filename under tenant-b should not see tenant-a file.
        result_b = mw.before_agent(self._state(msg), _runtime(tenant_id="tenant-b"))
        assert result_b is None

    def test_explicit_attachments_do_not_auto_include_historical_files(self, tmp_path):
        mw = _middleware(tmp_path)
        uploads_dir = _uploads_dir(tmp_path)
        (uploads_dir / "picked.txt").write_text("picked")
        (uploads_dir / "other.txt").write_text("other")

        msg = _human(
            "analyze selected",
            attachments=[
                {
                    "attachment_id": upload_attachment_id(THREAD_ID, "picked.txt"),
                    "filename": "picked.txt",
                    "virtual_path": "/mnt/user-data/uploads/picked.txt",
                    "artifact_url": "/api/threads/thread-abc123/artifacts/mnt/user-data/uploads/picked.txt",
                    "size": 6,
                }
            ],
        )
        result = mw.before_agent(self._state(msg), _runtime())

        assert result is not None
        content = result["messages"][-2].content
        assert "picked.txt" in content
        assert "other.txt" not in content
        assert "explicitly referenced" in content

    def test_explicit_empty_attachments_means_no_injection(self, tmp_path):
        mw = _middleware(tmp_path)
        _uploads_dir(tmp_path)
        msg = _human("analyze", attachments=[])

        result = mw.before_agent(self._state(msg), _runtime())

        assert result == {"uploaded_files": []}

    def test_explicit_attachment_id_mismatch_is_rejected(self, tmp_path):
        mw = _middleware(tmp_path)
        uploads_dir = _uploads_dir(tmp_path)
        (uploads_dir / "picked.txt").write_text("picked")

        msg = _human(
            "analyze selected",
            attachments=[
                {
                    "attachment_id": "att-wrong",
                    "filename": "picked.txt",
                    "virtual_path": "/mnt/user-data/uploads/picked.txt",
                    "artifact_url": "/api/threads/thread-abc123/artifacts/mnt/user-data/uploads/picked.txt",
                    "size": 6,
                }
            ],
        )
        result = mw.before_agent(self._state(msg), _runtime())

        assert result == {"uploaded_files": []}

    def test_attachments_take_precedence_over_legacy_files(self, tmp_path):
        mw = _middleware(tmp_path)
        uploads_dir = _uploads_dir(tmp_path)
        (uploads_dir / "selected.txt").write_text("selected")
        (uploads_dir / "legacy.txt").write_text("legacy")

        msg = _human(
            "analyze selected only",
            files=[
                {
                    "filename": "legacy.txt",
                    "size": 6,
                    "path": "/mnt/user-data/uploads/legacy.txt",
                }
            ],
            attachments=[
                {
                    "attachment_id": upload_attachment_id(THREAD_ID, "selected.txt"),
                    "filename": "selected.txt",
                    "virtual_path": "/mnt/user-data/uploads/selected.txt",
                    "artifact_url": "/api/threads/thread-abc123/artifacts/mnt/user-data/uploads/selected.txt",
                    "size": 8,
                }
            ],
        )

        result = mw.before_agent(self._state(msg), _runtime())

        assert result is not None
        content = result["messages"][-2].content
        assert "selected.txt" in content
        assert "legacy.txt" not in content
        assert result["uploaded_files"][0]["filename"] == "selected.txt"

    def test_explicit_attachments_support_stored_and_original_filename(self, tmp_path):
        mw = _middleware(tmp_path)
        uploads_dir = _uploads_dir(tmp_path)
        (uploads_dir / "report_1.pdf").write_text("content")

        msg = _human(
            "analyze renamed upload",
            attachments=[
                {
                    "attachment_id": upload_attachment_id(THREAD_ID, "report_1.pdf"),
                    "stored_filename": "report_1.pdf",
                    "original_filename": "report.pdf",
                    "virtual_path": "/mnt/user-data/uploads/report_1.pdf",
                    "artifact_url": "/api/threads/thread-abc123/artifacts/mnt/user-data/uploads/report_1.pdf",
                    "size": 7,
                }
            ],
        )

        result = mw.before_agent(self._state(msg), _runtime())

        assert result is not None
        uploaded = result["uploaded_files"][0]
        assert uploaded["filename"] == "report_1.pdf"
        assert uploaded["stored_filename"] == "report_1.pdf"
        assert uploaded["original_filename"] == "report.pdf"
