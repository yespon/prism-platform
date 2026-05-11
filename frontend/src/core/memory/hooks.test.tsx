import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useMemory } from "./hooks";

const mocks = vi.hoisted(() => ({
  useCurrentTenant: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock("@/core/tenants/hooks", () => ({
  useCurrentTenant: mocks.useCurrentTenant,
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
}));

function Probe() {
  useMemory();
  return null;
}

describe("useMemory", () => {
  it("uses tenant-aware query key and updates after tenant switch", () => {
    mocks.useCurrentTenant
      .mockReturnValueOnce({ data: { tenant_id: "tenant-a" } })
      .mockReturnValueOnce({ data: { tenant_id: "tenant-b" } });
    mocks.useQuery.mockReturnValue({ data: null, isLoading: false, error: null });

    const view = render(<Probe />);
    expect(mocks.useQuery).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ queryKey: ["memory", "tenant-a"] }),
    );

    view.rerender(<Probe />);
    expect(mocks.useQuery).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ queryKey: ["memory", "tenant-b"] }),
    );
  });

  it("falls back to null in query key when tenant is unavailable", () => {
    mocks.useCurrentTenant.mockReturnValue({ data: undefined });
    mocks.useQuery.mockReturnValue({ data: null, isLoading: false, error: null });

    render(<Probe />);

    expect(mocks.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["memory", null] }),
    );
  });
});
