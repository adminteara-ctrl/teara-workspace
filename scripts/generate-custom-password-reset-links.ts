
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import {
    chmodSync,
    readFileSync,
    writeFileSync,
} from 'node:fs';

async function main() {
    const credentialPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

    if (!credentialPath) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH is not configured.');
    }

    const serviceAccount = JSON.parse(
        readFileSync(credentialPath, 'utf8')
    );

    if (serviceAccount.project_id !== 'teara-806f0') {
        throw new Error('Service account belongs to the wrong Firebase project.');
    }

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

    const handlerUrl =
        'https://teara-806f0.web.app/reset-password.html';

    const resetLinks: Array<{
        name: string;
        username: string;
        email: string;
        resetLink: string;
    }> = [];

    const failures: string[] = [];

    for (const employee of employees) {
        try {
            console.log(`Generating link for ${employee.username}...`);

            // Verify the existing Firestore profile.
            const profileSnapshot = await adminDb
                .collection('users')
                .doc(employee.uid)
                .get();

            if (!profileSnapshot.exists) {
                throw new Error('Firestore profile does not exist.');
            }

            const profile = profileSnapshot.data();

            if (
                profile?.uid !== employee.uid ||
                profile?.username?.toLowerCase() !== employee.username ||
                profile?.email?.toLowerCase() !== employee.email ||
                profile?.role !== 'employee'
            ) {
                throw new Error('Firestore profile verification failed.');
            }

            // Verify the existing Firebase Authentication account.
            const authUser = await adminAuth.getUser(employee.uid);

            if (
                authUser.email?.toLowerCase() !== employee.email ||
                authUser.disabled
            ) {
                throw new Error(
                    'Firebase Auth email mismatch or account is disabled.'
                );
            }

            // Generate the original Firebase password-reset action link.
            const firebaseLink =
                await adminAuth.generatePasswordResetLink(employee.email);

            const originalUrl = new URL(firebaseLink);

            const mode = originalUrl.searchParams.get('mode');
            const oobCode = originalUrl.searchParams.get('oobCode');
            const apiKey = originalUrl.searchParams.get('apiKey');

            if (
                mode !== 'resetPassword' ||
                !oobCode ||
                !apiKey
            ) {
                throw new Error(
                    'Firebase returned an unexpected password-reset link format.'
                );
            }

            // Redirect the same valid action code to our custom handler.
            const customUrl = new URL(handlerUrl);

            customUrl.searchParams.set('mode', mode);
            customUrl.searchParams.set('oobCode', oobCode);
            customUrl.searchParams.set('apiKey', apiKey);

            const lang = originalUrl.searchParams.get('lang');

            if (lang) {
                customUrl.searchParams.set('lang', lang);
            }

            resetLinks.push({
                name: profile.name || employee.username,
                username: employee.username,
                email: employee.email,
                resetLink: customUrl.toString(),
            });

            console.log(`Successfully generated: ${employee.email}`);
        } catch (error: any) {
            const message = error?.message || 'Unknown error';

            failures.push(`${employee.username}: ${message}`);

            console.error(
                `Failed: ${employee.username} — ${message}`
            );
        }
    }

    const outputPath =
        '/tmp/teara-custom-password-reset-links.json';

    writeFileSync(
        outputPath,
        JSON.stringify(resetLinks, null, 2),
        { mode: 0o600 }
    );

    chmodSync(outputPath, 0o600);

    console.log('\nGeneration summary');
    console.log('------------------');
    console.log(`Generated: ${resetLinks.length}/4`);
    console.log(`Failed: ${failures.length}/4`);
    console.log(`Saved to: ${outputPath}`);

    if (failures.length > 0) {
        console.error('\nFailures:');

        failures.forEach((failure) => {
            console.error(failure);
        });

        process.exitCode = 1;
    }

    console.log('\nNo account emails, passwords or Firestore profiles were modified.');
}

main().catch((error) => {
    console.error('Generation failed:', error.message);
    process.exitCode = 1;
});
