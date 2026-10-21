import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

import type { SessionRecord } from "./session-store.ts";

export type RequestWithSession = Request & { sessionUser?: SessionRecord };

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): SessionRecord => {
  const req = ctx.switchToHttp().getRequest<RequestWithSession>();
  if (!req.sessionUser) {
    throw new Error("session absente");
  }
  return req.sessionUser;
});
