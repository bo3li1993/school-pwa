const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// ============================================================
// ط£ط¯ظˆط§طھ ظ…ط³ط§ط¹ط¯ط©: ط­ط¯ ظ…ط­ط§ظˆظ„ط§طھ ط§ظ„ط¯ط®ظˆظ„ ط§ظ„ظپط§ط´ظ„ط© (Rate Limiting)
// 5 ظ…ط­ط§ظˆظ„ط§طھ ظپط§ط´ظ„ط© â†’ ظ‚ظپظ„ 15 ط¯ظ‚ظٹظ‚ط©
// ============================================================
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

async function checkRateLimit(identifier) {
    const ref = db.collection('login_attempts').doc(identifier);
    const snap = await ref.get();
    if (!snap.exists) return { locked: false };

    const data = snap.data();
    const lastAttempt = data.lastAttempt?.toDate ? data.lastAttempt.toDate() : new Date(0);
    const minutesSince = (Date.now() - lastAttempt.getTime()) / 60000;

    if (data.count >= MAX_ATTEMPTS && minutesSince < LOCKOUT_MINUTES) {
        const remaining = Math.ceil(LOCKOUT_MINUTES - minutesSince);
        return { locked: true, remaining };
    }
    return { locked: false };
}

async function recordFailedAttempt(identifier) {
    const ref = db.collection('login_attempts').doc(identifier);
    const snap = await ref.get();
    const minutesSince = snap.exists && snap.data().lastAttempt?.toDate
        ? (Date.now() - snap.data().lastAttempt.toDate().getTime()) / 60000 : 999;

    // ظ„ظˆ ظ…ط±ظ‘ ظˆظ‚طھ ط£ط·ظˆظ„ ظ…ظ† ظپطھط±ط© ط§ظ„ظ‚ظپظ„طŒ ظ†ط¨ط¯ط£ ط§ظ„ط¹ط¯ ظ…ظ† ط¬ط¯ظٹط¯
    const newCount = (snap.exists && minutesSince < LOCKOUT_MINUTES) ? (snap.data().count || 0) + 1 : 1;

    await ref.set({ count: newCount, lastAttempt: admin.firestore.FieldValue.serverTimestamp() });
}

async function resetAttempts(identifier) {
    await db.collection('login_attempts').doc(identifier).delete().catch(() => {});
}

// ============================================================
// FUNCTION 1: loginUser â€” ظ…طµط§ط¯ظ‚ط© ط§ظ„ظ…ط³طھط®ط¯ظ…ظٹظ† (ظ…ظˆط¬ظˆط¯ط© ظˆظ…ظپط¹ظ‘ظ„ط©)
// ============================================================
exports.loginUser = onCall({ cors: [/bo3li1993\.github\.io$/, /localhost/], region: 'me-central1' }, async (request) => {
    const { schoolId, userId, password } = request.data;
    if (!userId || !password) throw new HttpsError('invalid-argument', 'userId ظˆ password ظ…ط·ظ„ظˆط¨ط§ظ†');

    const rateLimitKey = `user_${userId}`;
    const rateCheck = await checkRateLimit(rateLimitKey);
    if (rateCheck.locked) {
        throw new HttpsError('resource-exhausted', `ظ…ط­ط§ظˆظ„ط§طھ ظƒط«ظٹط±ط© ظپط§ط´ظ„ط© â€” ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ط¨ط¹ط¯ ${rateCheck.remaining} ط¯ظ‚ظٹظ‚ط©`);
    }

    // Super Admin â€” ظ„ط§ rate limitطŒ ظ‡ط§ط´ ط«ط§ط¨طھ ظپظ‚ط·
    if (userId === 'superadmin') {
        // ظپظƒ ط§ظ„ظ‚ظپظ„ طھظ„ظ‚ط§ط¦ظٹط§ظ‹ ظپظٹ ظƒظ„ ظ…ط­ط§ظˆظ„ط© ظ„ظ„ط³ظˆط¨ط± ط£ط¯ظ…ظ†
        await resetAttempts(rateLimitKey);

        const crypto = require('crypto');
        const hash = crypto.createHash('sha256').update(password).digest('hex');

        // ظ‡ط§ط´ ط«ط§ط¨طھ ظپظ‚ط· â€” ظ„ط§ ظٹط¹طھظ…ط¯ ط¹ظ„ظ‰ Firestore
        // ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط±: husainan@2026
        const SUPER_HASH = '07b4ba632fba1d0883ef24fad3afe2d0dd2c0f97993d505186ef656b431f7e18';

        if (hash !== SUPER_HASH) {
            throw new HttpsError('unauthenticated', 'ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ط؛ظٹط± طµط­ظٹط­ط©');
        }
        const token = await admin.auth().createCustomToken('superadmin', { role: 'superadmin', schoolId: 'system' });
        return { token, role: 'superadmin', schoolId: 'system', name: 'ط­ط³ظٹظ†', userId: 'superadmin' };
    }

    // Regular users
    let usersQuery = db.collection('users').where('userId', '==', userId);
    if (schoolId) usersQuery = usersQuery.where('schoolId', '==', schoolId);
    const snap = await usersQuery.limit(1).get();

    if (snap.empty) {
        await recordFailedAttempt(rateLimitKey);
        throw new HttpsError('not-found', 'ط§ظ„ظ…ط³طھط®ط¯ظ… ط؛ظٹط± ظ…ظˆط¬ظˆط¯');
    }

    const user = snap.docs[0].data();
    const crypto = require('crypto');
    const providedHash = crypto.createHash('sha256').update(password).digest('hex');

    // ظ†ط¯ط¹ظ… ط§ظ„ظ†ط¸ط§ظ…ظٹظ†: passHash ط§ظ„ط¬ط¯ظٹط¯ ط§ظ„ط¢ظ…ظ† (SHA-256)طŒ ط£ظˆ plainPass ط§ظ„ظ‚ط¯ظٹظ… ط§ظ„ظ…ظˆط±ظˆط« (طھظˆط§ظپظ‚ط§ظ‹ ط®ظ„ظپظٹط§ظ‹ ظ„ظ„ط­ط³ط§ط¨ط§طھ ط؛ظٹط± ط§ظ„ظ…ظڈط­ط¯ظژظ‘ط«ط© ط¨ط¹ط¯)
    const isValid = user.passHash ? (providedHash === user.passHash) : (user.plainPass === password);

    if (!isValid) {
        await recordFailedAttempt(rateLimitKey);
        throw new HttpsError('unauthenticated', 'ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ط؛ظٹط± طµط­ظٹط­ط©');
    }
    if (user.status === 'suspended') throw new HttpsError('permission-denied', 'ط§ظ„ط­ط³ط§ط¨ ظ…ظˆظ‚ظˆظپ');

    await resetAttempts(rateLimitKey);

    const schoolSnap = await db.collection('schools').doc(user.schoolId).get();
    const schoolData = schoolSnap.exists ? schoolSnap.data() : {};

    const token = await admin.auth().createCustomToken(snap.docs[0].id, {
        role: user.role,
        schoolId: user.schoolId,
        userId: user.userId
    });

    return {
        token,
        role: user.role,
        schoolId: user.schoolId,
        userId: user.userId,
        name: user.name || '',
        schoolName: schoolData.name || '',
        email: user.email || '',
        phone: user.phone || '',
        classId: user.classId || '',
        department: user.department || ''
    };
});

