// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    usageEvent: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import UsagePage from "./page";

const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;
const mockedGroupBy = prisma.usageEvent.groupBy as unknown as ReturnType<typeof vi.fn>;
const mockedFindMany = prisma.usageEvent.findMany as unknown as ReturnType<typeof vi.fn>;
const mockedRedirect = redirect as unknown as ReturnType<typeof vi.fn>;

describe("UsagePage", () => {
  beforeEach(() => {
    mockedAuth.mockReset();
    mockedGroupBy.mockReset();
    mockedFindMany.mockReset();
    mockedRedirect.mockClear();
  });

  it("redirects to /login and skips the query when there is no session", async () => {
    mockedAuth.mockResolvedValue(null);

    await expect(UsagePage()).rejects.toThrow();

    expect(mockedRedirect).toHaveBeenCalledWith("/login");
    expect(mockedFindMany).not.toHaveBeenCalled();
  });

  it("renders summary counts and the event table for a logged-in user", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user_1", email: "test@example.com" } });
    mockedGroupBy.mockImplementation(({ by }: { by: string[] }) => {
      if (by[0] === "filter") {
        return Promise.resolve([
          { filter: "all", _count: { _all: 2 } },
          { filter: "long", _count: { _all: 1 } },
        ]);
      }
      return Promise.resolve([{ sortKey: "score", _count: { _all: 3 } }]);
    });
    mockedFindMany.mockResolvedValue([
      {
        id: "evt_1",
        userId: "user_1",
        filter: "long",
        sortKey: "score",
        sortDir: "asc",
        createdAt: new Date("2026-01-01T12:00:00Z"),
      },
      {
        id: "evt_2",
        userId: "user_1",
        filter: "all",
        sortKey: null,
        sortDir: "desc",
        createdAt: new Date("2026-01-01T11:00:00Z"),
      },
    ]);

    render(await UsagePage());

    const filterSummary = screen.getByText("Filter usage").closest("div")!;
    const sortSummary = screen.getByText("Sort usage").closest("div")!;

    // filter summary: all=2, long=1, short=0 (never used)
    expect(within(filterSummary).getByText("All").nextSibling?.textContent).toBe("2");
    expect(within(filterSummary).getByText("> 5 words").nextSibling?.textContent).toBe("1");
    expect(within(filterSummary).getByText("≤ 5 words").nextSibling?.textContent).toBe("0");

    // sort summary: score=3, comments=0, not sorted=0
    expect(within(sortSummary).getByText("Score").nextSibling?.textContent).toBe("3");
    expect(within(sortSummary).getByText("Comments").nextSibling?.textContent).toBe("0");
    expect(within(sortSummary).getByText("Not sorted").nextSibling?.textContent).toBe("0");

    expect(screen.getAllByRole("row")).toHaveLength(3); // header + 2 events
    expect(screen.getByRole("link", { name: /Back to crawler/ })).toHaveAttribute("href", "/");

    expect(mockedFindMany).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  });

  it("shows an empty state when there is no usage yet", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user_1", email: "test@example.com" } });
    mockedGroupBy.mockResolvedValue([]);
    mockedFindMany.mockResolvedValue([]);

    render(await UsagePage());

    expect(screen.getByText(/No usage recorded yet/)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
