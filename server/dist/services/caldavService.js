"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCalDAVEvent = createCalDAVEvent;
exports.updateCalDAVEvent = updateCalDAVEvent;
exports.deleteCalDAVEvent = deleteCalDAVEvent;
const tsdav_1 = require("tsdav");
const ICAL_TEMPLATE = (uid, summary, start, end, description) => {
    const formatUtc = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
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
async function getCalendars(connection) {
    const url = connection.caldavUrl ?? "https://caldav.icloud.com";
    const username = connection.caldavUsername;
    const password = connection.caldavPassword;
    if (!username || !password) {
        throw new Error("CalDAV credentials not configured");
    }
    const client = await (0, tsdav_1.createDAVClient)({
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
async function createCalDAVEvent(connection, appointmentId, input) {
    const calendars = await getCalendars(connection);
    const calendar = calendars[0];
    if (!calendar)
        throw new Error("No CalDAV calendar found");
    const uid = `nomade-${appointmentId}@booking`;
    const filename = `${uid}.ics`;
    const iCalString = ICAL_TEMPLATE(uid, input.summary, input.start, input.end, input.description);
    const response = await (0, tsdav_1.createCalendarObject)({
        calendar,
        filename,
        iCalString,
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`CalDAV create failed: ${response.status} ${text}`);
    }
    const eventUrl = response.headers.get("Location") ??
        (calendar.url ? `${calendar.url}/${filename}`.replace(/\/+/g, "/") : uid);
    return eventUrl;
}
async function updateCalDAVEvent(connection, calendarObjectUrl, appointmentId, input) {
    await getCalendars(connection);
    const uid = `nomade-${appointmentId}@booking`;
    const iCalString = ICAL_TEMPLATE(uid, input.summary, input.start, input.end, input.description);
    const calendarObject = { url: calendarObjectUrl, data: iCalString };
    const response = await (0, tsdav_1.updateCalendarObject)({ calendarObject });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`CalDAV update failed: ${response.status} ${text}`);
    }
}
async function deleteCalDAVEvent(connection, calendarObjectUrl) {
    await getCalendars(connection);
    const response = await (0, tsdav_1.deleteCalendarObject)({
        calendarObject: { url: calendarObjectUrl },
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`CalDAV delete failed: ${response.status} ${text}`);
    }
}
//# sourceMappingURL=caldavService.js.map