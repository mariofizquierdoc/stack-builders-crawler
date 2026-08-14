import { describe, it, expect, vi, beforeEach } from "vitest";
import { verifyCredentials } from "./verifyCredentials";

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));
vi.mock("bcryptjs", () => ({
  default: { compare: vi.fn() },
}));

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const mockUser = {
  id: "user_1",
  email: "test@example.com",
  hashedPassword: "hashed-password",
  name: null,
};

describe("verifyCredentials", () => {
  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockReset();
    vi.mocked(bcrypt.compare).mockReset();
  });

  it("returns the user when email and password match", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const result = await verifyCredentials({
      email: "test@example.com",
      password: "correct-password",
    });

    expect(result).toEqual({ id: "user_1", email: "test@example.com", name: null });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "test@example.com" },
    });
  });

  it("returns null for an unknown email, but still runs a bcrypt compare (timing-attack resistance)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    const result = await verifyCredentials({
      email: "nobody@example.com",
      password: "whatever",
    });

    expect(result).toBeNull();
    // Runs against a fixed dummy hash (not user-derived) so the unknown-email
    // path takes comparable time to the wrong-password path and doesn't leak
    // which emails are registered via response timing.
    expect(bcrypt.compare).toHaveBeenCalledWith("whatever", expect.any(String));
  });

  it("returns null for a wrong password", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    const result = await verifyCredentials({
      email: "test@example.com",
      password: "wrong-password",
    });

    expect(result).toBeNull();
  });

  it("returns null and skips the DB lookup when fields are missing", async () => {
    const result = await verifyCredentials({ email: undefined, password: undefined });

    expect(result).toBeNull();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
