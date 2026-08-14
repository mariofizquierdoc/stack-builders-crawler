// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/auth", () => ({ auth: vi.fn(), signOut: vi.fn() }));

import { auth } from "@/auth";
import UserBar from "./UserBar";

const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

describe("UserBar", () => {
  beforeEach(() => {
    mockedAuth.mockReset();
  });

  it("shows a greeting with only the local part of the email", async () => {
    mockedAuth.mockResolvedValue({
      user: { email: "test@example.com" },
    });

    render(await UserBar());

    expect(screen.getByText("Hi test")).toBeInTheDocument();
    expect(screen.queryByText(/test@example\.com/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Log out/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Usage" })).toHaveAttribute("href", "/usage");
  });

  it("renders nothing when there is no session", async () => {
    mockedAuth.mockResolvedValue(null);

    const { container } = render(await UserBar());

    expect(container).toBeEmptyDOMElement();
  });
});
