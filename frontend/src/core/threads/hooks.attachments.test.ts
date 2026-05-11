import { describe, expect, it } from "vitest";

import type { UploadedFileInfo } from "@/core/uploads";

import { buildAttachmentSubmitPayload } from "./hooks";

function makeFile(overrides: Partial<UploadedFileInfo>): UploadedFileInfo {
  return {
    attachment_id: "att-default",
    filename: "default.txt",
    original_filename: "default.txt",
    stored_filename: "default.txt",
    size: 10,
    path: "/mnt/user-data/uploads/default.txt",
    virtual_path: "/mnt/user-data/uploads/default.txt",
    artifact_url: "/api/threads/thread-1/artifacts/mnt/user-data/uploads/default.txt",
    ...overrides,
  };
}

describe("buildAttachmentSubmitPayload", () => {
  it("deduplicates selected and uploaded attachments by attachment_id", () => {
    const selected = [
      makeFile({
        attachment_id: "att-1",
        filename: "report.pdf",
        virtual_path: "/mnt/user-data/uploads/report.pdf",
      }),
    ];
    const uploaded = [
      makeFile({
        attachment_id: "att-1",
        filename: "report.pdf",
        virtual_path: "/mnt/user-data/uploads/report.pdf",
      }),
      makeFile({
        attachment_id: "att-2",
        filename: "notes.txt",
        virtual_path: "/mnt/user-data/uploads/notes.txt",
      }),
    ];

    const { dedupedAttachmentRefs } = buildAttachmentSubmitPayload(
      selected,
      uploaded,
    );

    expect(dedupedAttachmentRefs).toHaveLength(2);
    expect(dedupedAttachmentRefs.map((item) => item.attachment_id)).toEqual([
      "att-1",
      "att-2",
    ]);
    expect(dedupedAttachmentRefs).toHaveLength(2);
  });

  it("preserves structured attachment metadata", () => {
    const selected = [
      makeFile({
        attachment_id: "att-3",
        filename: "deck.pptx",
        size: 2048,
        virtual_path: "/mnt/user-data/uploads/deck.pptx",
        content_type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      }),
    ];

    const { dedupedAttachmentRefs } = buildAttachmentSubmitPayload(
      selected,
      [],
    );

    expect(dedupedAttachmentRefs[0]).toMatchObject({
      attachment_id: "att-3",
      filename: "deck.pptx",
      virtual_path: "/mnt/user-data/uploads/deck.pptx",
    });

    expect(dedupedAttachmentRefs[0]).toMatchObject({
      content_type:
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      size: 2048,
    });
  });

  it("includes original and stored filename semantics", () => {
    const uploaded = [
      makeFile({
        attachment_id: "att-rename-1",
        filename: "data_1.xlsx",
        original_filename: "data.xlsx",
        stored_filename: "data_1.xlsx",
        virtual_path: "/mnt/user-data/uploads/data_1.xlsx",
        content_type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    ];

    const { dedupedAttachmentRefs } = buildAttachmentSubmitPayload([], uploaded);

    expect(dedupedAttachmentRefs[0]).toMatchObject({
      filename: "data_1.xlsx",
      original_filename: "data.xlsx",
      stored_filename: "data_1.xlsx",
    });
  });
});
