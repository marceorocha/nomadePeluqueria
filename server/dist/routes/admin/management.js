"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminManagementRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_js_1 = require("../../lib/prisma.js");
const auth_js_1 = require("../../middleware/auth.js");
const admin_js_1 = require("../../middleware/admin.js");
const router = (0, express_1.Router)();
exports.adminManagementRouter = router;
router.use(auth_js_1.authMiddleware, admin_js_1.adminOnly);
router.get("/clients", async (_req, res, next) => {
    try {
        const clients = await prisma_js_1.prisma.client.findMany({
            orderBy: { createdAt: "desc" },
        });
        res.json({ clients });
    }
    catch (e) {
        next(e);
    }
});
const clientSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    email: zod_1.z.string().email(),
    phone: zod_1.z.string().min(1),
    sex: zod_1.z.enum(["FEMENINO", "MASCULINO", "OTRO", "PREFIERO_NO_DECIR"]).optional().nullable(),
    birthday: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    tier: zod_1.z.enum(["REGULAR", "SILVER", "GOLD"]).default("REGULAR"),
});
router.post("/clients", async (req, res, next) => {
    try {
        const parsed = clientSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: "Error de validación", details: parsed.error.flatten() });
            return;
        }
        const birthday = parsed.data.birthday ? new Date(`${parsed.data.birthday}T12:00:00.000Z`) : null;
        const client = await prisma_js_1.prisma.client.create({
            data: { ...parsed.data, birthday, sex: parsed.data.sex ?? null },
        });
        res.status(201).json({ client });
    }
    catch (e) {
        next(e);
    }
});
router.put("/clients/:id", async (req, res, next) => {
    try {
        const parsed = clientSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: "Error de validación", details: parsed.error.flatten() });
            return;
        }
        const birthday = parsed.data.birthday ? new Date(`${parsed.data.birthday}T12:00:00.000Z`) : null;
        const client = await prisma_js_1.prisma.client.update({
            where: { id: req.params.id },
            data: { ...parsed.data, birthday, sex: parsed.data.sex ?? null },
        });
        res.json({ client });
    }
    catch (e) {
        next(e);
    }
});
router.get("/staff", async (_req, res, next) => {
    try {
        const staff = await prisma_js_1.prisma.staff.findMany({ orderBy: { name: "asc" } });
        res.json({ staff });
    }
    catch (e) {
        next(e);
    }
});
const staffSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    email: zod_1.z.string().email(),
    role: zod_1.z.string().min(1),
});
router.post("/staff", async (req, res, next) => {
    try {
        const parsed = staffSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: "Error de validación", details: parsed.error.flatten() });
            return;
        }
        const staff = await prisma_js_1.prisma.staff.create({ data: parsed.data });
        res.status(201).json({ staff });
    }
    catch (e) {
        next(e);
    }
});
router.get("/services", async (_req, res, next) => {
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
                staffId: s.staffId,
                staff: s.staff,
            })),
        });
    }
    catch (e) {
        next(e);
    }
});
const serviceSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    durationMinutes: zod_1.z.coerce.number().int().positive(),
    bufferMinutes: zod_1.z.coerce.number().int().min(0).default(0),
    price: zod_1.z.coerce.number().positive(),
    staffId: zod_1.z.string().min(1),
});
router.post("/services", async (req, res, next) => {
    try {
        const parsed = serviceSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: "Error de validación", details: parsed.error.flatten() });
            return;
        }
        const service = await prisma_js_1.prisma.service.create({
            data: {
                ...parsed.data,
                price: parsed.data.price,
            },
        });
        res.status(201).json({ service });
    }
    catch (e) {
        next(e);
    }
});
router.put("/services/:id", async (req, res, next) => {
    try {
        const parsed = serviceSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: "Error de validación", details: parsed.error.flatten() });
            return;
        }
        const service = await prisma_js_1.prisma.service.update({
            where: { id: req.params.id },
            data: {
                ...parsed.data,
                price: parsed.data.price,
            },
        });
        res.json({ service });
    }
    catch (e) {
        next(e);
    }
});
router.get("/bookings", async (_req, res, next) => {
    try {
        const bookings = await prisma_js_1.prisma.appointment.findMany({
            include: {
                client: true,
                service: true,
                staff: true,
            },
            orderBy: { startTime: "desc" },
        });
        res.json({ bookings });
    }
    catch (e) {
        next(e);
    }
});
const bookingManualSchema = zod_1.z.object({
    clientId: zod_1.z.string().min(1),
    serviceId: zod_1.z.string().min(1),
    staffId: zod_1.z.string().min(1),
    startTime: zod_1.z.string().datetime(),
    endTime: zod_1.z.string().datetime(),
    notes: zod_1.z.string().optional(),
    status: zod_1.z.enum(["PENDING", "CONFIRMED", "CANCELLED"]).default("CONFIRMED"),
});
router.post("/bookings/manual", async (req, res, next) => {
    try {
        const parsed = bookingManualSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: "Error de validación", details: parsed.error.flatten() });
            return;
        }
        const booking = await prisma_js_1.prisma.appointment.create({
            data: {
                ...parsed.data,
                startTime: new Date(parsed.data.startTime),
                endTime: new Date(parsed.data.endTime),
                notes: parsed.data.notes ?? null,
            },
        });
        res.status(201).json({ booking });
    }
    catch (e) {
        next(e);
    }
});
const bookingUpdateSchema = zod_1.z.object({
    startTime: zod_1.z.string().datetime(),
    endTime: zod_1.z.string().datetime(),
    notes: zod_1.z.string().optional().nullable(),
    status: zod_1.z.enum(["PENDING", "CONFIRMED", "CANCELLED"]),
});
router.put("/bookings/:id", async (req, res, next) => {
    try {
        const parsed = bookingUpdateSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: "Error de validación", details: parsed.error.flatten() });
            return;
        }
        const booking = await prisma_js_1.prisma.appointment.update({
            where: { id: req.params.id },
            data: {
                startTime: new Date(parsed.data.startTime),
                endTime: new Date(parsed.data.endTime),
                notes: parsed.data.notes ?? null,
                status: parsed.data.status,
            },
        });
        res.json({ booking });
    }
    catch (e) {
        next(e);
    }
});
//# sourceMappingURL=management.js.map