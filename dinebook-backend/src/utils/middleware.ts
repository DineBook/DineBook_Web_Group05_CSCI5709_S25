import jwt from 'jsonwebtoken';
import multer from "multer";
import { User } from '../models';
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest, userPayload } from '../types/';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        // Get authorization header as string
        const rawAuthHeader = req.headers.authorization || req.header('authorization');

        // Convert to string if it's an array
        const authHeader: string = Array.isArray(rawAuthHeader)
            ? rawAuthHeader[0]
            : rawAuthHeader || '';

        if (!authHeader || authHeader.trim() === '') {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        // Extract token (handle both "Bearer token" and just "token" formats)
        const token = authHeader.startsWith('Bearer ')
            ? authHeader.replace('Bearer ', '')
            : authHeader;

        if (!token || token.trim() === '') {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET) as userPayload;
            const user = await User.findById(decoded.id);

            if (!user) {
                return res.status(401).json({ error: 'Invalid token. User not found.' });
            }

            req.user = {
                ...user.toObject(),
                id: user._id.toString(),
                role: user.role || decoded.role
            };
            next();
        } catch (jwtError: any) {
            // Handle different types of JWT errors more gracefully
            if (jwtError.name === 'TokenExpiredError') {
                // Don't spam console with expired token errors - just return response
                return res.status(401).json({ error: 'Token expired. Please login again.' });
            } else if (jwtError.name === 'JsonWebTokenError') {
                console.error('Invalid JWT token format:', jwtError.message);
                return res.status(401).json({ error: 'Invalid token format.' });
            } else {
                console.error('JWT verification error:', jwtError);
                return res.status(401).json({ error: 'Token verification failed.' });
            }
        }
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({ error: 'Authentication failed.' });
    }
};

export const checkOwner = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Access denied. User not authenticated.' });
        }
        if (req.user.role !== 'owner') {
            return res.status(403).json({ error: 'Access denied. Owner privileges required.' });
        }
        next();
    } catch (error) {
        console.error('Owner check error:', error);
        res.status(403).json({ error: 'Access denied. Unable to verify owner status.' });
    }
};
