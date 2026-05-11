import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function walkFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
      continue;
    }
    if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("legacy admin tenant members endpoint cleanup", () => {
  it("frontend source should not depend on platform tenant members API", () => {
    const srcDir = path.resolve(process.cwd(), "src");
    const files = walkFiles(srcDir);
    const regex = /\/api\/admin\/tenants\/[^\s"'`]+\/members/;

    const matched = files.filter((filePath) => {
      const content = fs.readFileSync(filePath, "utf8");
      return regex.test(content);
    });

    expect(matched).toEqual([]);
  });
});
