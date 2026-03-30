/**
 * Shape of a calendar connection record (matches Prisma model CalendarConnection).
 * Use this in services so code compiles before `prisma generate` is run.
 */
export interface CalendarConnectionRecord {
    id: string;
    provider: "GOOGLE" | "CALDAV";
    googleRefreshToken: string | null;
    googleAccessToken: string | null;
    googleExpiryDate: Date | null;
    caldavUrl: string | null;
    caldavUsername: string | null;
    caldavPassword: string | null;
}
//# sourceMappingURL=calendar.d.ts.map