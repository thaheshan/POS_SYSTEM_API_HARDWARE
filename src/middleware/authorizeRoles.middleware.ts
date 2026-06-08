import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export function authorizeRoles(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user || !user.role) {
      throw new ForbiddenException('INSUFFICIENT_PERMISSIONS');
    }

    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException('INSUFFICIENT_PERMISSIONS');
    }

    next();
  };
}