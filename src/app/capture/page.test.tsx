import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const { mockRedirect, mockRequirePageUser, mockIsSetupDone, mockGetT } = vi.hoisted(() => {
  return {
    mockRedirect: vi.fn(),
    mockRequirePageUser: vi.fn(),
    mockIsSetupDone: vi.fn(),
    mockGetT: vi.fn(),
  };
});

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

vi.mock("@/lib/auth/guard", () => ({
  requirePageUser: mockRequirePageUser,
}));

vi.mock("@/lib/settings", () => ({
  isSetupDone: mockIsSetupDone,
}));

vi.mock("@/lib/i18n/server", () => ({
  getT: mockGetT,
}));

vi.mock("@/components/CapturePanel", () => ({
  CapturePanel: () => <div data-testid="capture-panel">Mock CapturePanel</div>,
}));

import CapturePage, { generateMetadata } from "./page";

describe("CapturePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateMetadata", () => {
    it("should return the correct title from translations", async () => {
      mockGetT.mockResolvedValue((key: string) => {
        if (key === "capture.title") return "Translated Capture Title";
        return key;
      });

      const metadata = await generateMetadata();

      expect(mockGetT).toHaveBeenCalledWith("shell");
      expect(metadata).toEqual({ title: "Translated Capture Title" });
    });
  });

  describe("CapturePage Component", () => {
    it("should redirect to /setup if setup is not done", async () => {
      mockIsSetupDone.mockResolvedValue(false);
      mockRedirect.mockImplementation(() => {
        throw new Error("NEXT_REDIRECT"); // Simulating next/navigation redirect throw
      });

      try {
          await CapturePage();
      } catch (e: any) {
          expect(e.message).toBe("NEXT_REDIRECT");
      }

      expect(mockIsSetupDone).toHaveBeenCalled();
      expect(mockRedirect).toHaveBeenCalledWith("/setup");
      expect(mockRequirePageUser).not.toHaveBeenCalled();
    });

    it("should require user and render CapturePanel if setup is done", async () => {
      mockIsSetupDone.mockResolvedValue(true);
      mockRequirePageUser.mockResolvedValue({ id: "user1" });

      const element = await CapturePage();
      const html = renderToStaticMarkup(element);

      expect(mockIsSetupDone).toHaveBeenCalled();
      expect(mockRequirePageUser).toHaveBeenCalled();
      expect(html).toContain("capture-panel");
    });
  });
});
