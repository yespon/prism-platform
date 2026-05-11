import { describe, expect, it } from "vitest";

import { sanitizeRunStreamOptions } from "./stream-mode";

describe("sanitizeRunStreamOptions", () => {
  it("drops unsupported stream modes from array payloads", () => {
  const sanitized = sanitizeRunStreamOptions({
    streamMode: [
      "values",
      "messages-tuple",
      "custom",
      "updates",
      "events",
      "tools",
    ],
  });

    expect(sanitized.streamMode).toEqual([
    "values",
    "messages-tuple",
    "custom",
    "updates",
    "events",
  ]);
  });

  it("drops unsupported stream modes from scalar payloads", () => {
  const sanitized = sanitizeRunStreamOptions({
    streamMode: "tools",
  });

    expect(sanitized.streamMode).toBeUndefined();
  });

  it("keeps payloads without streamMode untouched", () => {
  const options = {
    streamSubgraphs: true,
  };

    expect(sanitizeRunStreamOptions(options)).toBe(options);
  });
});
