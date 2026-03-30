import {
  createCalendarObject,
  createDAVClient,
  deleteCalendarObject,
  updateCalendarObject,
} from "tsdav";
import type { DAVCalendar, DAVCalendarObject } from "tsdav";
import type { CalendarConnectionRecord } from "../types/calendar.js";

export interface CalendarEventInput {
  summary: string;
  description?: string;
  start: Date;
  end: Date;
}

const ICAL_TEMPLATE = (
  uid: string,
  summary: string,
  start: Date,
  end: Date,
  description?: string
) => {
  const formatUtc = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const desc = description ? `DESCRIPTION:${description.replace(/\n/g, "\\n")}\n` : "";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Nomade//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `SUMMARY:${summary.replace(/\n/g, " ")}`,
    desc,
    `DTSTART:${formatUtc(start)}`,
    `DTEND:${formatUtc(end)}`,
    `DTSTAMP:${formatUtc(new Date())}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
};

async function getCalendars(connection: CalendarConnectionRecord): Promise<DAVCalendar[]> {
  const url = connection.caldavUrl ?? "https://caldav.icloud.com";
  const username = connection.caldavUsername;
  const password = connection.caldavPassword;
  if (!username || !password) {
    throw new Error("CalDAV credentials not configured");
  }
  const client = await createDAVClient({
    serverUrl: url,
    credentials: { username, password },
    authMethod: "Basic",
    defaultAccountType: "caldav",
  });
  const account = await client.createAccount({
    account: {
      serverUrl: url,
      credentials: { username, password },
      accountType: "caldav",
    },
    loadCollections: true,
  });
  const calendars = account.calendars ?? (await client.fetchCalendars({ account }));
  return calendars;
}

export async function createCalDAVEvent(
  connection: CalendarConnectionRecord,
  appointmentId: string,
  input: CalendarEventInput
): Promise<string> {
  const calendars = await getCalendars(connection);
  const calendar = calendars[0];
  if (!calendar) throw new Error("No CalDAV calendar found");
  const uid = `nomade-${appointmentId}@booking`;
  const filename = `${uid}.ics`;
  const iCalString = ICAL_TEMPLATE(
    uid,
    input.summary,
    input.start,
    input.end,
    input.description
  );
  const response = await createCalendarObject({
    calendar,
    filename,
    iCalString,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`CalDAV create failed: ${response.status} ${text}`);
  }
  const eventUrl =
    response.headers.get("Location") ??
    (calendar.url ? `${calendar.url}/${filename}`.replace(/\/+/g, "/") : uid);
  return eventUrl;
}

export async function updateCalDAVEvent(
  connection: CalendarConnectionRecord,
  calendarObjectUrl: string,
  appointmentId: string,
  input: CalendarEventInput
): Promise<void> {
  await getCalendars(connection);
  const uid = `nomade-${appointmentId}@booking`;
  const iCalString = ICAL_TEMPLATE(
    uid,
    input.summary,
    input.start,
    input.end,
    input.description
  );
  const calendarObject: DAVCalendarObject = { url: calendarObjectUrl, data: iCalString };
  const response = await updateCalendarObject({ calendarObject });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`CalDAV update failed: ${response.status} ${text}`);
  }
}

export async function deleteCalDAVEvent(
  connection: CalendarConnectionRecord,
  calendarObjectUrl: string
): Promise<void> {
  await getCalendars(connection);
  const response = await deleteCalendarObject({
    calendarObject: { url: calendarObjectUrl },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`CalDAV delete failed: ${response.status} ${text}`);
  }
}
