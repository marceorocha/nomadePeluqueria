"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminOnly = adminOnly;
const ADMIN_EMAILS = new Set((process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean));
function adminOnly(req, res, next) {
    const email = req.user?.email?.toLowerCase();
    if (!email || !ADMIN_EMAILS.has(email)) {
        res.status(403).json({ error: "No tienes permisos de administrador" });
        return;
    }
    next();
}
//# sourceMappingURL=admin.js.map