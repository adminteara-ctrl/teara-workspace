
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';

async function main() {
    const credentialPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

    if (!credentialPath) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH is not configured.');
    }

    const serviceAccount = JSON.parse(
        readFileSync(credentialPath, 'utf8')
    );

    const app = initializeApp({
        credential: cert(serviceAccount),
        projectId: 'teara-806f0',
    });

    const adminAuth = getAuth(app);
    const adminDb = getFirestore(
        app,
        'ai-studio-tearaworkhub-2a40cac0-8919-49b3-b43b-899d8795f148'
    );

    const uid = 'user_admin';
    const newEmail = 'admin@teara.in';

    const profileRef = adminDb.collection('users').doc(uid);
    const profileSnapshot = await profileRef.get();

    if (!profileSnapshot.exists) {
        throw new Error('Administrator Firestore profile not found.');
    }

    const profile = profileSnapshot.data();

    if (profile?.role !== 'admin') {
        throw new Error('This account is not an administrator.');
    }

    const authUser = await adminAuth.getUser(uid);

    const emailOwner = await adminAuth.getUserByEmail(newEmail).catch((error) => {
        if (error.code === 'auth/user-not-found') return null;
        throw error;
    });

    if (emailOwner && emailOwner.uid !== uid) {
        throw new Error('The new email belongs to another Authentication account.');
    }

    await adminAuth.updateUser(uid, {
        email: newEmail,
        emailVerified: false,
    });

    await profileRef.update({
        email: newEmail,
        updatedAt: new Date().toISOString(),
    });

    console.log('Administrator email updated successfully.');
    console.log('UID:', authUser.uid);
    console.log('Previous email:', authUser.email);
    console.log('New email:', newEmail);
    console.log('Firestore profile updated.');
}

main().catch((error) => {
    console.error('Email migration failed:', error.message);
    process.exitCode = 1;
});

