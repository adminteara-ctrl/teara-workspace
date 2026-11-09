import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';

const projectId = 'teara-806f0';

function loadServiceAccount(): Record<string, any> {
    const jsonValue = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const base64Value = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    const credentialPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

    let raw: string;

    if (base64Value) {
        raw = Buffer.from(base64Value, 'base64').toString('utf8');
    } else if (jsonValue) {
        raw = jsonValue;
    } else if (credentialPath) {
        raw = readFileSync(credentialPath, 'utf8');
    } else {
        throw new Error(
            'Firebase Admin credentials are not configured. Set FIREBASE_SERVICE_ACCOUNT_BASE64 (recommended), FIREBASE_SERVICE_ACCOUNT_JSON, or FIREBASE_SERVICE_ACCOUNT_PATH.'
        );
    }

    const serviceAccount = JSON.parse(raw);
    if (typeof serviceAccount.private_key === 'string') {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    if (serviceAccount.project_id !== projectId) {
        throw new Error('Firebase service account project ID does not match.');
    }

    return serviceAccount;
}

const existingApp = getApps().find((candidate) => candidate.name === '[DEFAULT]');

const app =
    existingApp ??
    initializeApp({
        credential: cert(loadServiceAccount()),
        projectId,
    });

export const adminAuth = getAuth(app);

// Use the same named Firestore database as the frontend.
export const adminDb = getFirestore(
    app,
    'ai-studio-tearaworkhub-2a40cac0-8919-49b3-b43b-899d8795f148'
);
