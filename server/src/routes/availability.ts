import { Router } from "express";
import { z } from "zod";
import { getAvailableSlots, type ClientTier } from "../services/availabilityService.js";
import { optionalAuth, type AuthRequest } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  serviceId: z.string().min(1),
  clientTier: z.enum(["REGULAR", "SILVER", "GOLD"]).optional().default("REGULAR"),
});

router.get("/", optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Consulta inválida", details: parsed.error.flatten() });
      return;
    }
    const { date, serviceId, clientTier } = parsed.data;
    let resolvedTier: ClientTier = clientTier;
    if (req.user?.email) {
      const client = await prisma.client.findUnique({
        where: { email: req.user.email },
        select: { tier: true },
      });
      if (client?.tier) {
        resolvedTier = client.tier as ClientTier;
      }
    }
    const dateObj = new Date(date + "T12:00:00.000Z");
    const slots = await getAvailableSlots(dateObj, serviceId, resolvedTier);
    res.json({ slots });
  } catch (e) {
    next(e);
  }
});

export { router as availabilityRouter };
