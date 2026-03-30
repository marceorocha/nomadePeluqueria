import express from "express";
import cors from "cors";
import { authMiddleware } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { bookingsRouter } from "./routes/bookings.js";
import { availabilityRouter } from "./routes/availability.js";
import { servicesRouter } from "./routes/services.js";
import { calendarRouter } from "./routes/admin/calendar.js";
import { authRouter } from "./routes/auth.js";
import { adminManagementRouter } from "./routes/admin/management.js";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Public routes (no auth)
app.use("/api/bookings", bookingsRouter);
app.use("/api/availability", availabilityRouter);
app.use("/api/services", servicesRouter);
app.use("/api/auth", authRouter);

// Admin: calendar connections (protect with authMiddleware in production)
app.use("/api/admin/calendar", calendarRouter);
app.use("/api/admin", adminManagementRouter);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
