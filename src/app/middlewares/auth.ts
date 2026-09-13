import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import { verifyToken } from '@clerk/clerk-sdk-node';
import config from '../config';
import AppError from '../errors/appError';
import { TUserRole } from '../modules/user/user.interface';
import { User } from '../modules/user/user.model';
import catchAsync from '../utils/catchAsync';
import { AuthServices } from '../modules/auth/auth.service';

const auth = (...requiredRoles: TUserRole[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    let token: string | undefined;
    const authHeader = req.headers.authorization;

    // Check authorization header first
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    }
    
    // Fallback: Check for token in query params (for iframe/object requests)
    // This is needed for the document viewer endpoints
    // (/documents/:documentId/view and /documents/:documentId/content) where
    // browsers can't send headers. Restricted to these paths only so bearer
    // tokens don't leak into logs/history on every other route.
    // Note: inside the documents router req.path is router-relative,
    // e.g. '/<documentId>/view' or '/<documentId>/content'.
    const isDocumentViewerPath =
      req.baseUrl.endsWith('/documents') &&
      (req.path.endsWith('/view') || req.path.endsWith('/content'));

    if (
      !token &&
      isDocumentViewerPath &&
      req.query.token &&
      typeof req.query.token === 'string'
    ) {
      token = req.query.token;
    }
    
    // console.log('authHeader',authHeader);
    
    // Check if token exists
    if (!token) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized!');
    }

    try {
      // Verify Clerk JWT token
      const decoded = await verifyToken(token, {
        secretKey: config.clerk_secret_key as string,
        issuer: (iss) => iss.startsWith('https://'), // Accept any Clerk issuer
      });

      // Extract Clerk user data from JWT
      const clerkUserId = decoded.sub;
      
      // Robust email extraction to prevent crashes
      let email = decoded.email as string;
      
      // Fallback: Check if email is inside specific Clerk structure (unlikely in standard JWT but good safety)
      // or if decoded.email is null/undefined
      if (!email && (decoded as any).email_addresses && Array.isArray((decoded as any).email_addresses)) {
         email = (decoded as any).email_addresses[0]?.email_address;
      }

      // Final Fallback: If absolutely no email found, do NOT pass undefined.
      // Pass null so service can handle it by generating a placeholder.
      if (!email) {
          email = null as any; 
      }
      
      // Find user in database by Clerk ID
      let user = await User.findOne({ clerkUserId });

      if (!user) {
        // For /auth/sync endpoint, allow non-existent users
        if (req.path === '/sync') {
          req.user = {
            clerkUserId,
            email: email || '',
            userId: '',
            mongoUserId: '',
            emailVerified: decoded.email_verified as boolean,
          };
          return next();
        }

        // Auto-sync user from Clerk if not found locally
        await AuthServices.syncUserFromClerk(clerkUserId, email);
        user = await User.findOne({ clerkUserId });

        if (!user) {
          throw new AppError(httpStatus.NOT_FOUND, 'This user is not found!');
        }
      }

      // Handle soft-deleted users
      if (user.isDeleted) {
        // Only allow re-registration through the /sync endpoint
        if (req.path === '/sync') {
          // Reset as a fresh account on explicit re-registration
          user.isDeleted = false;
          user.status = 'active';
          user.role = 'client';
          user.deletedAt = undefined as any;
          await user.save();
        } else {
          // Block deleted users on all other requests
          throw new AppError(httpStatus.FORBIDDEN, 'This account has been deleted. Please sign out and register again.');
        }
      }

      // Check if user is blocked
      if (user.status === 'blocked') {
        throw new AppError(httpStatus.FORBIDDEN, 'This user is blocked!');
      }

      // Check role-based access
      // console.log('requiredRoles.length',requiredRoles.length);
      // console.log('user',user);
      
      if (
        requiredRoles.length > 0 &&
        !requiredRoles.includes(user.role as TUserRole)
      ) {
        throw new AppError(
          httpStatus.FORBIDDEN,
          'You are not authorized to access this resource!',
        );
      }

      // Attach user data to request
      req.user = {
        clerkUserId,
        email: email || '',
        userId: user.id,
        mongoUserId: user._id.toString(),
        role: user?.role ? (user.role as TUserRole) : 'client',
        emailVerified: true,
      };

      next();
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }

      // Handle Clerk verification errors
      if (error.message?.includes('expired')) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'Token has expired!');
      }
      if (error.message?.includes('invalid')) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid token!');
      }
      throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized!');
    }
  });
};

export default auth;
