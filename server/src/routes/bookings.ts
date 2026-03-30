import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { getAvailableSlots, type ClientTier } from "../services/availabilityService.js";
import { syncAppointmentCreated } from "../services/calendarSyncService.js";
import { optionalAuth, type AuthRequest } from "../middleware/auth.js";

const router = Router();

const createBookingSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  phone: z.string().min(1, "El teléfono es obligatorio"),
  email: z.string().email("Email inválido"),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  serviceId: z.string().min(1, "El servicio es obligatorio"),
  startTime: z.string().datetime({ message: "Hora de inicio inválida (use ISO 8601)" }),
  notes: z.string().optional(),
  clientTier: z.enum(["REGULAR", "SILVER", "GOLD"]).optional().default("REGULAR"),
});

router.post("/", optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const parsed = createBookingSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Error de validación", details: parsed.error.flatten() });
      return;
    }
    const { name, phone, email, birthday, serviceId, startTime, notes, clientTier } = parsed.data;
    let resolvedName = name;
    let resolvedEmail = email;
    let resolvedTier: ClientTier = clientTier as ClientTier;

    if (req.user?.email) {
      const authClient = await prisma.client.findUnique({
        where: { email: req.user.email },
        select: { email: true, name: true, tier: true },
      });
      if (authClient) {
        resolvedEmail = authClient.email;
        resolvedName = authClient.name || resolvedName;
        resolvedTier = authClient.tier as ClientTier;
      }
    }

    const start = new Date(startTime);
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { staff: true },
    });

    if (!service) {
      res.status(404).json({ error: "Servicio no encontrado" });
      return;
    }

    const slots = await getAvailableSlots(start, serviceId, resolvedTier);
    const slotStartIso = start.toISOString();
    const isAvailable = slots.some((s) => s.start === slotStartIso);

    if (!isAvailable) {
      res.status(409).json({ error: "El horario seleccionado ya no está disponible" });
      return;
    }

    const end = new Date(start.getTime() + service.durationMinutes * 60 * 1000);

    const birthdayDate = birthday ? new Date(birthday + "T12:00:00.000Z") : null;

    let client = await prisma.client.findUnique({ where: { email: resolvedEmail } });
    if (!client) {
      client = await prisma.client.create({
        data: {
          name: resolvedName,
          email: resolvedEmail,
          phone,
          birthday: birthdayDate,
          tier: resolvedTier,
        },
      });
    } else {
      await prisma.client.update({
        where: { id: client.id },
        data: { name: resolvedName, phone, birthday: birthdayDate, tier: resolvedTier },
      });
    }

    const appointment = await prisma.appointment.create({
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

    await prisma.client.update({
      where: { id: client.id },
      data: { visitCount: { increment: 1 } },
    });

    syncAppointmentCreated({
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
  } catch (e) {
    next(e);
  }
});

export { router as bookingsRouter };
