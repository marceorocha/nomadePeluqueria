import type { CalendarConnectionRecord } from "../types/calendar.js";
export declare function getGoogleAuthUrl(redirectUri: string): string;
export declare function createOAuth2Client(redirectUri: string, connection: CalendarConnectionRecord | null): import("google-auth-library").OAuth2Client;
export declare function exchangeCodeForTokens(code: string, redirectUri: string): Promise<{
    refreshToken: string;
    accessToken: string;
    expiryDate: number | null;
}>;
export interface CalendarEventInput {
    summary: string;
    description?: string;
    start: Date;
    end: Date;
    location?: string;
}
export declare function createGoogleCalendarEvent(connection: CalendarConnectionRecord, redirectUri: string, input: CalendarEventInput): Promise<string>;
export declare function updateGoogleCalendarEvent(connection: CalendarConnectionRecord, redirectUri: string, eventId: string, input: CalendarEventInput): Promise<void>;
export declare function deleteGoogleCalendarEvent(connection: CalendarConnectionRecord, redirectUri: string, eventId: string): Promise<void>;
//# sourceMappingURL=googleCalendarService.d.ts.map