"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncAppointmentCreated = syncAppointmentCreated;
exports.syncAppointmentUpdated = syncAppointmentUpdated;
exports.syncAppointmentCancelled = syncAppointmentCancelled;
const prisma_js_1 = require("../lib/prisma.js");
const googleCalendar = __importStar(require("./googleCalendarService.js"));
const caldav = __importStar(require("./caldavService.js"));
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI ??
    `${process.env.API_BASE_URL ?? "http://localhost:3001"}/api/admin/calendar/google/callback`;
function eventInput(apt) {
    return {
        summary: `${apt.service.name} — ${apt.client.name}`,
        description: `Staff: ${apt.staff.name}. Booked via Nomade.`,
        start: apt.startTime,
        end: apt.endTime,
    };
}
async function syncAppointmentCreated(apt) {
    const connections = await prisma_js_1.prisma.calendarConnection.findMany();
    const input = eventInput(apt);
    let googleEventId = null;
    let caldavEventId = null;
    for (const conn of connections) {
        try {
            if (conn.provider === "GOOGLE" && conn.googleRefreshToken) {
                googleEventId = await googleCalendar.createGoogleCalendarEvent(conn, REDIRECT_URI, input);
            }
            if (conn.provider === "CALDAV" && conn.caldavUsername && conn.caldavPassword) {
                caldavEventId = await caldav.createCalDAVEvent(conn, apt.id, input);
            }
        }
        catch (err) {
            console.error(`Calendar sync failed (${conn.provider}) for appointment ${apt.id}:`, err);
        }
    }
    if (googleEventId !== null || caldavEventId !== null) {
        await prisma_js_1.prisma.appointment.update({
            where: { id: apt.id },
            data: {
                ...(googleEventId !== null && { googleEventId }),
                ...(caldavEventId !== null && { caldavEventId }),
            },
        });
    }
}
async function syncAppointmentUpdated(apt) {
    const connections = await prisma_js_1.prisma.calendarConnection.findMany();
    const input = eventInput(apt);
    for (const conn of connections) {
        try {
            if (conn.provider === "GOOGLE" && conn.googleRefreshToken && apt.googleEventId) {
                await googleCalendar.updateGoogleCalendarEvent(conn, REDIRECT_URI, apt.googleEventId, input);
            }
            if (conn.provider === "CALDAV" &&
                conn.caldavUsername &&
                conn.caldavPassword &&
                apt.caldavEventId) {
                await caldav.updateCalDAVEvent(conn, apt.caldavEventId, apt.id, input);
            }
        }
        catch (err) {
            console.error(`Calendar sync update failed (${conn.provider}) for appointment ${apt.id}:`, err);
        }
    }
}
async function syncAppointmentCancelled(apt) {
    const connections = await prisma_js_1.prisma.calendarConnection.findMany();
    for (const conn of connections) {
        try {
            if (conn.provider === "GOOGLE" && conn.googleRefreshToken && apt.googleEventId) {
                await googleCalendar.deleteGoogleCalendarEvent(conn, REDIRECT_URI, apt.googleEventId);
            }
            if (conn.provider === "CALDAV" &&
                conn.caldavUsername &&
                conn.caldavPassword &&
                apt.caldavEventId) {
                await caldav.deleteCalDAVEvent(conn, apt.caldavEventId);
            }
        }
        catch (err) {
            console.error(`Calendar sync delete failed (${conn.provider}) for appointment ${apt.id}:`, err);
        }
    }
}
//# sourceMappingURL=calendarSyncService.js.map