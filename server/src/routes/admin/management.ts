import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { authMiddleware } from "../../middleware/auth.js";
import { adminOnly } from "../../middleware/admin.js";

const router = Router();
router.use(authMiddleware, adminOnly);

router.get("/clients", async (_req, res, next) => {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json({ clients });
  } catch (e) {
    next(e);
  }
});

const clientSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  sex: z.enum(["FEMENINO", "MASCULINO", "OTRO", "PREFIERO_NO_DECIR"]).optional().nullable(),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  tier: z.enum(["REGULAR", "SILVER", "GOLD"]).default("REGULAR"),
});

router.post("/clients", async (req, res, next) => {
  try {
    const parsed = clientSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Error de validación", details: parsed.error.flatten() });
      return;
    }
    const birthday = parsed.data.birthday ? new Date(`${parsed.data.birthday}T12:00:00.000Z`) : null;
    const client = await prisma.client.create({
      data: { ...parsed.data, birthday, sex: parsed.data.sex ?? null },
    });
    res.status(201).json({ client });
  } catch (e) {
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
    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: { ...parsed.data, birthday, sex: parsed.data.sex ?? null },
    });
    res.json({ client });
  } catch (e) {
    next(e);
  }
});

router.get("/staff", async (_req, res, next) => {
  try {
    const staff = await prisma.staff.findMany({ orderBy: { name: "asc" } });
    res.json({ staff });
  } catch (e) {
    next(e);
  }
});

const staffSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.string().min(1),
});

router.post("/staff", async (req, res, next) => {
  try {
    const parsed = staffSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Error de validación", details: parsed.error.flatten() });
      return;
    }
    const staff = await prisma.staff.create({ data: parsed.data });
    res.status(201).json({ staff });
  } catch (e) {
    next(e);
  }
});

router.get("/services", async (_req, res, next) => {
  try {
    const services = await prisma.service.findMany({
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
  } catch (e) {
    next(e);
  }
});

const serviceSchema = z.object({
  name: z.string().min(1),
  durationMinutes: z.coerce.number().int().positive(),
  bufferMinutes: z.coerce.number().int().min(0).default(0),
  price: z.coerce.number().positive(),
  staffId: z.string().min(1),
});

router.post("/services", async (req, res, next) => {
  try {
    const parsed = serviceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Error de validación", details: parsed.error.flatten() });
      return;
    }
    const service = await prisma.service.create({
      data: {
        ...parsed.data,
        price: parsed.data.price,
      },
    });
    res.status(201).json({ service });
  } catch (e) {
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
    const service = await prisma.service.update({
      where: { id: req.params.id },
      data: {
        ...parsed.data,
        price: parsed.data.price,
      },
    });
    res.json({ service });
  } catch (e) {
    next(e);
  }
});

router.get("/bookings", async (_req, res, next) => {
  try {
    const bookings = await prisma.appointment.findMany({
      include: {
        client: true,
        service: true,
        staff: true,
      },
      orderBy: { startTime: "desc" },
    });
    res.json({ bookings });
  } catch (e) {
    next(e);
  }
});

const bookingManualSchema = z.object({
  clientId: z.string().min(1),
  serviceId: z.string().min(1),
  staffId: z.string().min(1),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  notes: z.string().optional(),
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED"]).default("CONFIRMED"),
});

router.post("/bookings/manual", async (req, res, next) => {
  try {
    const parsed = bookingManualSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Error de validación", details: parsed.error.flatten() });
      return;
    }
    const booking = await prisma.appointment.create({
      data: {
        ...parsed.data,
        startTime: new Date(parsed.data.startTime),
        endTime: new Date(parsed.data.endTime),
        notes: parsed.data.notes ?? null,
      },
    });
    res.status(201).json({ booking });
  } catch (e) {
    next(e);
  }
});

const bookingUpdateSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  notes: z.string().optional().nullable(),
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED"]),
});

router.put("/bookings/:id", async (req, res, next) => {
  try {
    const parsed = bookingUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Error de validación", details: parsed.error.flatten() });
      return;
    }
    const booking = await prisma.appointment.update({
      where: { id: req.params.id },
      data: {
        startTime: new Date(parsed.data.startTime),
        endTime: new Date(parsed.data.endTime),
        notes: parsed.data.notes ?? null,
        status: parsed.data.status,
      },
    });
    res.json({ booking });
  } catch (e) {
    next(e);
  }
});

export { router as adminManagementRouter };
