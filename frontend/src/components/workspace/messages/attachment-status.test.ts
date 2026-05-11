import { describe, expect, it } from "vitest";

import { filesFromAdditionalKwargs } from "./attachment-status";

describe("filesFromAdditionalKwargs", () => {
  it("keeps referenced status when artifact reference exists even if not in current key set", () => {
    const files = filesFromAdditionalKwargs(
      {
        attachments: [
          {
            attachment_id: "att-a",
            filename: "a.pdf",
            virtual_path: "/mnt/user-data/uploads/a.pdf",
            artifact_url: "/api/threads/t1/artifacts/mnt/user-data/uploads/a.pdf",
            size: 10,
          },
          {
            attachment_id: "att-b",
            filename: "b.pdf",
            virtual_path: "/mnt/user-data/uploads/b.pdf",
            artifact_url: "/api/threads/t1/artifacts/mnt/user-data/uploads/b.pdf",
            size: 12,
          },
        ],
      },
      new Set(["att-a"]),
    );

    expect(files).toHaveLength(2);
    expect(files?.[0]?.status).toBe("referenced");
    expect(files?.[1]?.status).toBe("referenced");
  });

  it("marks attachment invalid only when key is missing and no resolvable reference", () => {
    const files = filesFromAdditionalKwargs(
      {
        attachments: [
          {
            attachment_id: "att-z",
            filename: "z.pdf",
          },
        ],
      },
      new Set(["att-a"]),
    );

    expect(files).toHaveLength(1);
    expect(files?.[0]?.status).toBe("invalid");
  });

  it("supports legacy key fallback for attachments without attachment_id", () => {
    const files = filesFromAdditionalKwargs(
      {
        attachments: [
          {
            filename: "legacy.txt",
            virtual_path: "/mnt/user-data/uploads/legacy.txt",
            size: 5,
          },
        ],
      },
      new Set(["legacy:legacy.txt"]),
    );

    expect(files?.[0]?.status).toBe("referenced");
  });

  it("falls back to additional_kwargs.files when attachments absent", () => {
    const files = filesFromAdditionalKwargs({
      files: [{ filename: "raw.txt", size: 1, status: "uploaded" }],
    });

    expect(files).toEqual([{ filename: "raw.txt", size: 1, status: "uploaded" }]);
  });

  it("preserves structured fields including derived_files", () => {
    const files = filesFromAdditionalKwargs({
      attachments: [
        {
          attachment_id: "att-source",
          filename: "report.pdf",
          original_filename: "report.pdf",
          stored_filename: "abc-report.pdf",
          virtual_path: "/mnt/user-data/uploads/report.pdf",
          artifact_url: "/api/threads/t1/artifacts/mnt/user-data/uploads/report.pdf",
          derived_files: [
            {
              attachment_id: "att-derived",
              filename: "report.md",
              virtual_path: "/mnt/user-data/uploads/report.md",
              artifact_url: "/api/threads/t1/artifacts/mnt/user-data/uploads/report.md",
              content_type: "text/markdown",
            },
          ],
        },
      ],
    });

    expect(files?.[0]?.original_filename).toBe("report.pdf");
    expect(files?.[0]?.stored_filename).toBe("abc-report.pdf");
    expect(files?.[0]?.derived_files?.[0]?.filename).toBe("report.md");
  });
});
