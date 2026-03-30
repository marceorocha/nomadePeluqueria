import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { getGoogleAuthUrl, exchangeCodeForTokens } from "../../services/googleCalendarService.js";

const router = Router();

const REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ??
  `${process.env.API_BASE_URL ?? "http://localhost:3001"}/api/admin/calendar/google/callback`;

router.get("/status", async (_req, res, next) => {
  try {
    const connections = await prisma.calendarConnection.findMany({
      select: {
        provider: true,
        googleRefreshToken: true,
        caldavUrl: true,
        caldavUsername: true,
      },
    });
    const google = connections.find((c) => c.provider === "GOOGLE");
    const caldav = connections.find((c) => c.provider === "CALDAV");
    res.json({
      google: {
        connected: Boolean(google?.googleRefreshToken),
      },
      caldav: {
        connected: Boolean(caldav?.caldavUsername),
        url: caldav?.caldavUrl ?? null,
      },
    });
  } catch (e) {
    next(e);
  }
});

router.get("/google/auth-url", (_req, res, next) => {
  try {
    const url = getGoogleAuthUrl(REDIRECT_URI);
    res.json({ url });
  } catch (e) {
    next(e);
  }
});

const googleCallbackQuery = z.object({ code: z.string().min(1) });
router.get("/google/callback", async (req, res, next) => {
  try {
    const parsed = googleCallbackQuery.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).send("Código faltante o inválido");
      return;
    }
    const { code } = parsed.data;
    const tokens = await exchangeCodeForTokens(code, REDIRECT_URI);
    await prisma.calendarConnection.upsert({
      where: { provider: "GOOGLE" },
      create: {
        provider: "GOOGLE",
        googleRefreshToken: tokens.refreshToken,
        googleAccessToken: tokens.accessToken,
        googleExpiryDate: tokens.expiryDate ? new Date(tokens.expiryDate) : null,
      },
      update: {
        googleRefreshToken: tokens.refreshToken,
        googleAccessToken: tokens.accessToken,
        googleExpiryDate: tokens.expiryDate ? new Date(tokens.expiryDate) : null,
      },
    });
    res.redirect("/?calendar=google-connected");
  } catch (e) {
    next(e);
  }
});

const caldavBody = z.object({
  url: z.string().url().optional().default("https://caldav.icloud.com"),
  username: z.string().min(1, "El usuario (Apple ID) es obligatorio"),
  password: z.string().min(1, "La contraseña de aplicación es obligatoria"),
});
router.post("/caldav", async (req, res, next) => {
  try {
    const parsed = caldavBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Error de validación", details: parsed.error.flatten() });
      return;
    }
    const { url, username, password } = parsed.data;
    await prisma.calendarConnection.upsert({
      where: { provider: "CALDAV" },
      create: {
        provider: "CALDAV",
        caldavUrl: url,
        caldavUsername: username,
        caldavPassword: password,
      },
      update: {
        caldavUrl: url,
        caldavUsername: username,
        caldavPassword: password,
      },
    });
    res.json({ ok: true, message: "CalDAV (iCloud) conectado" });
  } catch (e) {
    next(e);
  }
});

export { router as calendarRouter };
