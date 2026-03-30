import { prisma } from "../lib/prisma.js";
import * as googleCalendar from "./googleCalendarService.js";
import * as caldav from "./caldavService.js";

const REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ??
  `${process.env.API_BASE_URL ?? "http://localhost:3001"}/api/admin/calendar/google/callback`;

export interface AppointmentForSync {
  id: string;
  startTime: Date;
  endTime: Date;
  status: string;
  googleEventId: string | null;
  caldavEventId: string | null;
  service: { name: string };
  client: { name: string };
  staff: { name: string };
}

function eventInput(apt: AppointmentForSync): {
  summary: string;
  description: string;
  start: Date;
  end: Date;
} {
  return {
    summary: `${apt.service.name} — ${apt.client.name}`,
    description: `Staff: ${apt.staff.name}. Booked via Nomade.`,
    start: apt.startTime,
    end: apt.endTime,
  };
}

export async function syncAppointmentCreated(apt: AppointmentForSync): Promise<void> {
  const connections = await prisma.calendarConnection.findMany();
  const input = eventInput(apt);
  let googleEventId: string | null = null;
  let caldavEventId: string | null = null;

  for (const conn of connections) {
    try {
      if (conn.provider === "GOOGLE" && conn.googleRefreshToken) {
        googleEventId = await googleCalendar.createGoogleCalendarEvent(
          conn,
          REDIRECT_URI,
          input
        );
      }
      if (conn.provider === "CALDAV" && conn.caldavUsername && conn.caldavPassword) {
        caldavEventId = await caldav.createCalDAVEvent(conn, apt.id, input);
      }
    } catch (err) {
      console.error(`Calendar sync failed (${conn.provider}) for appointment ${apt.id}:`, err);
    }
  }

  if (googleEventId !== null || caldavEventId !== null) {
    await prisma.appointment.update({
      where: { id: apt.id },
      data: {
        ...(googleEventId !== null && { googleEventId }),
        ...(caldavEventId !== null && { caldavEventId }),
      },
    });
  }
}

export async function syncAppointmentUpdated(apt: AppointmentForSync): Promise<void> {
  const connections = await prisma.calendarConnection.findMany();
  const input = eventInput(apt);

  for (const conn of connections) {
    try {
      if (conn.provider === "GOOGLE" && conn.googleRefreshToken && apt.googleEventId) {
        await googleCalendar.updateGoogleCalendarEvent(
          conn,
          REDIRECT_URI,
          apt.googleEventId,
          input
        );
      }
      if (
        conn.provider === "CALDAV" &&
        conn.caldavUsername &&
        conn.caldavPassword &&
        apt.caldavEventId
      ) {
        await caldav.updateCalDAVEvent(conn, apt.caldavEventId, apt.id, input);
      }
    } catch (err) {
      console.error(`Calendar sync update failed (${conn.provider}) for appointment ${apt.id}:`, err);
    }
  }
}

export async function syncAppointmentCancelled(apt: AppointmentForSync): Promise<void> {
  const connections = await prisma.calendarConnection.findMany();

  for (const conn of connections) {
    try {
      if (conn.provider === "GOOGLE" && conn.googleRefreshToken && apt.googleEventId) {
        await googleCalendar.deleteGoogleCalendarEvent(
          conn,
          REDIRECT_URI,
          apt.googleEventId
        );
      }
      if (
        conn.provider === "CALDAV" &&
        conn.caldavUsername &&
        conn.caldavPassword &&
        apt.caldavEventId
      ) {
        await caldav.deleteCalDAVEvent(conn, apt.caldavEventId);
      }
    } catch (err) {
      console.error(`Calendar sync delete failed (${conn.provider}) for appointment ${apt.id}:`, err);
    }
  }
}
