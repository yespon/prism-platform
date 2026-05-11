import { describe, expect, it } from "vitest";

import type { UploadedFileInfo } from "@/core/uploads";

import { buildAgentSelectedAttachments } from "./agent-attachments";

describe("buildAgentSelectedAttachments", () => {
  it("selects only attachments referenced by selected ids", () => {
    const attachments: UploadedFileInfo[] = [
      {
        attachment_id: "att-1",
        filename: "report.md",
        size: 12,
        path: "/mnt/user-data/uploads/report.md",
        virtual_path: "/mnt/user-data/uploads/report.md",
        artifact_url: "/api/threads/t/artifacts/mnt/user-data/uploads/report.md",
      },
      {
        attachment_id: "att-2",
        filename: "draft.txt",
        size: 10,
        path: "/mnt/user-data/uploads/draft.txt",
        virtual_path: "/mnt/user-data/uploads/draft.txt",
        artifact_url: "/api/threads/t/artifacts/mnt/user-data/uploads/draft.txt",
      },
      {
        attachment_id: "",
        filename: "legacy.log",
        size: 8,
        path: "/mnt/user-data/uploads/legacy.log",
        virtual_path: "/mnt/user-data/uploads/legacy.log",
        artifact_url: "/api/threads/t/artifacts/mnt/user-data/uploads/legacy.log",
      },
    ];

    const result = buildAgentSelectedAttachments(attachments, ["att-1", "legacy:legacy.log"]);

    expect(result).toHaveLength(2);
    expect(result[0]?.filename).toBe("report.md");
    expect(result[1]?.filename).toBe("legacy.log");
  });
});
