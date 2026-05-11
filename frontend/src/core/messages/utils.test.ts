import type { Message } from "@langchain/langgraph-sdk";
import { describe, expect, it } from "vitest";

import {
  buildRetrySubmissionFromMessage,
  buildToolResultArtifactPath,
  extractPresentFilesFromMessage,
  extractToolResultArtifacts,
  groupMessages,
} from "./utils";

describe("message utils", () => {
  it("extracts filepaths from present_files tool calls", () => {
    const message = {
      type: "ai",
      tool_calls: [
        {
          id: "call_1",
          name: "present_files",
          args: {
            filepaths: ["/mnt/user-data/a.txt", "/mnt/user-data/b.txt"],
          },
        },
        {
          id: "call_2",
          name: "web_search",
          args: {},
        },
      ],
    } as unknown as Message;

    expect(extractPresentFilesFromMessage(message)).toEqual([
      "/mnt/user-data/a.txt",
      "/mnt/user-data/b.txt",
    ]);
  });

  it("builds retry submission with stripped text and structured attachments", () => {
    const message = {
      type: "human",
      content: "请查看<uploaded_files>legacy</uploaded_files>附件",
      additional_kwargs: {
        attachments: [
          {
            attachment_id: "att-1",
            filename: "report.pdf",
            original_filename: "report.pdf",
            stored_filename: "report.pdf",
            virtual_path: "/mnt/user-data/uploads/report.pdf",
            artifact_url:
              "/api/threads/thread-1/artifacts/mnt/user-data/uploads/report.pdf",
            content_type: "application/pdf",
            size: 1024,
            derived_files: [
              {
                attachment_id: "att-md",
                filename: "report.md",
                virtual_path: "/mnt/user-data/uploads/report.md",
                artifact_url:
                  "/api/threads/thread-1/artifacts/mnt/user-data/uploads/report.md",
                content_type: "text/markdown",
              },
            ],
          },
        ],
      },
    } as unknown as Message;

    const retrySubmission = buildRetrySubmissionFromMessage(message);

    expect(retrySubmission.text).toBe("请查看附件");
    expect(retrySubmission.attachments).toHaveLength(1);
    expect(retrySubmission.attachments[0]).toMatchObject({
      attachment_id: "att-1",
      filename: "report.pdf",
      virtual_path: "/mnt/user-data/uploads/report.pdf",
      artifact_url:
        "/api/threads/thread-1/artifacts/mnt/user-data/uploads/report.pdf",
      content_type: "application/pdf",
      size: 1024,
    });
    expect(retrySubmission.attachments[0]?.derived_files?.[0]).toMatchObject({
      attachment_id: "att-md",
      filename: "report.md",
      virtual_path: "/mnt/user-data/uploads/report.md",
      artifact_url:
        "/api/threads/thread-1/artifacts/mnt/user-data/uploads/report.md",
      content_type: "text/markdown",
    });
  });

  it("builds unique MCP artifact paths per tool_call_id", () => {
    const first = buildToolResultArtifactPath({
      toolName: "mcp__fs__list",
      args: {},
      messageId: "msg_1",
      toolCallId: "call_A",
    });
    const second = buildToolResultArtifactPath({
      toolName: "mcp__fs__list",
      args: {},
      messageId: "msg_1",
      toolCallId: "call_B",
    });

    expect(first).toContain("mcp-result:/mnt/user-data/outputs/mcp__fs__list-call_A.json");
    expect(second).toContain("mcp-result:/mnt/user-data/outputs/mcp__fs__list-call_B.json");
    expect(first).not.toEqual(second);
  });

  it("extracts artifacts for repeated MCP tool calls without collision", () => {
    const messages = [
      {
        id: "msg_ai",
        type: "ai",
        tool_calls: [
          { id: "call_1", name: "mcp__repo__status", args: {} },
          { id: "call_2", name: "mcp__repo__status", args: {} },
        ],
      },
      {
        type: "tool",
        tool_call_id: "call_1",
        content: "result one",
      },
      {
        type: "tool",
        tool_call_id: "call_2",
        content: "result two",
      },
    ] as unknown as Message[];

    const artifacts = extractToolResultArtifacts(messages);

    expect(artifacts).toHaveLength(2);
    expect(artifacts[0]?.filepath).not.toEqual(artifacts[1]?.filepath);
    expect(artifacts[0]?.filepath).toContain("call_1");
    expect(artifacts[1]?.filepath).toContain("call_2");
  });

  it("groups tool messages after clarification without treating them as orphan", () => {
    const messages = [
      {
        id: "ai_1",
        type: "ai",
        content: "",
        tool_calls: [
          {
            id: "tc_1",
            name: "ask_clarification",
            args: {},
          },
        ],
      },
      {
        id: "tool_1",
        type: "tool",
        name: "ask_clarification",
        tool_call_id: "tc_1",
        content: "Need clarification",
      },
      {
        id: "tool_2",
        type: "tool",
        name: "task",
        tool_call_id: "tc_2",
        content: "Task Succeeded. Result: done",
      },
    ] as unknown as Message[];

    const groups = groupMessages(messages, (group) => group);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.type).toBe("assistant:processing");
    expect(groups[0]?.messages).toHaveLength(3);
    expect(groups[1]?.type).toBe("assistant:clarification");
  });

  it("ignores truly orphan tool messages without creating a group", () => {
    const messages = [
      {
        id: "tool_only",
        type: "tool",
        name: "task",
        tool_call_id: "tc_orphan",
        content: "Task failed.",
      },
    ] as unknown as Message[];

    const groups = groupMessages(messages, (group) => group);

    expect(groups).toHaveLength(0);
  });
});
