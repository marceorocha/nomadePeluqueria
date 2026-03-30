export type ClientTier = "REGULAR" | "SILVER" | "GOLD";
export interface TimeSlot {
    start: string;
    end: string;
}
/**
 * Given a date, serviceId, and clientTier, returns available time slots
 * respecting working hours, existing bookings, buffer times, and tier visibility.
 */
export declare function getAvailableSlots(date: Date, serviceId: string, clientTier: ClientTier): Promise<TimeSlot[]>;
//# sourceMappingURL=availabilityService.d.ts.map