// ============================================================
// FUNCTION 2: onAttendanceCreated â€” ط¥ط´ط¹ط§ط± FCM ط¹ظ†ط¯ طھط³ط¬ظٹظ„ ط؛ظٹط§ط¨
// ============================================================
exports.onAttendanceCreated = onDocumentCreated({
    document: 'attendance/{docId}',
    region: 'me-central1'
}, async (event) => {
    const data = event.data.data();

    // ظپظ‚ط· ط§ظ„ط؛ظٹط§ط¨ (ظ…ط´ ط­ط¶ظˆط± ط£ظˆ طھط£ط®ظٹط±)
    if (data.status !== 'absent') return null;

    const { studentName, classId, period, date, schoolId } = data;

    try {
        // ط¬ظ„ط¨ ط¨ظٹط§ظ†ط§طھ ط§ظ„ط·ط§ظ„ط¨ (ط±ظ‚ظ… ظ‡ط§طھظپ ظˆظ„ظٹ ط§ظ„ط£ظ…ط±)
        const studentsSnap = await db.collection('students')
            .where('schoolId', '==', schoolId)
            .where('name', '==', studentName)
            .limit(1).get();

        if (studentsSnap.empty) return null;
        const student = studentsSnap.docs[0].data();
        const parentPhone = student.parentPhone;
        if (!parentPhone) return null;

        // ط¥ط¶ط§ظپط© ظ„ظ‚ط§ط¦ظ…ط© ط¥ط´ط¹ط§ط±ط§طھ ظˆط§طھط³ط§ط¨ (ظ„ظ„ط¥ط±ط³ط§ظ„ ط§ظ„ظٹط¯ظˆظٹ ط£ظˆ ط§ظ„ط³ظٹط±ظپط±)
        await db.collection('notifications_queue').add({
            schoolId,
            studentName,
            classId,
            period,
            date,
            parentPhone,
            message: `ط؛ظٹط§ط¨: ${studentName} â€” ط§ظ„ظپطµظ„ ${classId} â€” ط§ظ„ط­طµط© ${period} â€” ${date}`,
            type: 'absence',
            sent: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // ط¥ط±ط³ط§ظ„ FCM ظ„ظˆظ„ظٹ ط§ظ„ط£ظ…ط± (ظ„ظˆ ظ…ط³ط¬ظ‘ظ„)
        const usersWithToken = await db.collection('users')
            .where('schoolId', '==', schoolId)
            .where('parentPhone', '==', parentPhone)
            .where('fcmToken', '!=', '')
            .limit(3).get();

        if (!usersWithToken.empty) {
            const tokens = usersWithToken.docs
                .map(d => d.data().fcmToken)
                .filter(Boolean);

            if (tokens.length > 0) {
                await admin.messaging().sendEachForMulticast({
                    tokens,
                    notification: {
                        title: `ط؛ظٹط§ط¨: ${studentName}`,
                        body: `ط؛ط§ط¨ ط§ط¨ظ†ظƒظ… ط¨طھط§ط±ظٹط® ${date} â€” ط§ظ„ط­طµط© ${period}`
                    },
                    data: { schoolId, studentName, classId, type: 'absence' },
                    android: { priority: 'high' },
                    apns: { payload: { aps: { sound: 'default', badge: 1 } } }
                });
            }
        }

        return null;
    } catch (err) {
        console.error('onAttendanceCreated error:', err);
        return null;
    }
});

// ============================================================
// FUNCTION 3: generateMonthlyReport â€” طھظ‚ط±ظٹط± ط´ظ‡ط±ظٹ طھظ„ظ‚ط§ط¦ظٹ
// ظƒظ„ ط£ظˆظ„ ط§ظ„ط´ظ‡ط± ط§ظ„ط³ط§ط¹ط© 7 طµط¨ط§ط­ط§ظ‹ ط¨طھظˆظ‚ظٹطھ ط§ظ„ظƒظˆظٹطھ (UTC+3 = 04:00 UTC)
// ============================================================
exports.generateMonthlyReport = onSchedule({
    schedule: '0 4 1 * *',
    timeZone: 'Asia/Kuwait',
    region: 'me-central1'
}, async (event) => {
    console.log('ًں”„ Monthly Report: Starting...');

    // ط§ظ„ط´ظ‡ط± ط§ظ„ظ…ط§ط¶ظٹ
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const fromDate = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth()+1).padStart(2,'0')}-01`;
    const toDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth()+1, 0).toISOString().slice(0,10);
    const monthLabel = `${lastMonth.getFullYear()}/${String(lastMonth.getMonth()+1).padStart(2,'0')}`;

    // ط¬ظ„ط¨ ظƒظ„ ط§ظ„ظ…ط¯ط§ط±ط³ ط§ظ„ظ†ط´ط·ط©
    const schoolsSnap = await db.collection('schools').where('status', '==', 'active').get();
    console.log(`Found ${schoolsSnap.size} active schools`);

    for (const schoolDoc of schoolsSnap.docs) {
        const schoolId = schoolDoc.id;
        const schoolData = schoolDoc.data();

        try {
            // ط¥ط­طµط§ط¦ظٹط§طھ ط§ظ„ط؛ظٹط§ط¨
            const absSnap = await db.collection('attendance')
                .where('schoolId', '==', schoolId)
                .where('status', '==', 'absent')
                .where('date', '>=', fromDate)
                .where('date', '<=', toDate)
                .get();

            const lateSnap = await db.collection('attendance')
                .where('schoolId', '==', schoolId)
                .where('status', '==', 'late')
                .where('date', '>=', fromDate)
                .where('date', '<=', toDate)
                .get();

            // ط¥ط­طµط§ط¦ظٹط§طھ ط§ظ„ط³ظ„ظˆظƒ
            const behSnap = await db.collection('behavior')
                .where('schoolId', '==', schoolId)
                .where('date', '>=', fromDate)
                .where('date', '<=', toDate)
                .get();

            // ط¥ط­طµط§ط¦ظٹط§طھ ط§ظ„ط§ط³طھط¦ط°ط§ظ†
            const gateSnap = await db.collection('gatepass')
                .where('schoolId', '==', schoolId)
                .where('dateStr', '>=', fromDate)
                .where('dateStr', '<=', toDate)
                .get();

            // ط¥ط­طµط§ط¦ظٹط§طھ ط§ظ„ط¹ظٹط§ط¯ط©
            const clinicSnap = await db.collection('clinic')
                .where('schoolId', '==', schoolId)
                .where('dateStr', '>=', fromDate)
                .where('dateStr', '<=', toDate)
                .get();

            // طھط¬ظ…ظٹط¹ ط¨ط§ظ„ظپطµظ„ ظˆط§ظ„ط·ط§ظ„ط¨
            const absenceByClass = {};
            const absenceByStudent = {};
            let positiveBeh = 0, negativeBeh = 0;

            absSnap.forEach(d => {
                const dd = d.data();
                absenceByClass[dd.classId] = (absenceByClass[dd.classId] || 0) + 1;
                absenceByStudent[dd.studentName] = (absenceByStudent[dd.studentName] || 0) + 1;
            });

            behSnap.forEach(d => {
                if (d.data().type === 'ط¥ظٹط¬ط§ط¨ظٹ') positiveBeh++;
                else if (d.data().type === 'ط³ظ„ط¨ظٹ') negativeBeh++;
            });

            // ط£ظƒط«ط± 10 ط·ظ„ط§ط¨ ط؛ظٹط§ط¨ط§ظ‹
            const topAbsentees = Object.entries(absenceByStudent)
                .sort((a,b) => b[1]-a[1]).slice(0,10)
                .map(([name, count]) => ({ name, count }));

            // ط­ظپط¸ ط§ظ„طھظ‚ط±ظٹط± ط¨ظ€ Firestore
            await db.collection('monthly_reports').add({
                schoolId,
                schoolName: schoolData.name || '',
                month: monthLabel,
                fromDate,
                toDate,
                stats: {
                    totalAbsences: absSnap.size,
                    totalLate: lateSnap.size,
                    totalGatepass: gateSnap.size,
                    totalClinic: clinicSnap.size,
                    positiveBehavior: positiveBeh,
                    negativeBehavior: negativeBeh,
                    absenceByClass,
                    topAbsentees
                },
                generatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log(`âœ… Report generated for ${schoolId}: ${absSnap.size} absences`);
        } catch (err) {
            console.error(`â‌Œ Error for ${schoolId}:`, err);
        }
    }

    return null;
});

// ============================================================
// FUNCTION 4: generateReportNow â€” طھظˆظ„ظٹط¯ طھظ‚ط±ظٹط± ظپظˆط±ظٹ (Callable)
// ظٹظڈط³طھط¯ط¹ظ‰ ظ…ظ† super.html ط£ظˆ admin.html ظ„طھظˆظ„ظٹط¯ طھظ‚ط±ظٹط± ط£ظٹ ط´ظ‡ط±
// ============================================================
exports.generateReportNow = onCall({ cors: [/bo3li1993\.github\.io$/, /localhost/], region: 'me-central1' }, async (request) => {
    const { schoolId, fromDate, toDate, monthLabel } = request.data;
    if (!schoolId || !fromDate || !toDate) throw new HttpsError('invalid-argument', 'schoolId ظˆ fromDate ظˆ toDate ظ…ط·ظ„ظˆط¨ط©');

    const absSnap = await db.collection('attendance')
        .where('schoolId', '==', schoolId)
        .where('status', '==', 'absent')
        .where('date', '>=', fromDate)
        .where('date', '<=', toDate).get();

    const lateSnap = await db.collection('attendance')
        .where('schoolId', '==', schoolId)
        .where('status', '==', 'late')
        .where('date', '>=', fromDate)
        .where('date', '<=', toDate).get();

    const behSnap = await db.collection('behavior')
        .where('schoolId', '==', schoolId)
        .where('date', '>=', fromDate)
        .where('date', '<=', toDate).get();

    const gateSnap = await db.collection('gatepass')
        .where('schoolId', '==', schoolId)
        .where('dateStr', '>=', fromDate)
        .where('dateStr', '<=', toDate).get();

    const absenceByClass = {};
    const absenceByStudent = {};
    let positiveBeh = 0, negativeBeh = 0;

    absSnap.forEach(d => {
        const dd = d.data();
        absenceByClass[dd.classId] = (absenceByClass[dd.classId]||0) + 1;
        absenceByStudent[dd.studentName] = (absenceByStudent[dd.studentName]||0) + 1;
    });
    behSnap.forEach(d => {
        if (d.data().type === 'ط¥ظٹط¬ط§ط¨ظٹ') positiveBeh++;
        else if (d.data().type === 'ط³ظ„ط¨ظٹ') negativeBeh++;
    });

    const topAbsentees = Object.entries(absenceByStudent)
        .sort((a,b)=>b[1]-a[1]).slice(0,10)
        .map(([name,count])=>({name,count}));

    const ref = await db.collection('monthly_reports').add({
        schoolId,
        month: monthLabel || fromDate.slice(0,7),
        fromDate, toDate,
        stats: {
            totalAbsences: absSnap.size,
            totalLate: lateSnap.size,
            totalGatepass: gateSnap.size,
            positiveBehavior: positiveBeh,
            negativeBehavior: negativeBeh,
            absenceByClass,
            topAbsentees
        },
        generatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, reportId: ref.id, stats: { totalAbsences: absSnap.size, totalLate: lateSnap.size } };
});

// ============================================================
// FUNCTION 5: changeSuperPassword â€” طھط؛ظٹظٹط± ظƒظ„ظ…ط© ظ…ط±ظˆط± ط§ظ„ط³ظˆط¨ط± ط£ط¯ظ…ظ† ط¨ط£ظ…ط§ظ†
// ظٹطھط­ظ‚ظ‚ ظ…ظ† ط§ظ„ظƒظ„ظ…ط© ط§ظ„ط­ط§ظ„ظٹط© server-side ظ‚ط¨ظ„ ط§ظ„ط­ظپط¸ ط¨ظ€ Firestore
// ============================================================
exports.changeSuperPassword = onCall({ cors: [/bo3li1993\.github\.io$/, /localhost/], region: 'me-central1' }, async (request) => {
    const { currentPassword, newPassword } = request.data;
    if (!currentPassword || !newPassword) throw new HttpsError('invalid-argument', 'ط§ظ„ط­ظ‚ظˆظ„ ظ…ط·ظ„ظˆط¨ط©');
    if (newPassword.length < 6) throw new HttpsError('invalid-argument', 'ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ط§ظ„ط¬ط¯ظٹط¯ط© ظ‚طµظٹط±ط© ط¬ط¯ط§ظ‹');

    const crypto = require('crypto');
    const currentHash = crypto.createHash('sha256').update(currentPassword).digest('hex');

    // ط¬ظ„ط¨ ط§ظ„ظ€ hash ط§ظ„ط­ط§ظ„ظٹ ط§ظ„ظ…ط®ط²ظ‘ظ† (ظ…ظ† system_config ط£ظˆ ط§ظ„ط§ظپطھط±ط§ط¶ظٹ)
    const configSnap = await db.collection('system_config').where('key', '==', 'super_pass_hash').limit(1).get();
    const DEFAULT_HASH = 'e2fedb220c651a45d88c3237fd27e98b4ed6daf5c83b66f6988b36a215528fe2';
    const storedHash = configSnap.empty ? DEFAULT_HASH : configSnap.docs[0].data().value;

    if (currentHash !== storedHash) throw new HttpsError('unauthenticated', 'ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ط§ظ„ط­ط§ظ„ظٹط© ط؛ظٹط± طµط­ظٹط­ط©');

    const newHash = crypto.createHash('sha256').update(newPassword).digest('hex');

    if (configSnap.empty) {
        await db.collection('system_config').add({
            key: 'super_pass_hash', value: newHash, updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    } else {
        await configSnap.docs[0].ref.update({ value: newHash, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    }

    return { success: true };
});

// ============================================================
// FUNCTION 6: registerParent â€” طھط³ط¬ظٹظ„ ط­ط³ط§ط¨ ظˆظ„ظٹ ط£ظ…ط± ط¬ط¯ظٹط¯
// ظٹظڈظ†ط´ط¦ ط­ط³ط§ط¨ ط¨ط§ظ„ط±ظ‚ظ… ط§ظ„ظ…ط¯ظ†ظٹ ظˆظٹظڈطµط¯ط± Custom Token ظ„طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„ ط§ظ„ظپظˆط±ظٹ
// ============================================================
exports.registerParent = onCall({ cors: [/bo3li1993\.github\.io$/, /localhost/], region: 'me-central1' }, async (request) => {
    const { schoolId, civilId, phone, password } = request.data;
    if (!schoolId || !civilId || !phone || !password) {
        throw new HttpsError('invalid-argument', 'ط¬ظ…ظٹط¹ ط§ظ„ط­ظ‚ظˆظ„ ظ…ط·ظ„ظˆط¨ط©');
    }
    if (!/^\d{5,15}$/.test(civilId)) throw new HttpsError('invalid-argument', 'ط§ظ„ط±ظ‚ظ… ط§ظ„ظ…ط¯ظ†ظٹ ط؛ظٹط± طµط­ظٹط­');
    if (password.length < 6) throw new HttpsError('invalid-argument', 'ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ظ‚طµظٹط±ط© ط¬ط¯ط§ظ‹');

    const accountId = `${schoolId}_${civilId}`;
    const accountRef = db.collection('parent_accounts').doc(accountId);
    const existing = await accountRef.get();
    if (existing.exists) throw new HttpsError('already-exists', 'ظ‡ط°ط§ ط§ظ„ط±ظ‚ظ… ط§ظ„ظ…ط¯ظ†ظٹ ظ…ط³ط¬ظ‘ظ„ ظ…ط³ط¨ظ‚ط§ظ‹');

    const crypto = require('crypto');
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

    await accountRef.set({
        civilId, schoolId, phone, passwordHash,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const token = await admin.auth().createCustomToken(accountId, { role: 'parent', schoolId, civilId });
    return { token, schoolId, civilId };
});

// ============================================================
// FUNCTION 7: loginParent â€” طھط³ط¬ظٹظ„ ط¯ط®ظˆظ„ ظˆظ„ظٹ ط§ظ„ط£ظ…ط± ط¨ط§ظ„ط±ظ‚ظ… ط§ظ„ظ…ط¯ظ†ظٹ
// ============================================================
exports.loginParent = onCall({ cors: [/bo3li1993\.github\.io$/, /localhost/], region: 'me-central1' }, async (request) => {
    const { schoolId, civilId, password } = request.data;
    if (!civilId || !password) throw new HttpsError('invalid-argument', 'ط§ظ„ط±ظ‚ظ… ط§ظ„ظ…ط¯ظ†ظٹ ظˆظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ظ…ط·ظ„ظˆط¨ط§ظ†');

    const rateLimitKey = `parent_${civilId}`;
    const rateCheck = await checkRateLimit(rateLimitKey);
    if (rateCheck.locked) {
        throw new HttpsError('resource-exhausted', `ظ…ط­ط§ظˆظ„ط§طھ ظƒط«ظٹط±ط© ظپط§ط´ظ„ط© â€” ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ط¨ط¹ط¯ ${rateCheck.remaining} ط¯ظ‚ظٹظ‚ط©`);
    }

    const crypto = require('crypto');
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

    let accountData = null;
    let matchedSchoolId = schoolId;

    if (schoolId) {
        const accSnap = await db.collection('parent_accounts').doc(`${schoolId}_${civilId}`).get();
        if (accSnap.exists) accountData = accSnap.data();
    } else {
        const q = await db.collection('parent_accounts').where('civilId', '==', civilId).get();
        if (q.size === 1) {
            accountData = q.docs[0].data();
            matchedSchoolId = accountData.schoolId;
        } else if (q.size > 1) {
            throw new HttpsError('failed-precondition', 'ظٹط±ط¬ظ‰ ط§ط³طھط®ط¯ط§ظ… ط±ط§ط¨ط· ظ…ط¯ط±ط³طھظƒ ط§ظ„ط®ط§طµ ظ„طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„');
        }
    }

    if (!accountData || accountData.passwordHash !== passwordHash) {
        await recordFailedAttempt(rateLimitKey);
        throw new HttpsError('unauthenticated', 'ط§ظ„ط±ظ‚ظ… ط§ظ„ظ…ط¯ظ†ظٹ ط£ظˆ ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ط؛ظٹط± طµط­ظٹط­ط©');
    }

    await resetAttempts(rateLimitKey);

    const accountId = `${matchedSchoolId}_${civilId}`;
    const token = await admin.auth().createCustomToken(accountId, { role: 'parent', schoolId: matchedSchoolId, civilId });
    return { token, schoolId: matchedSchoolId, civilId };
});

// ============================================================
// FUNCTION 8: getRegistrationClasses â€” ط¬ظ„ط¨ ظ‚ط§ط¦ظ…ط© ط§ظ„ظپطµظˆظ„ (ط¨ط¯ظˆظ† ط­ط§ط¬ط© ظ„طھط³ط¬ظٹظ„ ط¯ط®ظˆظ„)
// ظٹظڈط³طھط®ط¯ظ… ظپظ‚ط· ط¨طµظپط­ط© طھط³ط¬ظٹظ„ ظˆظ„ظٹ ط§ظ„ط£ظ…ط± ط§ظ„ط¬ط¯ظٹط¯طŒ ظٹط±ط¬ط¹ ط£ط³ظ…ط§ط، ط§ظ„ظپطµظˆظ„ ظپظ‚ط· (ط¨ظٹط§ظ†ط§طھ ط؛ظٹط± ط­ط³ط§ط³ط©)
// ============================================================
exports.getRegistrationClasses = onCall({ cors: [/bo3li1993\.github\.io$/, /localhost/], region: 'me-central1' }, async (request) => {
    const { schoolId } = request.data;
    if (!schoolId) throw new HttpsError('invalid-argument', 'schoolId ظ…ط·ظ„ظˆط¨');

    // ظ†ط¬ط±ط¨ classes collection ط£ظˆظ„ط§ظ‹ (ط£ط®ظپ ظˆط£ط³ط±ط¹)
    const classesSnap = await db.collection('classes').where('schoolId', '==', schoolId).get();
    if (!classesSnap.empty) {
        const classes = [...new Set(classesSnap.docs.map(d => d.data().classId).filter(Boolean))];
        return { classes: classes.sort((a, b) => a.localeCompare(b)) };
    }

    // fallback: ظ…ط³ط­ students ظ„ط§ط³طھط®ط±ط§ط¬ ط§ظ„ظپطµظˆظ„
    const studentsSnap = await db.collection('students').where('schoolId', '==', schoolId).get();
    const classes = [...new Set(studentsSnap.docs.map(d => d.data().classId).filter(Boolean))];
    return { classes: classes.sort((a, b) => a.localeCompare(b)) };
});

// ============================================================
// FUNCTION 9: getRegistrationStudents â€” ط¬ظ„ط¨ ط£ط³ظ…ط§ط، ط·ظ„ط§ط¨ ظپطµظ„ ظ…ط¹ظٹظ‘ظ† (ط¨ط¯ظˆظ† طھط³ط¬ظٹظ„ ط¯ط®ظˆظ„)
// ظٹط±ط¬ط¹ ظپظ‚ط· id + name (ط¨ط¯ظˆظ† ظ‡ط§طھظپ ط£ظˆ ط±ظ‚ظ… ظ…ط¯ظ†ظٹطŒ ط­ظ…ط§ظٹط© ظ„ظ„ط®طµظˆطµظٹط©)
// ============================================================
exports.getRegistrationStudents = onCall({ cors: [/bo3li1993\.github\.io$/, /localhost/], region: 'me-central1' }, async (request) => {
    const { schoolId, classId } = request.data;
    if (!schoolId || !classId) throw new HttpsError('invalid-argument', 'schoolId ظˆ classId ظ…ط·ظ„ظˆط¨ط§ظ†');

    const snap = await db.collection('students')
        .where('schoolId', '==', schoolId)
        .where('classId', '==', classId)
        .get();

    const students = snap.docs
        .map(d => ({ id: d.id, name: d.data().name || '' }))
        .filter(s => s.name)
        .sort((a, b) => a.name.localeCompare(b.name, 'ar'));

    return { students };
});

// ============================================================
// FUNCTION 10: changeParentPassword â€” طھط؛ظٹظٹط± ظƒظ„ظ…ط© ظ…ط±ظˆط± ظˆظ„ظٹ ط§ظ„ط£ظ…ط± ط¨ط£ظ…ط§ظ†
// ظٹطھط­ظ‚ظ‚ ظ…ظ† ط§ظ„ظƒظ„ظ…ط© ط§ظ„ط­ط§ظ„ظٹط© server-side ظ‚ط¨ظ„ ط§ظ„ط­ظپط¸ ط¨ظ€ Firestore
// ============================================================
exports.changeParentPassword = onCall({ cors: [/bo3li1993\.github\.io$/, /localhost/], region: 'me-central1' }, async (request) => {
    const { schoolId, civilId, currentPassword, newPassword } = request.data;
    if (!schoolId || !civilId || !currentPassword || !newPassword) {
        throw new HttpsError('invalid-argument', 'ط¬ظ…ظٹط¹ ط§ظ„ط­ظ‚ظˆظ„ ظ…ط·ظ„ظˆط¨ط©');
    }
    if (newPassword.length < 6) throw new HttpsError('invalid-argument', 'ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ط§ظ„ط¬ط¯ظٹط¯ط© ظ‚طµظٹط±ط© ط¬ط¯ط§ظ‹');

    const crypto = require('crypto');
    const currentHash = crypto.createHash('sha256').update(currentPassword).digest('hex');

    const accountId = `${schoolId}_${civilId}`;
    const accountRef = db.collection('parent_accounts').doc(accountId);
    const accountSnap = await accountRef.get();

    if (!accountSnap.exists) throw new HttpsError('not-found', 'ط§ظ„ط­ط³ط§ط¨ ط؛ظٹط± ظ…ظˆط¬ظˆط¯');
    if (accountSnap.data().passwordHash !== currentHash) {
        throw new HttpsError('unauthenticated', 'ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ط§ظ„ط­ط§ظ„ظٹط© ط؛ظٹط± طµط­ظٹط­ط©');
    }

    const newHash = crypto.createHash('sha256').update(newPassword).digest('hex');
    await accountRef.update({ passwordHash: newHash, updatedAt: admin.firestore.FieldValue.serverTimestamp() });

    return { success: true };
});
// ============================================================
// FUNCTION 11: promoteStudents â€” ط§ظ„طھط±ط­ظٹظ„ ط§ظ„ط³ظ†ظˆظٹ ط§ظ„ط´ط§ظ…ظ„
// ظٹط±ظپط¹ ظƒظ„ ط·ط§ظ„ط¨ طµظپط§ظ‹ ظˆط§ط­ط¯ط§ظ‹ (ظ†ظپط³ ط§ظ„ط´ط¹ط¨ط©)طŒ ظٹط¤ط±ط´ظپ طµظپ 9 ظƒط®ط±ظٹط¬ظٹظ†طŒ
// ظˆظٹط³ظ… ظƒظ„ ط§ظ„ط³ط¬ظ„ط§طھ ط§ظ„ط­ط§ظ„ظٹط© ط¨ط§ظ„ط³ظ†ط© ط§ظ„ط¯ط±ط§ط³ظٹط© ظ‚ط¨ظ„ ط§ظ„طھط±ط­ظٹظ„
// ============================================================
exports.promoteStudents = onCall({ cors: [/bo3li1993\.github\.io$/, /localhost/], region: 'me-central1' }, async (request) => {
    if (!request.auth || !['admin', 'assistant_manager'].includes(request.auth.token.role)) {
        throw new HttpsError('permission-denied', 'ظ‡ط°ط§ ط§ظ„ط¥ط¬ط±ط§ط، ظٹطھط·ظ„ط¨ طµظ„ط§ط­ظٹط© ظ…ط¯ظٹط±');
    }

    const { schoolId, academicYearLabel } = request.data;
    if (!schoolId) throw new HttpsError('invalid-argument', 'schoolId ظ…ط·ظ„ظˆط¨');
    if (request.auth.token.schoolId !== schoolId) {
        throw new HttpsError('permission-denied', 'ظ„ط§ ظٹظ…ظƒظ†ظƒ طھط±ط­ظٹظ„ ظ…ط¯ط±ط³ط© ط£ط®ط±ظ‰');
    }

    const now = new Date();
    const startYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
    const yearLabel = academicYearLabel || `${startYear}-${startYear + 1}`;

    // ===== ط§ظ„ط®ط·ظˆط© 1: طھط³ظ…ظٹط© ظƒظ„ ط§ظ„ط³ط¬ظ„ط§طھ ط؛ظٹط± ط§ظ„ظ…ظˆط³ظˆظ…ط© ط¨ط¹ط¯ ط¨ط§ظ„ط³ظ†ط© ط§ظ„ط¯ط±ط§ط³ظٹط© =====
    const recordCollections = ['attendance', 'behavior', 'gatepass', 'clinic'];
    const taggedCounts = {};

    for (const colName of recordCollections) {
        const snap = await db.collection(colName).where('schoolId', '==', schoolId).get();
        let batch = db.batch();
        let opCount = 0;
        let taggedTotal = 0;

        for (const docSnap of snap.docs) {
            const data = docSnap.data();
            if (!data.academicYear) {
                batch.update(docSnap.ref, { academicYear: yearLabel });
                opCount++;
                taggedTotal++;
                if (opCount >= 450) {
                    await batch.commit();
                    batch = db.batch();
                    opCount = 0;
                }
            }
        }
        if (opCount > 0) await batch.commit();
        taggedCounts[colName] = taggedTotal;
    }

    // ===== ط§ظ„ط®ط·ظˆط© 2: طھط±ط­ظٹظ„ ط§ظ„ط·ظ„ط§ط¨ =====
    const studentsSnap = await db.collection('students').where('schoolId', '==', schoolId).get();
    let promoted = 0, graduated = 0, skipped = 0;
    let batch2 = db.batch();
    let opCount2 = 0;
    const newClassesSet = new Set();

    for (const docSnap of studentsSnap.docs) {
        const data = docSnap.data();
        const classId = data.classId || '';
        const parts = classId.split('/');

        if (parts.length !== 2) { skipped++; continue; }
        const grade = parseInt(parts[0]);
        const section = parts[1];
        if (isNaN(grade)) { skipped++; continue; }

        if (grade >= 9) {
            const graduateRef = db.collection('graduates').doc();
            batch2.set(graduateRef, {
                ...data,
                originalId: docSnap.id,
                graduatedAt: admin.firestore.FieldValue.serverTimestamp(),
                academicYearGraduated: yearLabel
            });
            batch2.delete(docSnap.ref);
            graduated++;
        } else {
            const newClassId = `${grade + 1}/${section}`;
            batch2.update(docSnap.ref, { classId: newClassId });
            newClassesSet.add(newClassId);
            promoted++;
        }

        opCount2++;
        if (opCount2 >= 450) {
            await batch2.commit();
            batch2 = db.batch();
            opCount2 = 0;
        }
    }
    if (opCount2 > 0) await batch2.commit();

    // ===== ط§ظ„ط®ط·ظˆط© 3: طھط­ط¯ظٹط« ظƒظˆظ„ظƒط´ظ† classes ط¨ط§ظ„ظپطµظˆظ„ ط§ظ„ط¬ط¯ظٹط¯ط© =====
    if (newClassesSet.size > 0) {
        const batch3 = db.batch();
        newClassesSet.forEach(c => {
            const ref = db.collection('classes').doc(`${schoolId}_${c.replace('/', '-')}`);
            batch3.set(ref, { schoolId, classId: c, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        });
        await batch3.commit();
    }

    // ===== ط§ظ„ط®ط·ظˆط© 4: ط­ظپط¸ ط³ط¬ظ„ ط§ظ„طھط±ط­ظٹظ„ ظ†ظپط³ظ‡ =====
    await db.collection('promotion_logs').add({
        schoolId, yearLabel, promoted, graduated, skipped,
        taggedCounts, performedBy: request.auth.token.userId || 'admin',
        performedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, promoted, graduated, skipped, taggedCounts, yearLabel };
});

// ============================================================
// FUNCTION 12: resetUserPassword â€” ط¥ط¹ط§ط¯ط© طھط¹ظٹظٹظ† ظƒظ„ظ…ط© ظ…ط±ظˆط± ظ…ظˆط¸ظپ (Admin ظپظ‚ط·)
// ظٹط³طھط®ط¯ظ… SHA-256 hash ط¨ط¯ظ„ ط§ظ„ظ†طµ ط§ظ„طµط±ظٹط­ â€” ظٹط­ظ„ ط«ط؛ط±ط© plainPass طھط¯ط±ظٹط¬ظٹط§ظ‹
// ============================================================
exports.resetUserPassword = onCall({ cors: [/bo3li1993\.github\.io$/, /localhost/], region: 'me-central1' }, async (request) => {
    if (!request.auth || !['admin', 'assistant_manager'].includes(request.auth.token.role)) {
        throw new HttpsError('permission-denied', 'ظ‡ط°ط§ ط§ظ„ط¥ط¬ط±ط§ط، ظٹطھط·ظ„ط¨ طµظ„ط§ط­ظٹط© ظ…ط¯ظٹط±');
    }

    const { userDocId, newPassword } = request.data;
    if (!userDocId || !newPassword) throw new HttpsError('invalid-argument', 'ط§ظ„ط­ظ‚ظˆظ„ ظ…ط·ظ„ظˆط¨ط©');
    if (newPassword.length < 4) throw new HttpsError('invalid-argument', 'ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ظ‚طµظٹط±ط© ط¬ط¯ط§ظ‹');

    const userRef = db.collection('users').doc(userDocId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) throw new HttpsError('not-found', 'ط§ظ„ظ…ط³طھط®ط¯ظ… ط؛ظٹط± ظ…ظˆط¬ظˆط¯');
    if (userSnap.data().schoolId !== request.auth.token.schoolId) {
        throw new HttpsError('permission-denied', 'ظ„ط§ ظٹظ…ظƒظ†ظƒ طھط¹ط¯ظٹظ„ ظ…ظˆط¸ظپ ط¨ظ…ط¯ط±ط³ط© ط£ط®ط±ظ‰');
    }

    const crypto = require('crypto');
    const passHash = crypto.createHash('sha256').update(newPassword).digest('hex');

    // ظ†ط­ط°ظپ plainPass ط§ظ„ظ‚ط¯ظٹظ… (ظ„ظˆ ظ…ظˆط¬ظˆط¯) ظˆظ†ط­ظپط¸ passHash ط§ظ„ط¢ظ…ظ† ط¨ط¯ظ„ط§ظ‹ ظ…ظ†ظ‡
    await userRef.update({
        passHash,
        plainPass: admin.firestore.FieldValue.delete()
    });

    return { success: true };
});
// ============================================================
// FUNCTION 13: saveFcmToken â€” ط­ظپط¸ طھظˆظƒظ† ط§ظ„ط¥ط´ط¹ط§ط±ط§طھ ظ„ظˆظ„ظٹ ط§ظ„ط£ظ…ط±
// ============================================================
exports.saveFcmToken = onCall({ cors: [/bo3li1993\.github\.io$/, /localhost/], region: 'me-central1' }, async (request) => {
    const { schoolId, civilId, fcmToken } = request.data;
    if (!schoolId || !civilId || !fcmToken) {
        throw new HttpsError('invalid-argument', 'ط§ظ„ط¨ظٹط§ظ†ط§طھ ظ†ط§ظ‚طµط©');
    }

    try {
        // ظ†ط¨ط­ط« ط¹ظ† ظˆظ„ظٹ ط§ظ„ط£ظ…ط± ط¨ط§ظ„ط±ظ‚ظ… ط§ظ„ظ…ط¯ظ†ظٹ
        const snap = await db.collection('users')
            .where('schoolId', '==', schoolId)
            .where('civilId', '==', civilId)
            .where('role', '==', 'parent')
            .limit(1).get();

        if (snap.empty) throw new HttpsError('not-found', 'ظˆظ„ظٹ ط§ظ„ط£ظ…ط± ط؛ظٹط± ظ…ظˆط¬ظˆط¯');

        await snap.docs[0].ref.update({
            fcmToken,
            fcmUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return { success: true };
    } catch(e) {
        throw new HttpsError('internal', e.message);
    }
});

// ============================================================
// FUNCTION 14: askAiAssistant â€” ط§ظ„ظ…ط³ط§ط¹ط¯ ط§ظ„ط°ظƒظٹ (proxy ط¢ظ…ظ†)
// ظٹط³طھط¯ط¹ظٹ Claude API ط¨ط¯ظˆظ† ظƒط´ظپ ط§ظ„ظ€ API key ظ„ظ„ظ€ frontend
// ============================================================
exports.askAiAssistant = onCall({ cors: [/bo3li1993\.github\.io$/, /localhost/], region: 'me-central1' }, async (request) => {
    const { context, question, history = [] } = request.data;

    if (!question) throw new HttpsError('invalid-argument', 'ط§ظ„ط³ط¤ط§ظ„ ظ…ط·ظ„ظˆط¨');

    // API Key ظ…ط­ظپظˆط¸ ظپظٹ Firebase environment
    const apiKey = process.env.ANTHROPIC_API_KEY || functions.config().anthropic?.api_key;
    if (!apiKey) throw new HttpsError('internal', 'API key ط؛ظٹط± ظ…ظڈط¹ظٹظژظ‘ظ†');

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type':    'application/json',
                'x-api-key':       apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model:      'claude-sonnet-4-6',
                max_tokens: 1000,
                system: `ط£ظ†طھ ظ…ط³ط§ط¹ط¯ ط°ظƒظٹ ط¯ط§ط®ظ„ ظ…ظ†ط¸ظˆظ…ط© ط¥ط¯ط§ط±ط© ظ…ط¯ط±ط³ط© ظپظٹ ط§ظ„ظƒظˆظٹطھ.
طھط¬ط§ظˆط¨ ط¨ط§ظ„ط¹ط±ط¨ظٹ ط¨ط´ظƒظ„ ظ…ط®طھطµط± ظˆظˆط§ط¶ط­ ظˆظ…ظپظٹط¯.
ظ„ط§ طھط³طھط®ط¯ظ… ظ…طµط·ظ„ط­ط§طھ طھظ‚ظ†ظٹط©.
ط§ظ„ط£ط±ظ‚ط§ظ… ظˆط§ظ„ط£ط³ظ…ط§ط، ظ…ظ† ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ظڈط¹ط·ط§ط© ظپظ‚ط·.
ط¥ط°ط§ ط§ظ„ط³ط¤ط§ظ„ ط¹ظ† ط¥ط¬ط±ط§ط،طŒ ظˆط¶ظ‘ط­ ط§ظ„ط®ط·ظˆط§طھ ط¨ط¨ط³ط§ط·ط©.`,
                messages: [
                    ...history.map(h => ({ role: h.role, content: h.content })),
                    { role: 'user', content: `ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ط­ط§ظ„ظٹط©:\n${context}\n\nط§ظ„ط³ط¤ط§ظ„: ${question}` }
                ]
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Claude API error: ${response.status} â€” ${err}`);
        }

        const data = await response.json();
        return { answer: data.content?.[0]?.text || 'ظ„ظ… ظٹظڈط±ط¬ط¹ ط§ظ„ظ…ط³ط§ط¹ط¯ ط¥ط¬ط§ط¨ط©' };

    } catch(e) {
        console.error('askAiAssistant error:', e.message);
        throw new HttpsError('internal', 'طھط¹ط°ط± ط§ظ„ط§طھطµط§ظ„ ط¨ط§ظ„ظ…ط³ط§ط¹ط¯ ط§ظ„ط°ظƒظٹ: ' + e.message);
    }
});// ════════════════════════════════════════════════════════════════
// FUNCTION: addStudentIds - إضافة studentId لكل الطلاب القدامى
// تشغّل مرة واحدة فقط من super admin
// ════════════════════════════════════════════════════════════════
exports.addStudentIds = onCall({
    cors: [/bo3li1993\.github\.io$/, /localhost/],
    region: "me-central1"
}, async (request) => {
    if (!request.auth || request.auth.uid !== "superadmin") {
        throw new HttpsError("permission-denied", "Super Admin فقط");
    }
    const studentsSnap = await db.collection("students").get();
    const batch = db.batch();
    let updated = 0;
    for (const doc of studentsSnap.docs) {
        const data = doc.data();
        if (!data.studentId) {
            const studentId = "STU-" + doc.id.substring(0, 8).toUpperCase();
            batch.update(doc.ref, { studentId: studentId });
            updated++;
        }
    }
    if (updated > 0) await batch.commit();
    return { success: true, updated: updated };
});
// ════════════════════════════════════════════════════════════════
// FUNCTION: linkParentsToStudents - ربط أولياء الأمور بـ studentId
// ════════════════════════════════════════════════════════════════
exports.linkParentsToStudents = onCall({
    cors: [/bo3li1993\.github\.io$/, /localhost/],
    region: "me-central1"
}, async (request) => {
    if (!request.auth || request.auth.uid !== "superadmin") {
        throw new HttpsError("permission-denied", "Super Admin فقط");
    }
    const parentsSnap = await db.collection("users")
        .where("role", "==", "parent").get();
    let linked = 0;
    let errors = 0;
    for (const parentDoc of parentsSnap.docs) {
        const parent = parentDoc.data();
        if (parent.childIds && parent.childIds.length > 0) continue;
        try {
            if (!parent.studentName && !parent.phone) continue;
            const studentQuery = parent.studentName
                ? await db.collection("students")
                    .where("schoolId", "==", parent.schoolId)
                    .where("name", "==", parent.studentName)
                    .limit(1).get()
                : null;
            if (studentQuery && !studentQuery.empty) {
                const studentDoc = studentQuery.docs[0];
                const studentId = studentDoc.data().studentId || studentDoc.id;
                await db.collection("users").doc(parentDoc.id).update({
                    childIds: [studentId],
                    studentId: studentId
                });
                linked++;
            }
        } catch(e) {
            console.error("Error linking parent:", parentDoc.id, e);
            errors++;
        }
    }
    return { success: true, linked: linked, errors: errors };
});