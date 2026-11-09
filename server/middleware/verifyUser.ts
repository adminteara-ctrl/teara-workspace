import type { NextFunction, Request, Response } from 'express';
import { adminAuth, adminDb } from '../firebaseAdmin';

export interface AuthenticatedUserRequest extends Request {
    authenticatedUid?: string;
    authenticatedProfile?: Record<string, any>;
}

export async function verifyUser(
    req: AuthenticatedUserRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const authorization = req.headers.authorization;

        if (!authorization?.startsWith('Bearer ')) {
            res.status(401).json({
                error: 'Authentication required.',
            });
            return;
        }

        const token = authorization.substring(7);
        const decoded = await adminAuth.verifyIdToken(token);

        const userSnapshot = await adminDb
            .collection('users')
            .doc(decoded.uid)
            .get();

        if (!userSnapshot.exists) {
            res.status(403).json({
                error: 'User profile not found.',
            });
            return;
        }

        const profile = userSnapshot.data();

        if (
            profile?.uid !== decoded.uid ||
            profile?.accountStatus !== 'active' ||
            !['admin', 'employee'].includes(profile?.role)
        ) {
            res.status(403).json({
                error: 'An active WorkHub account is required.',
            });
            return;
        }

        req.authenticatedUid = decoded.uid;
        req.authenticatedProfile = profile;

        next();
    } catch (error) {
        console.error('User verification failed:', error);

        res.status(401).json({
            error: 'Invalid or expired authentication token.',
        });
    }
}