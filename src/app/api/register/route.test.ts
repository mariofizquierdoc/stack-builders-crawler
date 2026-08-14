import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn(), create: vi.fn() } },
}));
vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn() },
}));

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { POST } from "./route";

function request(body: unknown) {
  return new Request("http://localhost/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/register", () => {
  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockReset();
    vi.mocked(prisma.user.create).mockReset();
    vi.mocked(bcrypt.hash).mockReset();
  });

  it("creates a user and returns 201 on success", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(bcrypt.hash).mockResolvedValue("hashed-password" as never);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "user_1",
      email: "new@example.com",
      hashedPassword: "hashed-password",
      name: null,
    } as never);

    const res = await POST(request({ email: "new@example.com", password: "password123" }));

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: "user_1", email: "new@example.com" });
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: { email: "new@example.com", hashedPassword: "hashed-password" },
    });
  });

  it("returns 409 when the email is already registered", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "existing",
      email: "taken@example.com",
      hashedPassword: "x",
      name: null,
    } as never);

    const res = await POST(request({ email: "taken@example.com", password: "password123" }));

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "Email already registered" });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid email", async () => {
    const res = await POST(request({ email: "not-an-email", password: "password123" }));

    expect(res.status).toBe(400);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("returns 400 for a too-short password", async () => {
    const res = await POST(request({ email: "new@example.com", password: "short" }));

    expect(res.status).toBe(400);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
