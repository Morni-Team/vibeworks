import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock } = vi.hoisted(() => {
  return {
    dbMock: {
      session: {
        findUnique: vi.fn(),
        delete: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
        deleteMany: vi.fn(),
      },
      user: {
        update: vi.fn(),
      }
    }
  };
});

vi.mock("@/lib/db", () => ({ db: dbMock }));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

import { validateSession } from "./session";
import { sha256 } from "@/lib/crypto";

describe("validateSession", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("returns null and swallows db error when deleting an expired session", async () => {
    const now = 1600000000000;
    vi.setSystemTime(now);

    const expiredSession = {
      id: "session-1",
      tokenHash: sha256("token123"),
      expiresAt: new Date(now - 1000), // expired 1s ago
      lastSeenAt: new Date(now - 10000),
      user: { active: true },
    };

    dbMock.session.findUnique.mockResolvedValueOnce(expiredSession);
    dbMock.session.delete.mockRejectedValueOnce(new Error("DB delete error"));

    const result = await validateSession("token123");

    expect(result).toBeNull();
    expect(dbMock.session.delete).toHaveBeenCalledWith({ where: { id: "session-1" } });
  });

  it("updates lastSeenAt and swallows db error if db.update throws", async () => {
    const now = 1600000000000;
    vi.setSystemTime(now);

    const validSession = {
      id: "session-2",
      tokenHash: sha256("token456"),
      expiresAt: new Date(now + 86400000), // expires in 1 day
      lastSeenAt: new Date(now - 6 * 60_000), // last seen 6 minutes ago (triggering update)
      user: { active: true, id: "user-1", role: "USER" },
    };

    dbMock.session.findUnique.mockResolvedValueOnce(validSession);
    dbMock.session.update.mockRejectedValueOnce(new Error("DB update error"));

    const result = await validateSession("token456");

    expect(result).toEqual({
      sessionId: "session-2",
      user: validSession.user,
    });
    expect(dbMock.session.update).toHaveBeenCalledWith({
      where: { id: "session-2" },
      data: { lastSeenAt: new Date(now) },
    });
  });
});
