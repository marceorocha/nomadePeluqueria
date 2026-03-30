import { Response, NextFunction } from "express";
import type { AuthRequest } from "./auth.js";

const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

export function adminOnly(req: AuthRequest, res: Response, next: NextFunction): void {
  const email = req.user?.email?.toLowerCase();
  if (!email || !ADMIN_EMAILS.has(email)) {
    res.status(403).json({ error: "No tienes permisos de administrador" });
    return;
  }
  next();
}
