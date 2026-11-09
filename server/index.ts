
import express from 'express';
import cors from 'cors';
import { randomBytes } from 'node:crypto';

import { adminAuth, adminDb } from './firebaseAdmin';
import { verifyAdmin } from './middleware/verifyAdmin';
import attendanceRouter from './routes/attendance';
import workLogsRouter from './routes/workLogs';

const app = express();
const PORT = Number(process.env.API_PORT || 4000);

app.use(
    cors({
        origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
    })
);

app.use(express.json({ limit: '2mb' }));

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
});

// Attendance routes
app.use('/api/attendance', attendanceRouter);
// Work log routes
app.use('/api/work-logs', workLogsRouter);

// TEMPORARY: Administrator account repair endpoint.
// Remove this endpoint after the administrator account has been repaired.
app.post('/api/admin/repair-auth-account', verifyAdmin, async (req, res) => {
    try {
        const { uid, email, password } = req.body ?? {};

        if (
            uid !== 'user_admin' ||
            email !== 'admin@teara.internal' ||
            typeof password !== 'string' ||
            password.length < 8
        ) {
            res.status(400).json({ error: 'Invalid account details.' });
            return;
        }

        const profileRef = adminDb.collection('users').doc(uid);
        const profileSnapshot = await profileRef.get();

        if (!profileSnapshot.exists) {
            res.status(404).json({
                error: 'Existing Firestore profile not found.',
            });
            return;
        }

        const profile = profileSnapshot.data();

        if (
            profile?.role !== 'admin' ||
            profile?.email?.toLowerCase() !== email
        ) {
            res.status(403).json({
                error: 'Existing administrator profile does not match.',
            });
            return;
        }

        const existingAuthUser = await adminAuth.getUser(uid).catch((error) => {
            if (error.code === 'auth/user-not-found') return null;
            throw error;
        });

        if (existingAuthUser) {
            res.status(409).json({
                error: 'Authentication account already exists for this UID.',
            });
            return;
        }

        const emailOwner = await adminAuth.getUserByEmail(email).catch((error) => {
            if (error.code === 'auth/user-not-found') return null;
            throw error;
        });

        if (emailOwner) {
            res.status(409).json({
                error: 'This email already belongs to another Authentication UID. Manual reconciliation is required.',
            });
            return;
        }

        await adminAuth.createUser({
            uid,
            email,
            password,
            displayName: profile.name || 'Admin',
            disabled: profile.accountStatus !== 'active',
        });

        res.status(201).json({
            message: 'Administrator Authentication account created.',
            uid,
            email,
        });
    } catch (error) {
        console.error('Administrator account repair failed:', error);
        res.status(500).json({
            error: 'Unable to create administrator Authentication account.',
        });
    }
});

// Resolve a username to an email for Firebase Authentication.
// Returns only the email, never the employee profile.
app.post('/api/auth/resolve-username', async (req, res) => {
    try {
        const { username } = req.body ?? {};

        if (
            typeof username !== 'string' ||
            !/^[a-zA-Z0-9._-]{3,30}$/.test(username)
        ) {
            res.status(400).json({ error: 'Invalid username.' });
            return;
        }

        const snapshot = await adminDb
            .collection('users')
            .where('username', '==', username)
            .limit(1)
            .get();

        if (snapshot.empty) {
            res.status(404).json({ error: 'Username not found.' });
            return;
        }

        const profile = snapshot.docs[0].data();

        if (profile.accountStatus !== 'active' || !profile.email) {
            res.status(403).json({
                error: 'This account is not active.',
            });
            return;
        }

        res.json({ email: profile.email });
    } catch (error) {
        console.error('Username resolution failed:', error);
        res.status(500).json({
            error: 'Unable to resolve username.',
        });
    }
});

// Get all users for administrator diagnostics.
app.get('/api/admin/diagnostics/users', verifyAdmin, async (_req, res) => {
    try {
        const snapshot = await adminDb.collection('users').get();

        const users = snapshot.docs.map((doc) => {
            const data = doc.data();

            return {
                uid: doc.id,
                username: data.username,
                name: data.name,
                email: data.email,
                role: data.role,
                department: data.department,
                accountStatus: data.accountStatus,
            };
        });

        res.json({ users });
    } catch (error) {
        console.error('User diagnostics failed:', error);
        res.status(500).json({
            error: 'Unable to retrieve user diagnostics.',
        });
    }
});

