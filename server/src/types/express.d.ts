import { Request } from 'express';

export interface UserPayload {
  id: string;
  email: string;
  username: string;
}

export interface AuthRequest extends Request {
  user?: UserPayload;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}
