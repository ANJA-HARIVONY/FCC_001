import type { CookieOptions, Response } from "express";

export const SESSION_COOKIE = "fcc_session";
export const CSRF_COOKIE = "fcc_csrf";

export function cookieBase(): CookieOptions {
  return {
    sameSite: "lax",
    secure: process.env.SESSION_COOKIE_SECURE === "true",
    path: "/",
  };
}

export function setSessionCookie(res: Response, sessionId: string): void {
  res.cookie(SESSION_COOKIE, sessionId, { ...cookieBase(), httpOnly: true });
}

export function setCsrfCookie(res: Response, token: string): void {
  res.cookie(CSRF_COOKIE, token, { ...cookieBase(), httpOnly: false });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { ...cookieBase(), httpOnly: true });
}
