import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { createRemoteJWKSet, jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET ?? "";
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_ISSUER = SUPABASE_URL ? `${SUPABASE_URL}/auth/v1` : "";
const supabaseJwks = SUPABASE_ISSUER
  ? createRemoteJWKSet(new URL(`${SUPABASE_ISSUER}/.well-known/jwks.json`))
  : null;

export interface JwtPayload {
  sub: string;
  role: "admin" | "client";
  email?: string;
  name?: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

async function verifyAuthToken(token: string): Promise<JwtPayload | null> {
  try {
    if (JWT_SECRET) {
      const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
      return payload;
    }
  } catch {
    // if local JWT verification fails, continue with Supabase verification
  }

  if (!supabaseJwks || !SUPABASE_ISSUER) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, supabaseJwks, {
      issuer: SUPABASE_ISSUER,
      audience: "authenticated",
    });

    const rawName = (payload.user_metadata as { full_name?: string; name?: string } | undefined)
      ?.full_name
      ?? (payload.user_metadata as { full_name?: string; name?: string } | undefined)?.name;

    return {
      sub: String(payload.sub ?? ""),
      role: "client",
      email: payload.email ? String(payload.email) : undefined,
      name: rawName,
    };
  } catch {
    return null;
  }
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: "Autorización faltante o inválida" });
    return;
  }

  const payload = await verifyAuthToken(token);
  if (payload) {
    req.user = payload;
    next();
    return;
  }
  res.status(401).json({ error: "Token inválido o expirado" });
}

export async function optionalAuth(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    next();
    return;
  }

  const payload = await verifyAuthToken(token);
  if (payload) {
    req.user = payload;
  }
  next();
}
