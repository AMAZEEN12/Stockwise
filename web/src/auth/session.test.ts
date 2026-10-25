import { afterEach, describe, expect, it } from "vitest";
import { clearSession, readSession, saveSession } from "./session";
import type { Session } from "../models/responses/auth.response";

const session: Session = {
  accessToken: "demo-token",
  tokenType: "Bearer",
  expiresAt: new Date(Date.now() + 3600_000).toISOString(),
  user: {
    id: "1",
    displayName: "Demo Owner",
    email: "owner@stockwise.demo",
    role: "OWNER",
  },
};
afterEach(() => {
  clearSession();
  sessionStorage.clear();
});
describe("tab session", () => {
  it("restores a valid session and clears it on sign out", () => {
    saveSession(session);
    expect(readSession()?.user.role).toBe("OWNER");
    clearSession();
    expect(readSession()).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });
  it("refuses expired and malformed saved sessions", () => {
    saveSession({ ...session, expiresAt: "2020-01-01T00:00:00Z" });
    expect(readSession()).toBeNull();
    sessionStorage.setItem(
      "stockwise.session",
      JSON.stringify({ accessToken: "x", expiresAt: "2099-01-01T00:00:00Z" }),
    );
    expect(readSession()).toBeNull();
    sessionStorage.setItem("stockwise.session", "{bad json");
    expect(readSession()).toBeNull();
  });
});
