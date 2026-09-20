import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { checkMfaEmailCode, MFA_EMAIL_CODE_MINUTES, alertLogin } from "./loginAlert";
import { sha256 } from "@/lib/crypto";

const { dbMock, sendMailMock, smtpReadyMock, notifyUserMock } = vi.hoisted(() => {
  return {
    dbMock: {
      mfaPending: { update: vi.fn() },
      loginCheck: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
      session: { deleteMany: vi.fn() },
    },
    sendMailMock: vi.fn(),
    smtpReadyMock: vi.fn(),
    notifyUserMock: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({ db: dbMock }));
vi.mock("@/lib/notify/mail", () => ({
  sendMail: sendMailMock,
  smtpReady: smtpReadyMock,
}));
vi.mock("@/lib/notify", () => ({
  appLink: vi.fn((path) => `https://test.com${path}`),
  notifyUser: notifyUserMock,
}));
vi.mock("@/lib/clientIp", () => ({
  clientIp: vi.fn(() => "127.0.0.1"),
}));

const codeHash = (code: string) => sha256(`vw-mfa-mail:${code.replace(/\D/g, "")}`);

describe("checkMfaEmailCode", () => {
  it("returns true for a correct, fresh code", () => {
    const code = "123456";
    const pending = {
      emailCodeHash: codeHash(code),
      emailCodeAt: new Date(Date.now() - 1000), // 1 second ago
    };
    expect(checkMfaEmailCode(pending, code)).toBe(true);
  });

  it("returns false if emailCodeHash is missing", () => {
    const code = "123456";
    const pending = {
      emailCodeHash: null,
      emailCodeAt: new Date(),
    };
    expect(checkMfaEmailCode(pending, code)).toBe(false);
  });

  it("returns false if emailCodeAt is missing", () => {
    const code = "123456";
    const pending = {
      emailCodeHash: codeHash(code),
      emailCodeAt: null,
    };
    expect(checkMfaEmailCode(pending, code)).toBe(false);
  });

  it("returns false if the code has expired", () => {
    const code = "123456";
    const pending = {
      emailCodeHash: codeHash(code),
      emailCodeAt: new Date(Date.now() - (MFA_EMAIL_CODE_MINUTES + 1) * 60_000),
    };
    expect(checkMfaEmailCode(pending, code)).toBe(false);
  });

  it("returns false if the code is incorrect", () => {
    const code = "123456";
    const wrongCode = "654321";
    const pending = {
      emailCodeHash: codeHash(code),
      emailCodeAt: new Date(),
    };
    expect(checkMfaEmailCode(pending, wrongCode)).toBe(false);
  });
});

describe("alertLogin", () => {
  let consoleWarnSpy: any;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    consoleWarnSpy.mockRestore();
  });

  it("handles standard Error when sendMail fails", async () => {
    const req = { headers: { get: vi.fn(() => "test-agent") } } as any;
    const user = { id: "u1", email: "test@example.com", locale: "en" };

    smtpReadyMock.mockResolvedValueOnce(true);
    sendMailMock.mockRejectedValueOnce(new Error("SMTP connection failed"));

    await alertLogin(user, "email", req);

    expect(consoleWarnSpy).toHaveBeenCalledWith("[login-check] Mail:", "SMTP connection failed");
  });

  it("handles non-Error rejection when sendMail fails", async () => {
    const req = { headers: { get: vi.fn(() => "test-agent") } } as any;
    const user = { id: "u1", email: "test@example.com", locale: "en" };

    smtpReadyMock.mockResolvedValueOnce(true);
    sendMailMock.mockRejectedValueOnce("Unknown error string");

    await alertLogin(user, "email", req);

    expect(consoleWarnSpy).toHaveBeenCalledWith("[login-check] Mail:", "Unknown error string");
  });
});
