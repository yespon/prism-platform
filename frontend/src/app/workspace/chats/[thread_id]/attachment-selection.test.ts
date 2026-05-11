import { describe, expect, it } from "vitest";

import type { UploadedFileInfo } from "@/core/uploads";

import {
  reconcileAttachmentSelection,
  removeDeletedAttachmentSelections,
  selectPreferredReferencesForAddedIds,
  type AttachmentSelectionState,
} from "./attachment-selection";

function makeFile(overrides: Partial<UploadedFileInfo>): UploadedFileInfo {
  return {
    attachment_id: "att-default",
    filename: "default.txt",
    size: 10,
    path: "/mnt/user-data/uploads/default.txt",
    virtual_path: "/mnt/user-data/uploads/default.txt",
    artifact_url: "/api/threads/thread-1/artifacts/mnt/user-data/uploads/default.txt",
    ...overrides,
  };
}

function emptyState(): AttachmentSelectionState {
  return {
    selectedIds: [],
    knownIds: new Set<string>(),
    initialized: false,
  };
}

describe("reconcileAttachmentSelection", () => {
  it("keeps history unselected on first load", () => {
    const files = [
      makeFile({ attachment_id: "att-1", filename: "history-1.pdf" }),
      makeFile({ attachment_id: "att-2", filename: "history-2.pdf" }),
    ];

    const next = reconcileAttachmentSelection(emptyState(), files);

    expect(next.initialized).toBe(true);
    expect(next.selectedIds).toEqual([]);
  });

  it("auto-selects only newly added attachments after initialization", () => {
    const initialFiles = [
      makeFile({ attachment_id: "att-1", filename: "history.pdf" }),
    ];
    const initialized = reconcileAttachmentSelection(emptyState(), initialFiles);

    const withNewFile = [
      ...initialFiles,
      makeFile({ attachment_id: "att-2", filename: "new-upload.pdf" }),
    ];

    const next = reconcileAttachmentSelection(initialized, withNewFile);

    expect(next.selectedIds).toEqual(["att-2"]);
  });

  it("prunes selection when attachment is removed", () => {
    const state: AttachmentSelectionState = {
      selectedIds: ["att-2"],
      knownIds: new Set(["att-1", "att-2"]),
      initialized: true,
    };
    const filesAfterDelete = [
      makeFile({ attachment_id: "att-1", filename: "history.pdf" }),
    ];

    const next = reconcileAttachmentSelection(state, filesAfterDelete);

    expect(next.selectedIds).toEqual([]);
  });

  it("selects only preferred derived file for convertible upload", () => {
    const initialized = reconcileAttachmentSelection(emptyState(), [
      makeFile({ attachment_id: "att-history", filename: "history.txt" }),
    ]);

    const withConvertible = [
      makeFile({ attachment_id: "att-history", filename: "history.txt" }),
      makeFile({
        attachment_id: "att-source-pdf",
        filename: "checklist.pdf",
        content_type: "application/pdf",
        derived_files: [
          {
            attachment_id: "att-source-md",
            filename: "checklist.md",
            virtual_path: "/mnt/user-data/uploads/checklist.md",
            artifact_url: "/api/threads/thread-1/artifacts/mnt/user-data/uploads/checklist.md",
            content_type: "text/markdown",
          },
        ],
      }),
      makeFile({
        attachment_id: "att-source-md",
        filename: "checklist.md",
        content_type: "text/markdown",
      }),
    ];

    const next = reconcileAttachmentSelection(initialized, withConvertible);

    expect(next.selectedIds).toEqual(["att-source-md"]);
  });

  it("removes source and derived selections together after deleting source", () => {
    const source = makeFile({
      attachment_id: "att-source-pdf",
      filename: "manual.pdf",
      derived_files: [
        {
          attachment_id: "att-source-md",
          filename: "manual.md",
          virtual_path: "/mnt/user-data/uploads/manual.md",
          artifact_url: "/api/threads/thread-1/artifacts/mnt/user-data/uploads/manual.md",
          content_type: "text/markdown",
        },
      ],
    });

    const next = removeDeletedAttachmentSelections(
      ["att-source-pdf", "att-source-md", "att-other"],
      source,
    );

    expect(next).toEqual(["att-other"]);
  });

  it("returns preferred references for newly added ids", () => {
    const attachments = [
      makeFile({
        attachment_id: "att-pdf",
        filename: "brief.pdf",
        derived_files: [
          {
            attachment_id: "att-md",
            filename: "brief.md",
            virtual_path: "/mnt/user-data/uploads/brief.md",
            artifact_url: "/api/threads/thread-1/artifacts/mnt/user-data/uploads/brief.md",
            content_type: "text/markdown",
          },
        ],
      }),
      makeFile({
        attachment_id: "att-md",
        filename: "brief.md",
      }),
    ];

    const preferred = selectPreferredReferencesForAddedIds(
      ["att-pdf", "att-md"],
      attachments,
    );

    expect(preferred).toEqual(["att-md"]);
  });
});
