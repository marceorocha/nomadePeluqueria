"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.availabilityRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const availabilityService_js_1 = require("../services/availabilityService.js");
const auth_js_1 = require("../middleware/auth.js");
const prisma_js_1 = require("../lib/prisma.js");
const router = (0, express_1.Router)();
exports.availabilityRouter = router;
const querySchema = zod_1.z.object({
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    serviceId: zod_1.z.string().min(1),
    clientTier: zod_1.z.enum(["REGULAR", "SILVER", "GOLD"]).optional().default("REGULAR"),
});
router.get("/", auth_js_1.optionalAuth, async (req, res, next) => {
    try {
        const parsed = querySchema.safeParse(req.query);
        if (!parsed.success) {
            res.status(400).json({ error: "Consulta inválida", details: parsed.error.flatten() });
            return;
        }
        const { date, serviceId, clientTier } = parsed.data;
        let resolvedTier = clientTier;
        if (req.user?.email) {
            const client = await prisma_js_1.prisma.client.findUnique({
                where: { email: req.user.email },
                select: { tier: true },
            });
            if (client?.tier) {
                resolvedTier = client.tier;
            }
        }
        const dateObj = new Date(date + "T12:00:00.000Z");
        const slots = await (0, availabilityService_js_1.getAvailableSlots)(dateObj, serviceId, resolvedTier);
        res.json({ slots });
    }
    catch (e) {
        next(e);
    }
});
//# sourceMappingURL=availability.js.map