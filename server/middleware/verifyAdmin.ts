
import type { NextFunction, Request, Response } from 'express';
import { adminAuth, adminDb } from '../firebaseAdmin.js';

export interface AuthenticatedRequest extends Request {
    authenticatedUid?: string;
}

export async function verifyAdmin(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const authorization = req.headers.authorization;

        if (!authorization?.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Authentication required.' });
            return;
        }

        const token = authorization.substring(7);
        const decoded = await adminAuth.verifyIdToken(token);

        const userSnapshot = await adminDb
            .collection('users')
            .doc(decoded.uid)
            .get();

        if (!userSnapshot.exists) {
            res.status(403).json({ error: 'User profile not found.' });
            return;
        }

        const profile = userSnapshot.data();

        if (profile?.role !== 'admin' || profile?.accountStatus !== 'active') {
            res.status(403).json({ error: 'Administrator access required.' });
            return;
        }

        req.authenticatedUid = decoded.uid;
        next();
    } catch (error) {
        console.error('Admin verification failed:', error);
        res.status(401).json({ error: 'Invalid or expired authentication token.' });
    }
}
