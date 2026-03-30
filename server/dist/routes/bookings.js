"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_js_1 = require("../lib/prisma.js");
const availabilityService_js_1 = require("../services/availabilityService.js");
const calendarSyncService_js_1 = require("../services/calendarSyncService.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
exports.bookingsRouter = router;
const createBookingSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "El nombre es obligatorio"),
    phone: zod_1.z.string().min(1, "El teléfono es obligatorio"),
    email: zod_1.z.string().email("Email inválido"),
    birthday: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    serviceId: zod_1.z.string().min(1, "El servicio es obligatorio"),
    startTime: zod_1.z.string().datetime({ message: "Hora de inicio inválida (use ISO 8601)" }),
    notes: zod_1.z.string().optional(),
    clientTier: zod_1.z.enum(["REGULAR", "SILVER", "GOLD"]).optional().default("REGULAR"),
});
router.post("/", auth_js_1.optionalAuth, async (req, res, next) => {
    try {
        const parsed = createBookingSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: "Error de validación", details: parsed.error.flatten() });
            return;
        }
        const { name, phone, email, birthday, serviceId, startTime, notes, clientTier } = parsed.data;
        let resolvedName = name;
        let resolvedEmail = email;
        let resolvedTier = clientTier;
        if (req.user?.email) {
            const authClient = await prisma_js_1.prisma.client.findUnique({
                where: { email: req.user.email },
                select: { email: true, name: true, tier: true },
            });
            if (authClient) {
                resolvedEmail = authClient.email;
                resolvedName = authClient.name || resolvedName;
                resolvedTier = authClient.tier;
            }
        }
        const start = new Date(startTime);
        const service = await prisma_js_1.prisma.service.findUnique({
            where: { id: serviceId },
            include: { staff: true },
        });
        if (!service) {
            res.status(404).json({ error: "Servicio no encontrado" });
            return;
        }
        const slots = await (0, availabilityService_js_1.getAvailableSlots)(start, serviceId, resolvedTier);
        const slotStartIso = start.toISOString();
        const isAvailable = slots.some((s) => s.start === slotStartIso);
        if (!isAvailable) {
            res.status(409).json({ error: "El horario seleccionado ya no está disponible" });
            return;
        }
        const end = new Date(start.getTime() + service.durationMinutes * 60 * 1000);
        const birthdayDate = birthday ? new Date(birthday + "T12:00:00.000Z") : null;
        let client = await prisma_js_1.prisma.client.findUnique({ where: { email: resolvedEmail } });
        if (!client) {
            client = await prisma_js_1.prisma.client.create({
                data: {
                    name: resolvedName,
                    email: resolvedEmail,
                    phone,
                    birthday: birthdayDate,
                    tier: resolvedTier,
                },
            });
        }
        else {
            await prisma_js_1.prisma.client.update({
                where: { id: client.id },
                data: { name: resolvedName, phone, birthday: birthdayDate, tier: resolvedTier },
            });
        }
        const appointment = await prisma_js_1.prisma.appointment.create({
            data: {
                clientId: client.id,
                serviceId: service.id,
                staffId: service.staffId,
                startTime: start,
                endTime: end,
                status: "PENDING",
                notes: notes ?? null,
            },
            include: {
                service: true,
                staff: true,
                client: true,
            },
        });
        await prisma_js_1.prisma.client.update({
            where: { id: client.id },
            data: { visitCount: { increment: 1 } },
        });
        (0, calendarSyncService_js_1.syncAppointmentCreated)({
            id: appointment.id,
            startTime: appointment.startTime,
            endTime: appointment.endTime,
            status: appointment.status,
            googleEventId: appointment.googleEventId,
            caldavEventId: appointment.caldavEventId,
            service: { name: appointment.service.name },
            client: { name: appointment.client.name },
            staff: { name: appointment.staff.name },
        }).catch((err) => console.error("Calendar sync error:", err));
        res.status(201).json({
            id: appointment.id,
            start: appointment.startTime.toISOString(),
            end: appointment.endTime.toISOString(),
            status: appointment.status,
            service: appointment.service.name,
            staff: appointment.staff.name,
            client: {
                name: appointment.client.name,
                email: appointment.client.email,
                phone: appointment.client.phone,
            },
        });
    }
    catch (e) {
        next(e);
    }
});
//# sourceMappingURL=bookings.js.map