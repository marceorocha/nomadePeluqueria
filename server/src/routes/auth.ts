import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";
import { z } from "zod";

const router = Router();
const profileSchema = z.object({
  name: z.string().min(1, "El nombre completo es obligatorio"),
  phone: z.string().min(1, "El teléfono es obligatorio"),
  sex: z.enum(["FEMENINO", "MASCULINO", "OTRO", "PREFIERO_NO_DECIR"]),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

router.get("/me", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user?.email) {
      res.status(401).json({ error: "Token inválido" });
      return;
    }

    const client = await prisma.client.upsert({
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
  } catch (e) {
    next(e);
  }
});

router.patch("/profile", authMiddleware, async (req: AuthRequest, res, next) => {
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

    const client = await prisma.client.upsert({
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
  } catch (e) {
    next(e);
  }
});

export { router as authRouter };
