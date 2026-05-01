// src/app/middlewares/auth.ts
import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import { JwtPayload, Secret } from 'jsonwebtoken';
import config from '../../config';
import ApiError from '../../errors/ApiError';
import { jwtHelpers } from '../../helpers/jwtHelpers';

const auth =
  (...requiredRoles: string[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1. Get token from authorization header
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized');
      }

      // 2. Verify token
      let verifiedUser = null;
      try {
        verifiedUser = jwtHelpers.verifyToken(
          token,
          config.jwt.secret as Secret,
        ) as JwtPayload & { userId: string; role: string };
      } catch (error) {
        throw new ApiError(httpStatus.FORBIDDEN, 'Invalid Token');
      }

      // 3. Attach user to request object
      req.user = verifiedUser;

      // 4. SUPER_ADMIN bypasses all role checks
      if (verifiedUser.role === 'SUPER_ADMIN') {
        return next();
      }

      // 5. Check if user role is authorized
      if (requiredRoles.length && !requiredRoles.includes(verifiedUser.role)) {
        throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
      }

      next();
    } catch (error) {
      next(error);
    }
  };

export default auth;
