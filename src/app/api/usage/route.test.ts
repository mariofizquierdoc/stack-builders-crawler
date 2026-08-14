import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { usageEvent: { create: vi.fn() } },
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { POST } from "./route";

const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

function request(body: unknown) {
  return new Request("http://localhost/api/usage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/usage", () => {
  beforeEach(() => {
    mockedAuth.mockReset();
    vi.mocked(prisma.usageEvent.create).mockReset();
  });

  it("returns 401 and skips the DB when there is no session", async () => {
    mockedAuth.mockResolvedValue(null);

    const res = await POST(request({ filter: "all", sortKey: null, sortDir: "desc" }));

    expect(res.status).toBe(401);
    expect(prisma.usageEvent.create).not.toHaveBeenCalled();
  });

  it("creates a usage event and returns 201 for a valid, authenticated request", async () => {
    mockedAuth.mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
    } as never);
    vi.mocked(prisma.usageEvent.create).mockResolvedValue({} as never);

    const res = await POST(
      request({ filter: "long", sortKey: "score", sortDir: "asc" })
    );

    expect(res.status).toBe(201);
    expect(prisma.usageEvent.create).toHaveBeenCalledWith({
      data: { userId: "user_1", filter: "long", sortKey: "score", sortDir: "asc" },
    });
  });

  it("returns 400 for an invalid filter value", async () => {
    mockedAuth.mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
    } as never);

    const res = await POST(
      request({ filter: "nonsense", sortKey: null, sortDir: "desc" })
    );

    expect(res.status).toBe(400);
    expect(prisma.usageEvent.create).not.toHaveBeenCalled();
  });
});
