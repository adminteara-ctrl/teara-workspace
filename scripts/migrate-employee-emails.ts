
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { randomBytes } from 'node:crypto';
import { chmodSync, readFileSync, writeFileSync } from 'node:fs';

async function main() {
    const credentialPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

    if (!credentialPath) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH is not configured.');
    }

    const serviceAccount = JSON.parse(
        readFileSync(credentialPath, 'utf8')
    );

    const app = getApps().length
        ? getApps()[0]
        : initializeApp({
            credential: cert(serviceAccount),
            projectId: 'teara-806f0',
        });

    const adminAuth = getAuth(app);

    const adminDb = getFirestore(
        app,
        'ai-studio-tearaworkhub-2a40cac0-8919-49b3-b43b-899d8795f148'
    );

    const employees = [
        {
            uid: 'user_ayan',
            username: 'ayan',
            email: 'founder@teara.in',
        },
        {
            uid: 'user_kunal',
            username: 'kunal',
            email: 'ceo@teara.in',
        },
        {
            uid: 'user_tanmoy',
            username: 'tanmoy',
            email: 'coo@teara.in',
        },
        {
            uid: 'user_tanisha',
            username: 'tanisha',
            email: 'associate@teara.in',
        },
    ];

    const resetLinks: Array<{
        name: string;
        username: string;
        email: string;
        resetLink: string;
    }> = [];

    const failures: string[] = [];

    for (const employee of employees) {
        try {
            console.log(`Processing ${employee.username}...`);

            const profileRef = adminDb
                .collection('users')
                .doc(employee.uid);

            const profileSnapshot = await profileRef.get();

            if (!profileSnapshot.exists) {
                throw new Error('Firestore profile does not exist.');
            }

            const profile = profileSnapshot.data();

            if (
                profile?.uid !== employee.uid ||
                profile?.username?.toLowerCase() !== employee.username ||
                profile?.role !== 'employee'
            ) {
                throw new Error('Firestore UID, username or role mismatch.');
            }

            const emailOwner = await adminAuth
                .getUserByEmail(employee.email)
                .catch((error) => {
                    if (error.code === 'auth/user-not-found') return null;
                    throw error;
                });

            if (emailOwner && emailOwner.uid !== employee.uid) {
                throw new Error(
                    `Email already belongs to another UID: ${emailOwner.uid}`
                );
            }

            let authUser = await adminAuth
                .getUser(employee.uid)
                .catch((error) => {
                    if (error.code === 'auth/user-not-found') return null;
                    throw error;
                });

            if (authUser) {
                await adminAuth.updateUser(employee.uid, {
                    email: employee.email,
                    emailVerified: false,
                });
            } else {
                await adminAuth.createUser({
                    uid: employee.uid,
                    email: employee.email,
                    password: randomBytes(48).toString('base64url'),
                    displayName: profile.name || employee.username,
                    disabled: profile.accountStatus !== 'active',
                    emailVerified: false,
                });
            }

            await profileRef.update({
                email: employee.email,
                updatedAt: new Date().toISOString(),
            });

            const resetLink = await adminAuth.generatePasswordResetLink(
                employee.email
            );

            resetLinks.push({
                name: profile.name || employee.username,
                username: employee.username,
                email: employee.email,
                resetLink,
            });

            console.log(`Updated successfully: ${employee.email}`);
        } catch (error: any) {
            const message = error?.message || 'Unknown error';
            failures.push(`${employee.username}: ${message}`);
            console.error(`Failed: ${employee.username} — ${message}`);
        }
    }

    const outputPath = '/tmp/teara-employee-password-reset-links.json';

    writeFileSync(
        outputPath,
        JSON.stringify(resetLinks, null, 2),
        { mode: 0o600 }
    );

    chmodSync(outputPath, 0o600);

    console.log('\nMigration summary');
    console.log('-----------------');
    console.log(`Successful accounts: ${resetLinks.length}/4`);
    console.log(`Failed accounts: ${failures.length}/4`);
    console.log(`Reset links saved privately to: ${outputPath}`);

    if (failures.length > 0) {
        console.error('\nAccounts requiring attention:');
        failures.forEach((failure) => console.error(failure));
        process.exitCode = 1;
    }

    console.log('\nNo passwords were printed or stored in Firestore.');
}

main().catch((error) => {
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
});
