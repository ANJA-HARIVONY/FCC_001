import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";

import { AppModule } from "./app.module.ts";
import { securityHeaders } from "./security/headers.ts";

const app = await NestFactory.create(AppModule, { logger: ["error", "warn", "log"] });
app.use(cookieParser());
app.use(securityHeaders);
app.enableCors({
  origin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
  credentials: true,
});
const port = Number(process.env.PORT ?? 4000);
await app.listen(port);
