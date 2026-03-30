"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.optionalAuth = optionalAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jose_1 = require("jose");
const JWT_SECRET = process.env.JWT_SECRET ?? "";
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_ISSUER = SUPABASE_URL ? `${SUPABASE_URL}/auth/v1` : "";
const supabaseJwks = SUPABASE_ISSUER
    ? (0, jose_1.createRemoteJWKSet)(new URL(`${SUPABASE_ISSUER}/.well-known/jwks.json`))
    : null;
async function verifyAuthToken(token) {
    try {
        if (JWT_SECRET) {
            const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            return payload;
        }
    }
    catch {
        // if local JWT verification fails, continue with Supabase verification
    }
    if (!supabaseJwks || !SUPABASE_ISSUER) {
        return null;
    }
    try {
        const { payload } = await (0, jose_1.jwtVerify)(token, supabaseJwks, {
            issuer: SUPABASE_ISSUER,
            audience: "authenticated",
        });
        const rawName = payload.user_metadata
            ?.full_name
            ?? payload.user_metadata?.name;
        return {
            sub: String(payload.sub ?? ""),
            role: "client",
            email: payload.email ? String(payload.email) : undefined,
            name: rawName,
        };
    }
    catch {
        return null;
    }
}
async function authMiddleware(req, res, next) {
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
async function optionalAuth(req, _res, next) {
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
//# sourceMappingURL=auth.js.map