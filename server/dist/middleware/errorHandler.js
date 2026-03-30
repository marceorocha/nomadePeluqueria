"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
function errorHandler(err, _req, res, _next) {
    console.error(err);
    const status = err.status ?? 500;
    const message = err instanceof Error ? err.message : "Error interno del servidor";
    res.status(status).json({ error: message });
}
//# sourceMappingURL=errorHandler.js.map