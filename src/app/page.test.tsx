// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "./page";
import { HNEntry } from "@/types";

const mockEntries: HNEntry[] = [
  { rank: 1, title: "A Short Story Title", url: "https://a.example.com", score: 50, comments: 10 },
  { rank: 2, title: "This Is A Very Long Story Title Indeed", url: "https://b.example.com", score: 200, comments: 5 },
  { rank: 3, title: "Another Short One", url: "https://c.example.com", score: 10, comments: 100 },
  { rank: 4, title: "Yet Another Extremely Long Winded Title Here", url: "https://d.example.com", score: 5, comments: 1 },
];

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function titleOrder() {
  return screen.getAllByRole("link").map((link) => link.textContent);
}

async function crawl(user: ReturnType<typeof userEvent.setup>) {
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => mockEntries });
  await user.click(screen.getByRole("button", { name: /Crawl Hacker News/ }));
  await screen.findByRole("table");
}

describe("Home page", () => {
  it("shows the placeholder before any crawl", () => {
    render(<Home />);
    expect(screen.getByText(/Crawl Hacker News.*to load stories/)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("fetches and renders entries when the crawl button is clicked", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await crawl(user);

    expect(fetchMock).toHaveBeenCalledWith("/api/crawl");
    expect(titleOrder()).toEqual(mockEntries.map((e) => e.title));
  });

  it("shows a loading indicator while the crawl is in flight", async () => {
    const user = userEvent.setup();
    render(<Home />);

    let resolveFetch: (value: unknown) => void;
    fetchMock.mockImplementationOnce(
      () => new Promise((resolve) => { resolveFetch = resolve; })
    );

    await user.click(screen.getByRole("button", { name: /Crawl Hacker News/ }));
    expect(screen.getByText(/Fetching stories/)).toBeInTheDocument();

    resolveFetch!({ ok: true, json: async () => mockEntries });
    await waitFor(() =>
      expect(screen.queryByText(/Fetching stories/)).not.toBeInTheDocument()
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("sorts by score and toggles direction on repeated clicks", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await crawl(user);

    const scoreButton = screen.getByRole("button", { name: /Score/ });

    await user.click(scoreButton);
    expect(titleOrder()).toEqual([
      mockEntries[1].title,
      mockEntries[0].title,
      mockEntries[2].title,
      mockEntries[3].title,
    ]);
    expect(scoreButton.textContent).toContain("↓");

    await user.click(scoreButton);
    expect(titleOrder()).toEqual([
      mockEntries[3].title,
      mockEntries[2].title,
      mockEntries[0].title,
      mockEntries[1].title,
    ]);
    expect(scoreButton.textContent).toContain("↑");
  });

  it("switches sort column when Comments is clicked", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await crawl(user);

    const scoreButton = screen.getByRole("button", { name: /Score/ });
    const commentsButton = screen.getByRole("button", { name: /Comments/ });

    await user.click(scoreButton);
    await user.click(commentsButton);

    expect(titleOrder()).toEqual([
      mockEntries[2].title,
      mockEntries[0].title,
      mockEntries[1].title,
      mockEntries[3].title,
    ]);
    expect(commentsButton.textContent).toContain("↓");
    expect(scoreButton.textContent).toContain("↕");
  });

  it("filters rows by title length", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await crawl(user);

    await user.click(screen.getByRole("radio", { name: /^> 5 words$/ }));
    expect(titleOrder()).toEqual([mockEntries[1].title, mockEntries[3].title]);

    await user.click(screen.getByRole("radio", { name: /≤ 5 words/ }));
    expect(titleOrder()).toEqual([mockEntries[0].title, mockEntries[2].title]);

    await user.click(screen.getByRole("radio", { name: /^All$/ }));
    expect(titleOrder()).toEqual(mockEntries.map((e) => e.title));
  });

  it("shows an error message and no table when the crawl fails", async () => {
    const user = userEvent.setup();
    render(<Home />);

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "boom" }),
    });

    await user.click(screen.getByRole("button", { name: /Crawl Hacker News/ }));

    expect(await screen.findByText(/Error: boom/)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
