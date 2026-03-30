export interface AppointmentForSync {
    id: string;
    startTime: Date;
    endTime: Date;
    status: string;
    googleEventId: string | null;
    caldavEventId: string | null;
    service: {
        name: string;
    };
    client: {
        name: string;
    };
    staff: {
        name: string;
    };
}
export declare function syncAppointmentCreated(apt: AppointmentForSync): Promise<void>;
export declare function syncAppointmentUpdated(apt: AppointmentForSync): Promise<void>;
export declare function syncAppointmentCancelled(apt: AppointmentForSync): Promise<void>;
//# sourceMappingURL=calendarSyncService.d.ts.map