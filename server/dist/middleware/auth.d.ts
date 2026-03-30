import { Request, Response, NextFunction } from "express";
export interface JwtPayload {
    sub: string;
    role: "admin" | "client";
    email?: string;
    name?: string;
}
export interface AuthRequest extends Request {
    user?: JwtPayload;
}
export declare function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
export declare function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=auth.d.ts.map