// Get all employee and administrator profiles for the directory.
app.get('/api/admin/users', verifyAdmin, async (_req, res) => {
    try {
        const snapshot = await adminDb.collection('users').get();

        const users: Record<string, any>[] = snapshot.docs
            .map((userDoc): Record<string, any> => {
                const data = userDoc.data();

                // Exclude password-related fields from the response.
                const {
                    password,
                    passwordHash,
                    ...safeProfile
                } = data;

                return {
                    ...safeProfile,
                    uid: userDoc.id,
                };
            })
            .sort((a, b) => {
                const nameA = String(a.name || '');
                const nameB = String(b.name || '');

                return nameA.localeCompare(nameB);
            });

        res.status(200).json({ users });
    } catch (error) {
        console.error(
            'Admin employee directory retrieval failed:',
            error
        );

        res.status(500).json({
            error: 'Unable to retrieve employee directory.',
        });
    }
});

// Create an employee account.
app.post('/api/admin/users', verifyAdmin, async (req, res) => {
    try {
        const {
            name,
            email,
            username,
            department,
            jobTitle,
            workModePreference,
        } = req.body ?? {};

        if (
            typeof name !== 'string' ||
            !name.trim() ||
            typeof email !== 'string' ||
            !email.trim() ||
            typeof username !== 'string' ||
            !/^[a-zA-Z0-9._-]{3,30}$/.test(username) ||
            typeof department !== 'string' ||
            !department.trim()
        ) {
            res.status(400).json({
                error: 'Name, email, valid username and department are required.',
            });
            return;
        }

        const usernameSnapshot = await adminDb
            .collection('users')
            .where('username', '==', username)
            .limit(1)
            .get();

        if (!usernameSnapshot.empty) {
            res.status(409).json({ error: 'Username already exists.' });
            return;
        }

        const temporaryPassword = randomBytes(32).toString('hex');

        const authUser = await adminAuth.createUser({
            email: email.trim().toLowerCase(),
            password: temporaryPassword,
            displayName: name.trim(),
            disabled: false,
        });

        const now = new Date().toISOString();

        try {
            await adminDb.collection('users').doc(authUser.uid).set({
                uid: authUser.uid,
                name: name.trim(),
                email: email.trim().toLowerCase(),
                username,
                role: 'employee',
                department: department.trim(),
                jobTitle:
                    typeof jobTitle === 'string' ? jobTitle.trim() : '',
                workModePreference:
                    ['office', 'home', 'hybrid'].includes(workModePreference)
                        ? workModePreference
                        : 'hybrid',
                accountStatus: 'active',
                createdAt: now,
                updatedAt: now,
            });
        } catch (profileError) {
            await adminAuth.deleteUser(authUser.uid).catch(() => undefined);
            throw profileError;
        }

        const passwordSetupLink = await adminAuth.generatePasswordResetLink(
            email.trim().toLowerCase()
        );

        res.status(201).json({
            message: 'Employee account created.',
            uid: authUser.uid,
            passwordSetupLink,
        });
    } catch (error: any) {
        console.error('Employee creation failed:', error);

        if (error?.code === 'auth/email-already-exists') {
            res.status(409).json({ error: 'Email already exists.' });
            return;
        }

        res.status(500).json({
            error: 'Unable to create employee account.',
        });
    }
});

// Activate or deactivate an employee account.
app.patch('/api/admin/users/:uid/status', verifyAdmin, async (req, res) => {
    try {
        const { uid } = req.params;
        const { accountStatus } = req.body ?? {};

        if (!['active', 'inactive'].includes(accountStatus)) {
            res.status(400).json({
                error: 'Invalid account status.',
            });
            return;
        }

        const profileRef = adminDb.collection('users').doc(uid);
        const profileSnapshot = await profileRef.get();

        if (!profileSnapshot.exists) {
            res.status(404).json({ error: 'User not found.' });
            return;
        }

        const profile = profileSnapshot.data();

        if (profile?.role === 'admin') {
            res.status(403).json({
                error: 'Administrator accounts cannot be disabled here.',
            });
            return;
        }

        await adminAuth.updateUser(uid, {
            disabled: accountStatus === 'inactive',
        });

        await profileRef.update({
            accountStatus,
            updatedAt: new Date().toISOString(),
        });

        res.json({
            message: 'Account status updated.',
            uid,
            accountStatus,
        });
    } catch (error) {
        console.error('Account status update failed:', error);
        res.status(500).json({
            error: 'Unable to update account status.',
        });
    }
});

app.listen(PORT, () => {
    console.log(`Teara WorkHub API running on port ${PORT}`);
});
