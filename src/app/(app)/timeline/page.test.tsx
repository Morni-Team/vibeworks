import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const { mockRequirePageUser, mockGetT, mockGetLocale, mockDbFindMany, mockLoadFeed, mockVisibleTo } = vi.hoisted(() => {
  return {
    mockRequirePageUser: vi.fn(),
    mockGetT: vi.fn(),
    mockGetLocale: vi.fn(),
    mockDbFindMany: vi.fn(),
    mockLoadFeed: vi.fn(),
    mockVisibleTo: vi.fn(),
  };
});

vi.mock("@/lib/auth/guard", () => ({
  requirePageUser: mockRequirePageUser,
}));

vi.mock("@/lib/i18n/server", () => ({
  getT: mockGetT,
  getLocale: mockGetLocale,
}));

vi.mock("@/lib/db", () => ({
  db: {
    project: {
      findMany: mockDbFindMany,
    },
  },
}));

vi.mock("@/lib/review", () => ({
  loadFeed: mockLoadFeed,
}));

vi.mock("@/lib/access", () => ({
  visibleTo: mockVisibleTo,
}));

vi.mock("@/components/review/Feed", () => ({
  Feed: () => <div data-testid="feed">Mock Feed</div>,
}));

vi.mock("lucide-react", () => ({
  History: () => <svg data-testid="icon-history" />,
  CalendarRange: () => <svg data-testid="icon-calendar-range" />,
}));

import TimelinePage, { generateMetadata } from "./page";

describe("TimelinePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateMetadata", () => {
    it("should return the correct title from translations", async () => {
      mockGetT.mockResolvedValue((key: string) => {
        if (key === "timeline.title") return "Translated Timeline Title";
        return key;
      });

      const metadata = await generateMetadata();

      expect(mockGetT).toHaveBeenCalledWith("review");
      expect(metadata).toEqual({ title: "Translated Timeline Title" });
    });
  });

  describe("TimelinePage Component", () => {
    it("should render timeline with correct initial data", async () => {
      mockRequirePageUser.mockResolvedValue({ id: "user1" });
      mockGetLocale.mockResolvedValue("en");
      mockGetT.mockResolvedValue((key: string) => key);
      mockVisibleTo.mockReturnValue({ mockQuery: true });
      mockDbFindMany.mockResolvedValue([
        { id: "proj1", name: "Project 1" },
        { id: "proj2", name: "Project 2" }
      ]);
      mockLoadFeed.mockResolvedValue([
        { id: "item1", at: new Date("2023-01-01").toISOString() },
        { id: "item2", at: new Date("2023-01-02").toISOString() }
      ]);

      const element = await TimelinePage({ searchParams: Promise.resolve({}) });
      const html = renderToStaticMarkup(element);

      expect(mockRequirePageUser).toHaveBeenCalled();
      expect(mockGetLocale).toHaveBeenCalled();
      expect(mockGetT).toHaveBeenCalledWith("review");
      expect(mockVisibleTo).toHaveBeenCalledWith("user1");
      expect(mockDbFindMany).toHaveBeenCalledWith({
        where: { mockQuery: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" }
      });
      expect(mockLoadFeed).toHaveBeenCalledWith("user1", "en", {
        to: undefined,
        projectId: undefined,
        limit: 100
      });

      expect(html).toContain("Project 1");
      expect(html).toContain("Project 2");
      expect(html).toContain("timeline.title");
      expect(html).toContain("Mock Feed");
      // Should not contain 'timeline.older' link since length < 100
      expect(html).not.toContain("timeline.older");
    });

    it("should handle project filter and 'before' search parameter", async () => {
      mockRequirePageUser.mockResolvedValue({ id: "user1" });
      mockGetLocale.mockResolvedValue("en");
      mockGetT.mockResolvedValue((key: string) => key);
      mockVisibleTo.mockReturnValue({});
      mockDbFindMany.mockResolvedValue([
        { id: "proj1", name: "Project 1" }
      ]);
      mockLoadFeed.mockResolvedValue([]);

      const element = await TimelinePage({
        searchParams: Promise.resolve({ project: "proj1", before: "2023-01-01T00:00:00.000Z" })
      });
      const html = renderToStaticMarkup(element);

      expect(mockLoadFeed).toHaveBeenCalledWith("user1", "en", {
        to: new Date("2023-01-01T00:00:00.000Z"),
        projectId: "proj1",
        limit: 100
      });
    });

    it("should render 'older' link if feed items equal PAGE limit", async () => {
      mockRequirePageUser.mockResolvedValue({ id: "user1" });
      mockGetLocale.mockResolvedValue("en");
      mockGetT.mockResolvedValue((key: string) => key);
      mockVisibleTo.mockReturnValue({});
      mockDbFindMany.mockResolvedValue([]);

      const mockItems = Array.from({ length: 100 }).map((_, i) => ({
        id: `item${i}`,
        at: new Date(`2023-01-${(i % 30) + 1}`).toISOString()
      }));
      mockLoadFeed.mockResolvedValue(mockItems);

      const element = await TimelinePage({ searchParams: Promise.resolve({}) });
      const html = renderToStaticMarkup(element);

      expect(html).toContain("timeline.older");
    });

    it("should ignore invalid 'before' search parameter", async () => {
      mockRequirePageUser.mockResolvedValue({ id: "user1" });
      mockGetLocale.mockResolvedValue("en");
      mockGetT.mockResolvedValue((key: string) => key);
      mockVisibleTo.mockReturnValue({});
      mockDbFindMany.mockResolvedValue([]);
      mockLoadFeed.mockResolvedValue([]);

      const element = await TimelinePage({
        searchParams: Promise.resolve({ before: "invalid-date" })
      });
      const html = renderToStaticMarkup(element);

      expect(mockLoadFeed).toHaveBeenCalledWith("user1", "en", {
        to: undefined,
        projectId: undefined,
        limit: 100
      });
    });

    it("should ignore invalid 'project' search parameter", async () => {
      mockRequirePageUser.mockResolvedValue({ id: "user1" });
      mockGetLocale.mockResolvedValue("en");
      mockGetT.mockResolvedValue((key: string) => key);
      mockVisibleTo.mockReturnValue({});
      mockDbFindMany.mockResolvedValue([
        { id: "proj1", name: "Project 1" }
      ]);
      mockLoadFeed.mockResolvedValue([]);

      const element = await TimelinePage({
        searchParams: Promise.resolve({ project: "non-existent-proj" })
      });
      const html = renderToStaticMarkup(element);

      // projectId should be undefined because "non-existent-proj" is not in the db response
      expect(mockLoadFeed).toHaveBeenCalledWith("user1", "en", {
        to: undefined,
        projectId: undefined,
        limit: 100
      });
    });
  });
});
