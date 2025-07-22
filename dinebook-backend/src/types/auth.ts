import { Request } from 'express';

export interface userPayload {
    id: string;
    role: string;
}

export interface AuthenticatedRequest extends Request {
    user: {
        id: string;
        role: string;
        [key: string]: any;
    };
}