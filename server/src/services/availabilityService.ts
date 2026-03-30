import { prisma } from "../lib/prisma.js";

export type ClientTier = "REGULAR" | "SILVER" | "GOLD";

const TIER_DAYS_AHEAD: Record<ClientTier, number> = {
  REGULAR: 7,
  SILVER: 10,
  GOLD: 14,
};

const SLOT_STEP_MINUTES = 15;

export interface TimeSlot {
  start: string; // ISO datetime
  end: string;
}

/**
 * Returns the maximum date a client can book based on tier.
 */
function getMaxBookingDate(clientTier: ClientTier): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const max = new Date(today);
  max.setDate(max.getDate() + TIER_DAYS_AHEAD[clientTier]);
  return max;
}

/**
 * Parse "HH:mm" to minutes since midnight for a given date.
 */
function parseTimeToDate(date: Date, timeStr: string): Date {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

/**
 * Given a date, serviceId, and clientTier, returns available time slots
 * respecting working hours, existing bookings, buffer times, and tier visibility.
 */
export async function getAvailableSlots(
  date: Date,
  serviceId: string,
  clientTier: ClientTier
): Promise<TimeSlot[]> {
  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxBooking = getMaxBookingDate(clientTier);

  if (dateOnly < today) {
    return [];
  }
  if (dateOnly > maxBooking) {
    return [];
  }

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: { staff: true },
  });

  if (!service) {
    return [];
  }

  const staffId = service.staffId;
  const durationMs = service.durationMinutes * 60 * 1000;
  const bufferMs = (service.bufferMinutes ?? 0) * 60 * 1000;
  const dayOfWeek = dateOnly.getDay(); // 0 Sun .. 6 Sat

  const workingHours = await prisma.workingHours.findUnique({
    where: { staffId_dayOfWeek: { staffId, dayOfWeek } },
  });

  if (!workingHours) {
    return [];
  }

  const dayStart = parseTimeToDate(dateOnly, workingHours.startTime);
  const dayEnd = parseTimeToDate(dateOnly, workingHours.endTime);

  const dayStartMs = dayStart.getTime();
  const dayEndMs = dayEnd.getTime();

  const startOfDay = new Date(dateOnly);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(dateOnly);
  endOfDay.setHours(23, 59, 59, 999);

  const [appointments, blockedSlots] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        staffId,
        startTime: { gte: startOfDay },
        endTime: { lte: endOfDay },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      orderBy: { startTime: "asc" },
    }),
    prisma.blockedSlot.findMany({
      where: {
        staffId,
        startTime: { lt: endOfDay },
        endTime: { gt: startOfDay },
      },
    }),
  ]);

  const stepMs = SLOT_STEP_MINUTES * 60 * 1000;
  const slots: TimeSlot[] = [];
  let cursor = dayStartMs;

  while (cursor + durationMs <= dayEndMs) {
    const slotStart = new Date(cursor);
    const slotEnd = new Date(cursor + durationMs);

    const slotStartMs = slotStart.getTime();
    const slotEndMs = slotEnd.getTime();

    let allowed = true;

    for (const block of blockedSlots) {
      const bStart = block.startTime.getTime();
      const bEnd = block.endTime.getTime();
      const overlaps = slotStartMs < bEnd && slotEndMs > bStart;

      if (!overlaps) continue;

      if (block.tierRequired === null) {
        allowed = false;
        break;
      }
      if (block.tierRequired === "GOLD" && clientTier !== "GOLD") {
        allowed = false;
        break;
      }
    }

    if (!allowed) {
      cursor += stepMs;
      continue;
    }

    for (const apt of appointments) {
      const aptStart = apt.startTime.getTime();
      const aptEnd = apt.endTime.getTime();
      const aptEndWithBuffer = aptEnd + bufferMs;
      if (slotStartMs < aptEndWithBuffer && slotEndMs > aptStart) {
        allowed = false;
        break;
      }
    }

    if (allowed) {
      slots.push({
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
      });
    }

    cursor += stepMs;
  }

  return slots;
}
