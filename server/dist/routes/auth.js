"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const prisma_js_1 = require("../lib/prisma.js");
const auth_js_1 = require("../middleware/auth.js");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
exports.authRouter = router;
const profileSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "El nombre completo es obligatorio"),
    phone: zod_1.z.string().min(1, "El teléfono es obligatorio"),
    sex: zod_1.z.enum(["FEMENINO", "MASCULINO", "OTRO", "PREFIERO_NO_DECIR"]),
    birthday: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
router.get("/me", auth_js_1.authMiddleware, async (req, res, next) => {
    try {
        if (!req.user?.email) {
            res.status(401).json({ error: "Token inválido" });
            return;
        }
        const client = await prisma_js_1.prisma.client.upsert({
            where: { email: req.user.email },
            create: {
                email: req.user.email,
                name: req.user.name ?? req.user.email.split("@")[0],
                phone: "",
                tier: "REGULAR",
            },
            update: {
                name: req.user.name ?? undefined,
            },
            select: {
                id: true,
                email: true,
                name: true,
                tier: true,
                phone: true,
                sex: true,
                birthday: true,
            },
        });
        res.json({ user: client });
    }
    catch (e) {
        next(e);
    }
});
router.patch("/profile", auth_js_1.authMiddleware, async (req, res, next) => {
    try {
        if (!req.user?.email) {
            res.status(401).json({ error: "Token inválido" });
            return;
        }
        const parsed = profileSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: "Error de validación", details: parsed.error.flatten() });
            return;
        }
        const birthdayDate = new Date(`${parsed.data.birthday}T12:00:00.000Z`);
        const client = await prisma_js_1.prisma.client.upsert({
            where: { email: req.user.email },
            create: {
                email: req.user.email,
                name: parsed.data.name,
                phone: parsed.data.phone,
                sex: parsed.data.sex,
                birthday: birthdayDate,
                tier: "REGULAR",
            },
            update: {
                name: parsed.data.name,
                phone: parsed.data.phone,
                sex: parsed.data.sex,
                birthday: birthdayDate,
            },
            select: {
                id: true,
                email: true,
                name: true,
                tier: true,
                phone: true,
                sex: true,
                birthday: true,
            },
        });
        res.json({ user: client });
    }
    catch (e) {
        next(e);
    }
});
//# sourceMappingURL=auth.js.map