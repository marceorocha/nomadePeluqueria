"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGoogleAuthUrl = getGoogleAuthUrl;
exports.createOAuth2Client = createOAuth2Client;
exports.exchangeCodeForTokens = exchangeCodeForTokens;
exports.createGoogleCalendarEvent = createGoogleCalendarEvent;
exports.updateGoogleCalendarEvent = updateGoogleCalendarEvent;
exports.deleteGoogleCalendarEvent = deleteGoogleCalendarEvent;
const googleapis_1 = require("googleapis");
const SCOPES = ["https://www.googleapis.com/auth/calendar"];
const CALENDAR_ID_PRIMARY = "primary";
function getGoogleAuthUrl(redirectUri) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set");
    }
    const oauth2Client = new googleapis_1.google.auth.OAuth2(clientId, clientSecret, redirectUri);
    return oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
        prompt: "consent",
    });
}
function createOAuth2Client(redirectUri, connection) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set");
    }
    const oauth2Client = new googleapis_1.google.auth.OAuth2(clientId, clientSecret, redirectUri);
    if (connection?.googleRefreshToken) {
        oauth2Client.setCredentials({
            refresh_token: connection.googleRefreshToken,
            access_token: connection.googleAccessToken ?? undefined,
            expiry_date: connection.googleExpiryDate?.getTime(),
        });
    }
    return oauth2Client;
}
async function exchangeCodeForTokens(code, redirectUri) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set");
    }
    const oauth2Client = new googleapis_1.google.auth.OAuth2(clientId, clientSecret, redirectUri);
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
async function createGoogleCalendarEvent(connection, redirectUri, input) {
    const oauth2Client = createOAuth2Client(redirectUri, connection);
    const calendar = googleapis_1.google.calendar({ version: "v3", auth: oauth2Client });
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
    if (!eventId)
        throw new Error("Google Calendar did not return event id");
    return eventId;
}
async function updateGoogleCalendarEvent(connection, redirectUri, eventId, input) {
    const oauth2Client = createOAuth2Client(redirectUri, connection);
    const calendar = googleapis_1.google.calendar({ version: "v3", auth: oauth2Client });
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
async function deleteGoogleCalendarEvent(connection, redirectUri, eventId) {
    const oauth2Client = createOAuth2Client(redirectUri, connection);
    const calendar = googleapis_1.google.calendar({ version: "v3", auth: oauth2Client });
    await calendar.events.delete({
        calendarId: CALENDAR_ID_PRIMARY,
        eventId,
    });
}
//# sourceMappingURL=googleCalendarService.js.map