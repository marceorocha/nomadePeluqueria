"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const errorHandler_js_1 = require("./middleware/errorHandler.js");
const bookings_js_1 = require("./routes/bookings.js");
const availability_js_1 = require("./routes/availability.js");
const services_js_1 = require("./routes/services.js");
const calendar_js_1 = require("./routes/admin/calendar.js");
const auth_js_1 = require("./routes/auth.js");
const management_js_1 = require("./routes/admin/management.js");
const app = (0, express_1.default)();
const PORT = process.env.PORT ?? 3001;
app.use((0, cors_1.default)({ origin: true, credentials: true }));
app.use(express_1.default.json());
// Public routes (no auth)
app.use("/api/bookings", bookings_js_1.bookingsRouter);
app.use("/api/availability", availability_js_1.availabilityRouter);
app.use("/api/services", services_js_1.servicesRouter);
app.use("/api/auth", auth_js_1.authRouter);
// Admin: calendar connections (protect with authMiddleware in production)
app.use("/api/admin/calendar", calendar_js_1.calendarRouter);
app.use("/api/admin", management_js_1.adminManagementRouter);
app.get("/health", (_req, res) => {
    res.json({ ok: true });
});
app.use(errorHandler_js_1.errorHandler);
app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});
//# sourceMappingURL=index.js.map