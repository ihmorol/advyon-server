import { JwtPayload } from 'jsonwebtoken';

declare global {
  namespace Express {
    interface AuthUser extends JwtPayload {
      clerkUserId: string;
      email: string;
      userId: string;
      mongoUserId?: string;
      role?: string;
      emailVerified?: boolean;
    }

    interface Request {
      user: AuthUser;
    }
  }
}
