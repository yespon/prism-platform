import type { Message } from "@langchain/langgraph-sdk";
import { describe, expect, it } from "vitest";

import { formatThreadAsJSON, formatThreadAsMarkdown } from "./export";
import type { AgentThread } from "./types";

describe("thread export attachments", () => {
  const thread = {
    thread_id: "thread-1",
    created_at: "2026-04-03T00:00:00Z",
    values: {
      title: "Attachment Thread",
    },
  } as unknown as AgentThread;

  it("includes message attachments in JSON export", () => {
    const messages = [
      {
        id: "m1",
        type: "human",
        content: "Analyze this",
        additional_kwargs: {
          attachments: [
            {
              attachment_id: "att-1",
              filename: "report.pdf",
              virtual_path: "/mnt/user-data/uploads/report.pdf",
            },
          ],
        },
      },
    ] as unknown as Message[];

    const json = formatThreadAsJSON(thread, messages);
    const parsed = JSON.parse(json) as {
      messages: Array<Record<string, unknown>>;
    };

    expect(parsed.messages[0]?.attachments).toBeTruthy();
  });

  it("includes attachments section in markdown export", () => {
    const messages = [
      {
        id: "m1",
        type: "human",
        content: "Analyze this",
        additional_kwargs: {
          attachments: [
            {
              attachment_id: "att-1",
              filename: "report.pdf",
              virtual_path: "/mnt/user-data/uploads/report.pdf",
            },
          ],
        },
      },
    ] as unknown as Message[];

    const markdown = formatThreadAsMarkdown(thread, messages);
    expect(markdown).toContain("### Attachments");
    expect(markdown).toContain("report.pdf");
    expect(markdown).toContain("[att-1]");
  });
});
