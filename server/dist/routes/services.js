"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.servicesRouter = void 0;
const express_1 = require("express");
const prisma_js_1 = require("../lib/prisma.js");
const router = (0, express_1.Router)();
exports.servicesRouter = router;
router.get("/", async (_req, res, next) => {
    try {
        const services = await prisma_js_1.prisma.service.findMany({
            include: { staff: { select: { id: true, name: true } } },
            orderBy: { name: "asc" },
        });
        res.json({
            services: services.map((s) => ({
                id: s.id,
                name: s.name,
                durationMinutes: s.durationMinutes,
                bufferMinutes: s.bufferMinutes,
                price: Number(s.price),
                staff: s.staff,
            })),
        });
    }
    catch (e) {
        next(e);
    }
});
//# sourceMappingURL=services.js.map