import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.get("/", async (_req, res, next) => {
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
        staff: s.staff,
      })),
    });
  } catch (e) {
    next(e);
  }
});

export { router as servicesRouter };
