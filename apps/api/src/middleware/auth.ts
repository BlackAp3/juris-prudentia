import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken, type AccessClaims } from "../auth.js";

declare global {
  namespace Express {
    interface Request {
      authUser?: AccessClaims;
    }
  }
}

export function requireAuth(request: Request, response: Response, next: NextFunction) {
  const authorization = request.header("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
  const claims = token ? verifyAccessToken(token) : null;
  if (!claims) {
    response.status(401).json({ error: "Authentication required" });
    return;
  }
  request.authUser = claims;
  next();
}

export function requireRoles(...roles: AccessClaims["role"][]) {
  return (request: Request, response: Response, next: NextFunction) => {
    if (!request.authUser || !roles.includes(request.authUser.role)) {
      response.status(403).json({ error: "You do not have permission to access this resource" });
      return;
    }
    next();
  };
}
