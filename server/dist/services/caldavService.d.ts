import type { CalendarConnectionRecord } from "../types/calendar.js";
export interface CalendarEventInput {
    summary: string;
    description?: string;
    start: Date;
    end: Date;
}
export declare function createCalDAVEvent(connection: CalendarConnectionRecord, appointmentId: string, input: CalendarEventInput): Promise<string>;
export declare function updateCalDAVEvent(connection: CalendarConnectionRecord, calendarObjectUrl: string, appointmentId: string, input: CalendarEventInput): Promise<void>;
export declare function deleteCalDAVEvent(connection: CalendarConnectionRecord, calendarObjectUrl: string): Promise<void>;
//# sourceMappingURL=caldavService.d.ts.map