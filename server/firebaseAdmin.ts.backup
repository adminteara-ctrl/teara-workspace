
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';

const projectId = 'teara-806f0';
const credentialPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

if (!credentialPath) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH is not configured.');
}

const serviceAccount = JSON.parse(readFileSync(credentialPath, 'utf8'));

if (serviceAccount.project_id !== projectId) {
    throw new Error('Firebase service account project ID does not match.');
}

const app =
    getApps().length > 0
        ? getApps()[0]
        : initializeApp({
            credential: cert(serviceAccount),
            projectId,
        });

export const adminAuth = getAuth(app);

// Use the same named Firestore database as the frontend.
export const adminDb = getFirestore(
    app,
    'ai-studio-tearaworkhub-2a40cac0-8919-49b3-b43b-899d8795f148'
);
