import { google } from "googleapis";
import type { CalendarConnectionRecord } from "../types/calendar.js";

const SCOPES = ["https://www.googleapis.com/auth/calendar"];
const CALENDAR_ID_PRIMARY = "primary";

export function getGoogleAuthUrl(redirectUri: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set");
  }
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });
}

export function createOAuth2Client(redirectUri: string, connection: CalendarConnectionRecord | null) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set");
  }
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  if (connection?.googleRefreshToken) {
    oauth2Client.setCredentials({
      refresh_token: connection.googleRefreshToken,
      access_token: connection.googleAccessToken ?? undefined,
      expiry_date: connection.googleExpiryDate?.getTime(),
    });
  }
  return oauth2Client;
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<{ refreshToken: string; accessToken: string; expiryDate: number | null }> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set");
  }
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const { tokens } = await oauth2Client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error("Google did not return a refresh token");
  }
  return {
    refreshToken: tokens.refresh_token,
    accessToken: tokens.access_token ?? "",
    expiryDate: tokens.expiry_date ?? null,
  };
}

export interface CalendarEventInput {
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
}

export async function createGoogleCalendarEvent(
  connection: CalendarConnectionRecord,
  redirectUri: string,
  input: CalendarEventInput
): Promise<string> {
  const oauth2Client = createOAuth2Client(redirectUri, connection);
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  const res = await calendar.events.insert({
    calendarId: CALENDAR_ID_PRIMARY,
    requestBody: {
      summary: input.summary,
      description: input.description ?? undefined,
      location: input.location ?? undefined,
      start: { dateTime: input.start.toISOString(), timeZone: "UTC" },
      end: { dateTime: input.end.toISOString(), timeZone: "UTC" },
    },
  });
  const eventId = res.data.id;
  if (!eventId) throw new Error("Google Calendar did not return event id");
  return eventId;
}

export async function updateGoogleCalendarEvent(
  connection: CalendarConnectionRecord,
  redirectUri: string,
  eventId: string,
  input: CalendarEventInput
): Promise<void> {
  const oauth2Client = createOAuth2Client(redirectUri, connection);
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  await calendar.events.patch({
    calendarId: CALENDAR_ID_PRIMARY,
    eventId,
    requestBody: {
      summary: input.summary,
      description: input.description ?? undefined,
      location: input.location ?? undefined,
      start: { dateTime: input.start.toISOString(), timeZone: "UTC" },
      end: { dateTime: input.end.toISOString(), timeZone: "UTC" },
    },
  });
}

export async function deleteGoogleCalendarEvent(
  connection: CalendarConnectionRecord,
  redirectUri: string,
  eventId: string
): Promise<void> {
  const oauth2Client = createOAuth2Client(redirectUri, connection);
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  await calendar.events.delete({
    calendarId: CALENDAR_ID_PRIMARY,
    eventId,
  });
}
