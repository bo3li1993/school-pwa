const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// ============================================================
// ط·آ£ط·آ¯ط¸ث†ط·آ§ط·ع¾ ط¸â€¦ط·آ³ط·آ§ط·آ¹ط·آ¯ط·آ©: ط·آ­ط·آ¯ ط¸â€¦ط·آ­ط·آ§ط¸ث†ط¸â€‍ط·آ§ط·ع¾ ط·آ§ط¸â€‍ط·آ¯ط·آ®ط¸ث†ط¸â€‍ ط·آ§ط¸â€‍ط¸ظ¾ط·آ§ط·آ´ط¸â€‍ط·آ© (Rate Limiting)
// 5 ط¸â€¦ط·آ­ط·آ§ط¸ث†ط¸â€‍ط·آ§ط·ع¾ ط¸ظ¾ط·آ§ط·آ´ط¸â€‍ط·آ© أ¢â€ â€™ ط¸â€ڑط¸ظ¾ط¸â€‍ 15 ط·آ¯ط¸â€ڑط¸ظ¹ط¸â€ڑط·آ©
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

    // ط¸â€‍ط¸ث† ط¸â€¦ط·آ±ط¸â€ک ط¸ث†ط¸â€ڑط·ع¾ ط·آ£ط·آ·ط¸ث†ط¸â€‍ ط¸â€¦ط¸â€  ط¸ظ¾ط·ع¾ط·آ±ط·آ© ط·آ§ط¸â€‍ط¸â€ڑط¸ظ¾ط¸â€‍ط·إ’ ط¸â€ ط·آ¨ط·آ¯ط·آ£ ط·آ§ط¸â€‍ط·آ¹ط·آ¯ ط¸â€¦ط¸â€  ط·آ¬ط·آ¯ط¸ظ¹ط·آ¯
    const newCount = (snap.exists && minutesSince < LOCKOUT_MINUTES) ? (snap.data().count || 0) + 1 : 1;

    await ref.set({ count: newCount, lastAttempt: admin.firestore.FieldValue.serverTimestamp() });
}

async function resetAttempts(identifier) {
    await db.collection('login_attempts').doc(identifier).delete().catch(() => {});
}

// ============================================================
// FUNCTION 1: loginUser أ¢â‚¬â€‌ ط¸â€¦ط·آµط·آ§ط·آ¯ط¸â€ڑط·آ© ط·آ§ط¸â€‍ط¸â€¦ط·آ³ط·ع¾ط·آ®ط·آ¯ط¸â€¦ط¸ظ¹ط¸â€  (ط¸â€¦ط¸ث†ط·آ¬ط¸ث†ط·آ¯ط·آ© ط¸ث†ط¸â€¦ط¸ظ¾ط·آ¹ط¸â€کط¸â€‍ط·آ©)
// ============================================================
exports.loginUser = onCall({ cors: [/bo3li1993\.github\.io$/, /localhost/], region: 'me-central1' }, async (request) => {
    const { schoolId, userId, password } = request.data;
    if (!userId || !password) throw new HttpsError('invalid-argument', 'userId ط¸ث† password ط¸â€¦ط·آ·ط¸â€‍ط¸ث†ط·آ¨ط·آ§ط¸â€ ');

    const rateLimitKey = `user_${userId}`;
    const rateCheck = await checkRateLimit(rateLimitKey);
    if (rateCheck.locked) {
        throw new HttpsError('resource-exhausted', `ط¸â€¦ط·آ­ط·آ§ط¸ث†ط¸â€‍ط·آ§ط·ع¾ ط¸ئ’ط·آ«ط¸ظ¹ط·آ±ط·آ© ط¸ظ¾ط·آ§ط·آ´ط¸â€‍ط·آ© أ¢â‚¬â€‌ ط¸ظ¹ط·آ±ط·آ¬ط¸â€° ط·آ§ط¸â€‍ط¸â€¦ط·آ­ط·آ§ط¸ث†ط¸â€‍ط·آ© ط·آ¨ط·آ¹ط·آ¯ ${rateCheck.remaining} ط·آ¯ط¸â€ڑط¸ظ¹ط¸â€ڑط·آ©`);
    }

    // Super Admin أ¢â‚¬â€‌ ط¸â€‍ط·آ§ rate limitط·إ’ ط¸â€،ط·آ§ط·آ´ ط·آ«ط·آ§ط·آ¨ط·ع¾ ط¸ظ¾ط¸â€ڑط·آ·
    if (userId === 'superadmin') {
        // ط¸ظ¾ط¸ئ’ ط·آ§ط¸â€‍ط¸â€ڑط¸ظ¾ط¸â€‍ ط·ع¾ط¸â€‍ط¸â€ڑط·آ§ط·آ¦ط¸ظ¹ط·آ§ط¸â€¹ ط¸ظ¾ط¸ظ¹ ط¸ئ’ط¸â€‍ ط¸â€¦ط·آ­ط·آ§ط¸ث†ط¸â€‍ط·آ© ط¸â€‍ط¸â€‍ط·آ³ط¸ث†ط·آ¨ط·آ± ط·آ£ط·آ¯ط¸â€¦ط¸â€ 
        await resetAttempts(rateLimitKey);

        const crypto = require('crypto');
        const hash = crypto.createHash('sha256').update(password).digest('hex');

        // ط¸â€،ط·آ§ط·آ´ ط·آ«ط·آ§ط·آ¨ط·ع¾ ط¸ظ¾ط¸â€ڑط·آ· أ¢â‚¬â€‌ ط¸â€‍ط·آ§ ط¸ظ¹ط·آ¹ط·ع¾ط¸â€¦ط·آ¯ ط·آ¹ط¸â€‍ط¸â€° Firestore
        // ط¸ئ’ط¸â€‍ط¸â€¦ط·آ© ط·آ§ط¸â€‍ط¸â€¦ط·آ±ط¸ث†ط·آ±: husainan@2026
        const SUPER_HASH = '07b4ba632fba1d0883ef24fad3afe2d0dd2c0f97993d505186ef656b431f7e18';

        if (hash !== SUPER_HASH) {
            throw new HttpsError('unauthenticated', 'ط¸ئ’ط¸â€‍ط¸â€¦ط·آ© ط·آ§ط¸â€‍ط¸â€¦ط·آ±ط¸ث†ط·آ± ط·ط›ط¸ظ¹ط·آ± ط·آµط·آ­ط¸ظ¹ط·آ­ط·آ©');
        }
        const token = await admin.auth().createCustomToken('superadmin', { role: 'superadmin', schoolId: 'system' });
        return { token, role: 'superadmin', schoolId: 'system', name: 'ط·آ­ط·آ³ط¸ظ¹ط¸â€ ', userId: 'superadmin' };
    }

    // Regular users
    let usersQuery = db.collection('users').where('userId', '==', userId);
    if (schoolId) usersQuery = usersQuery.where('schoolId', '==', schoolId);
    const snap = await usersQuery.limit(1).get();

    if (snap.empty) {
        await recordFailedAttempt(rateLimitKey);
        throw new HttpsError('not-found', 'ط·آ§ط¸â€‍ط¸â€¦ط·آ³ط·ع¾ط·آ®ط·آ¯ط¸â€¦ ط·ط›ط¸ظ¹ط·آ± ط¸â€¦ط¸ث†ط·آ¬ط¸ث†ط·آ¯');
    }

    const user = snap.docs[0].data();
    const crypto = require('crypto');
    const providedHash = crypto.createHash('sha256').update(password).digest('hex');

    // ط¸â€ ط·آ¯ط·آ¹ط¸â€¦ ط·آ§ط¸â€‍ط¸â€ ط·آ¸ط·آ§ط¸â€¦ط¸ظ¹ط¸â€ : passHash ط·آ§ط¸â€‍ط·آ¬ط·آ¯ط¸ظ¹ط·آ¯ ط·آ§ط¸â€‍ط·آ¢ط¸â€¦ط¸â€  (SHA-256)ط·إ’ ط·آ£ط¸ث† plainPass ط·آ§ط¸â€‍ط¸â€ڑط·آ¯ط¸ظ¹ط¸â€¦ ط·آ§ط¸â€‍ط¸â€¦ط¸ث†ط·آ±ط¸ث†ط·آ« (ط·ع¾ط¸ث†ط·آ§ط¸ظ¾ط¸â€ڑط·آ§ط¸â€¹ ط·آ®ط¸â€‍ط¸ظ¾ط¸ظ¹ط·آ§ط¸â€¹ ط¸â€‍ط¸â€‍ط·آ­ط·آ³ط·آ§ط·آ¨ط·آ§ط·ع¾ ط·ط›ط¸ظ¹ط·آ± ط·آ§ط¸â€‍ط¸â€¦ط¸عˆط·آ­ط·آ¯ط¸عکط¸â€کط·آ«ط·آ© ط·آ¨ط·آ¹ط·آ¯)
    const isValid = user.passHash ? (providedHash === user.passHash) : (user.plainPass === password);

    if (!isValid) {
        await recordFailedAttempt(rateLimitKey);
        throw new HttpsError('unauthenticated', 'ط¸ئ’ط¸â€‍ط¸â€¦ط·آ© ط·آ§ط¸â€‍ط¸â€¦ط·آ±ط¸ث†ط·آ± ط·ط›ط¸ظ¹ط·آ± ط·آµط·آ­ط¸ظ¹ط·آ­ط·آ©');
    }
    if (user.status === 'suspended') throw new HttpsError('permission-denied', 'ط·آ§ط¸â€‍ط·آ­ط·آ³ط·آ§ط·آ¨ ط¸â€¦ط¸ث†ط¸â€ڑط¸ث†ط¸ظ¾');

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
// FUNCTION 2: onAttendanceCreated أ¢â‚¬â€‌ ط·آ¥ط·آ´ط·آ¹ط·آ§ط·آ± FCM ط·آ¹ط¸â€ ط·آ¯ ط·ع¾ط·آ³ط·آ¬ط¸ظ¹ط¸â€‍ ط·ط›ط¸ظ¹ط·آ§ط·آ¨
// ============================================================
exports.onAttendanceCreated = onDocumentCreated({
    document: 'attendance/{docId}',
    region: 'me-central1'
}, async (event) => {
    const data = event.data.data();

    // ط¸ظ¾ط¸â€ڑط·آ· ط·آ§ط¸â€‍ط·ط›ط¸ظ¹ط·آ§ط·آ¨ (ط¸â€¦ط·آ´ ط·آ­ط·آ¶ط¸ث†ط·آ± ط·آ£ط¸ث† ط·ع¾ط·آ£ط·آ®ط¸ظ¹ط·آ±)
    if (data.status !== 'absent') return null;

    const { studentName, classId, period, date, schoolId } = data;

    try {
        // ط·آ¬ط¸â€‍ط·آ¨ ط·آ¨ط¸ظ¹ط·آ§ط¸â€ ط·آ§ط·ع¾ ط·آ§ط¸â€‍ط·آ·ط·آ§ط¸â€‍ط·آ¨ (ط·آ±ط¸â€ڑط¸â€¦ ط¸â€،ط·آ§ط·ع¾ط¸ظ¾ ط¸ث†ط¸â€‍ط¸ظ¹ ط·آ§ط¸â€‍ط·آ£ط¸â€¦ط·آ±)
        const studentsSnap = await db.collection('students')
            .where('schoolId', '==', schoolId)
            .where('name', '==', studentName)
            .limit(1).get();

        if (studentsSnap.empty) return null;
        const student = studentsSnap.docs[0].data();
        const parentPhone = student.parentPhone;
        if (!parentPhone) return null;

        // ط·آ¥ط·آ¶ط·آ§ط¸ظ¾ط·آ© ط¸â€‍ط¸â€ڑط·آ§ط·آ¦ط¸â€¦ط·آ© ط·آ¥ط·آ´ط·آ¹ط·آ§ط·آ±ط·آ§ط·ع¾ ط¸ث†ط·آ§ط·ع¾ط·آ³ط·آ§ط·آ¨ (ط¸â€‍ط¸â€‍ط·آ¥ط·آ±ط·آ³ط·آ§ط¸â€‍ ط·آ§ط¸â€‍ط¸ظ¹ط·آ¯ط¸ث†ط¸ظ¹ ط·آ£ط¸ث† ط·آ§ط¸â€‍ط·آ³ط¸ظ¹ط·آ±ط¸ظ¾ط·آ±)
        await db.collection('notifications_queue').add({
            schoolId,
            studentName,
            classId,
            period,
            date,
            parentPhone,
            message: `ط·ط›ط¸ظ¹ط·آ§ط·آ¨: ${studentName} أ¢â‚¬â€‌ ط·آ§ط¸â€‍ط¸ظ¾ط·آµط¸â€‍ ${classId} أ¢â‚¬â€‌ ط·آ§ط¸â€‍ط·آ­ط·آµط·آ© ${period} أ¢â‚¬â€‌ ${date}`,
            type: 'absence',
            sent: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // ط·آ¥ط·آ±ط·آ³ط·آ§ط¸â€‍ FCM ط¸â€‍ط¸ث†ط¸â€‍ط¸ظ¹ ط·آ§ط¸â€‍ط·آ£ط¸â€¦ط·آ± (ط¸â€‍ط¸ث† ط¸â€¦ط·آ³ط·آ¬ط¸â€کط¸â€‍)
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
                        title: `ط·ط›ط¸ظ¹ط·آ§ط·آ¨: ${studentName}`,
                        body: `ط·ط›ط·آ§ط·آ¨ ط·آ§ط·آ¨ط¸â€ ط¸ئ’ط¸â€¦ ط·آ¨ط·ع¾ط·آ§ط·آ±ط¸ظ¹ط·آ® ${date} أ¢â‚¬â€‌ ط·آ§ط¸â€‍ط·آ­ط·آµط·آ© ${period}`
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
// FUNCTION 3: generateMonthlyReport أ¢â‚¬â€‌ ط·ع¾ط¸â€ڑط·آ±ط¸ظ¹ط·آ± ط·آ´ط¸â€،ط·آ±ط¸ظ¹ ط·ع¾ط¸â€‍ط¸â€ڑط·آ§ط·آ¦ط¸ظ¹
// ط¸ئ’ط¸â€‍ ط·آ£ط¸ث†ط¸â€‍ ط·آ§ط¸â€‍ط·آ´ط¸â€،ط·آ± ط·آ§ط¸â€‍ط·آ³ط·آ§ط·آ¹ط·آ© 7 ط·آµط·آ¨ط·آ§ط·آ­ط·آ§ط¸â€¹ ط·آ¨ط·ع¾ط¸ث†ط¸â€ڑط¸ظ¹ط·ع¾ ط·آ§ط¸â€‍ط¸ئ’ط¸ث†ط¸ظ¹ط·ع¾ (UTC+3 = 04:00 UTC)
// ============================================================
exports.generateMonthlyReport = onSchedule({
    schedule: '0 4 1 * *',
    timeZone: 'Asia/Kuwait',
    region: 'me-central1'
}, async (event) => {
    console.log('ظ‹ع؛â€‌â€‍ Monthly Report: Starting...');

    // ط·آ§ط¸â€‍ط·آ´ط¸â€،ط·آ± ط·آ§ط¸â€‍ط¸â€¦ط·آ§ط·آ¶ط¸ظ¹
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const fromDate = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth()+1).padStart(2,'0')}-01`;
    const toDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth()+1, 0).toISOString().slice(0,10);
    const monthLabel = `${lastMonth.getFullYear()}/${String(lastMonth.getMonth()+1).padStart(2,'0')}`;

    // ط·آ¬ط¸â€‍ط·آ¨ ط¸ئ’ط¸â€‍ ط·آ§ط¸â€‍ط¸â€¦ط·آ¯ط·آ§ط·آ±ط·آ³ ط·آ§ط¸â€‍ط¸â€ ط·آ´ط·آ·ط·آ©
    const schoolsSnap = await db.collection('schools').where('status', '==', 'active').get();
    console.log(`Found ${schoolsSnap.size} active schools`);

    for (const schoolDoc of schoolsSnap.docs) {
        const schoolId = schoolDoc.id;
        const schoolData = schoolDoc.data();

        try {
            // ط·آ¥ط·آ­ط·آµط·آ§ط·آ¦ط¸ظ¹ط·آ§ط·ع¾ ط·آ§ط¸â€‍ط·ط›ط¸ظ¹ط·آ§ط·آ¨
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

            // ط·آ¥ط·آ­ط·آµط·آ§ط·آ¦ط¸ظ¹ط·آ§ط·ع¾ ط·آ§ط¸â€‍ط·آ³ط¸â€‍ط¸ث†ط¸ئ’
            const behSnap = await db.collection('behavior')
                .where('schoolId', '==', schoolId)
                .where('date', '>=', fromDate)
                .where('date', '<=', toDate)
                .get();

            // ط·آ¥ط·آ­ط·آµط·آ§ط·آ¦ط¸ظ¹ط·آ§ط·ع¾ ط·آ§ط¸â€‍ط·آ§ط·آ³ط·ع¾ط·آ¦ط·آ°ط·آ§ط¸â€ 
            const gateSnap = await db.collection('gatepass')
                .where('schoolId', '==', schoolId)
                .where('dateStr', '>=', fromDate)
                .where('dateStr', '<=', toDate)
                .get();

            // ط·آ¥ط·آ­ط·آµط·آ§ط·آ¦ط¸ظ¹ط·آ§ط·ع¾ ط·آ§ط¸â€‍ط·آ¹ط¸ظ¹ط·آ§ط·آ¯ط·آ©
            const clinicSnap = await db.collection('clinic')
                .where('schoolId', '==', schoolId)
                .where('dateStr', '>=', fromDate)
                .where('dateStr', '<=', toDate)
                .get();

            // ط·ع¾ط·آ¬ط¸â€¦ط¸ظ¹ط·آ¹ ط·آ¨ط·آ§ط¸â€‍ط¸ظ¾ط·آµط¸â€‍ ط¸ث†ط·آ§ط¸â€‍ط·آ·ط·آ§ط¸â€‍ط·آ¨
            const absenceByClass = {};
            const absenceByStudent = {};
            let positiveBeh = 0, negativeBeh = 0;

            absSnap.forEach(d => {
                const dd = d.data();
                absenceByClass[dd.classId] = (absenceByClass[dd.classId] || 0) + 1;
                absenceByStudent[dd.studentName] = (absenceByStudent[dd.studentName] || 0) + 1;
            });

            behSnap.forEach(d => {
                if (d.data().type === 'ط·آ¥ط¸ظ¹ط·آ¬ط·آ§ط·آ¨ط¸ظ¹') positiveBeh++;
                else if (d.data().type === 'ط·آ³ط¸â€‍ط·آ¨ط¸ظ¹') negativeBeh++;
            });

            // ط·آ£ط¸ئ’ط·آ«ط·آ± 10 ط·آ·ط¸â€‍ط·آ§ط·آ¨ ط·ط›ط¸ظ¹ط·آ§ط·آ¨ط·آ§ط¸â€¹
            const topAbsentees = Object.entries(absenceByStudent)
                .sort((a,b) => b[1]-a[1]).slice(0,10)
                .map(([name, count]) => ({ name, count }));

            // ط·آ­ط¸ظ¾ط·آ¸ ط·آ§ط¸â€‍ط·ع¾ط¸â€ڑط·آ±ط¸ظ¹ط·آ± ط·آ¨ط¸â‚¬ Firestore
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

            console.log(`أ¢إ“â€¦ Report generated for ${schoolId}: ${absSnap.size} absences`);
        } catch (err) {
            console.error(`أ¢â€Œإ’ Error for ${schoolId}:`, err);
        }
    }

    return null;
});

// ============================================================
// FUNCTION 4: generateReportNow أ¢â‚¬â€‌ ط·ع¾ط¸ث†ط¸â€‍ط¸ظ¹ط·آ¯ ط·ع¾ط¸â€ڑط·آ±ط¸ظ¹ط·آ± ط¸ظ¾ط¸ث†ط·آ±ط¸ظ¹ (Callable)
// ط¸ظ¹ط¸عˆط·آ³ط·ع¾ط·آ¯ط·آ¹ط¸â€° ط¸â€¦ط¸â€  super.html ط·آ£ط¸ث† admin.html ط¸â€‍ط·ع¾ط¸ث†ط¸â€‍ط¸ظ¹ط·آ¯ ط·ع¾ط¸â€ڑط·آ±ط¸ظ¹ط·آ± ط·آ£ط¸ظ¹ ط·آ´ط¸â€،ط·آ±
// ============================================================
exports.generateReportNow = onCall({ cors: [/bo3li1993\.github\.io$/, /localhost/], region: 'me-central1' }, async (request) => {
    const { schoolId, fromDate, toDate, monthLabel } = request.data;
    if (!schoolId || !fromDate || !toDate) throw new HttpsError('invalid-argument', 'schoolId ط¸ث† fromDate ط¸ث† toDate ط¸â€¦ط·آ·ط¸â€‍ط¸ث†ط·آ¨ط·آ©');

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
        if (d.data().type === 'ط·آ¥ط¸ظ¹ط·آ¬ط·آ§ط·آ¨ط¸ظ¹') positiveBeh++;
        else if (d.data().type === 'ط·آ³ط¸â€‍ط·آ¨ط¸ظ¹') negativeBeh++;
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
// FUNCTION 5: changeSuperPassword أ¢â‚¬â€‌ ط·ع¾ط·ط›ط¸ظ¹ط¸ظ¹ط·آ± ط¸ئ’ط¸â€‍ط¸â€¦ط·آ© ط¸â€¦ط·آ±ط¸ث†ط·آ± ط·آ§ط¸â€‍ط·آ³ط¸ث†ط·آ¨ط·آ± ط·آ£ط·آ¯ط¸â€¦ط¸â€  ط·آ¨ط·آ£ط¸â€¦ط·آ§ط¸â€ 
// ط¸ظ¹ط·ع¾ط·آ­ط¸â€ڑط¸â€ڑ ط¸â€¦ط¸â€  ط·آ§ط¸â€‍ط¸ئ’ط¸â€‍ط¸â€¦ط·آ© ط·آ§ط¸â€‍ط·آ­ط·آ§ط¸â€‍ط¸ظ¹ط·آ© server-side ط¸â€ڑط·آ¨ط¸â€‍ ط·آ§ط¸â€‍ط·آ­ط¸ظ¾ط·آ¸ ط·آ¨ط¸â‚¬ Firestore
// ============================================================
exports.changeSuperPassword = onCall({ cors: [/bo3li1993\.github\.io$/, /localhost/], region: 'me-central1' }, async (request) => {
    const { currentPassword, newPassword } = request.data;
    if (!currentPassword || !newPassword) throw new HttpsError('invalid-argument', 'ط·آ§ط¸â€‍ط·آ­ط¸â€ڑط¸ث†ط¸â€‍ ط¸â€¦ط·آ·ط¸â€‍ط¸ث†ط·آ¨ط·آ©');
    if (newPassword.length < 6) throw new HttpsError('invalid-argument', 'ط¸ئ’ط¸â€‍ط¸â€¦ط·آ© ط·آ§ط¸â€‍ط¸â€¦ط·آ±ط¸ث†ط·آ± ط·آ§ط¸â€‍ط·آ¬ط·آ¯ط¸ظ¹ط·آ¯ط·آ© ط¸â€ڑط·آµط¸ظ¹ط·آ±ط·آ© ط·آ¬ط·آ¯ط·آ§ط¸â€¹');

    const crypto = require('crypto');
    const currentHash = crypto.createHash('sha256').update(currentPassword).digest('hex');

    // ط·آ¬ط¸â€‍ط·آ¨ ط·آ§ط¸â€‍ط¸â‚¬ hash ط·آ§ط¸â€‍ط·آ­ط·آ§ط¸â€‍ط¸ظ¹ ط·آ§ط¸â€‍ط¸â€¦ط·آ®ط·آ²ط¸â€کط¸â€  (ط¸â€¦ط¸â€  system_config ط·آ£ط¸ث† ط·آ§ط¸â€‍ط·آ§ط¸ظ¾ط·ع¾ط·آ±ط·آ§ط·آ¶ط¸ظ¹)
    const configSnap = await db.collection('system_config').where('key', '==', 'super_pass_hash').limit(1).get();
    const DEFAULT_HASH = 'e2fedb220c651a45d88c3237fd27e98b4ed6daf5c83b66f6988b36a215528fe2';
    const storedHash = configSnap.empty ? DEFAULT_HASH : configSnap.docs[0].data().value;

    if (currentHash !== storedHash) throw new HttpsError('unauthenticated', 'ط¸ئ’ط¸â€‍ط¸â€¦ط·آ© ط·آ§ط¸â€‍ط¸â€¦ط·آ±ط¸ث†ط·آ± ط·آ§ط¸â€‍ط·آ­ط·آ§ط¸â€‍ط¸ظ¹ط·آ© ط·ط›ط¸ظ¹ط·آ± ط·آµط·آ­ط¸ظ¹ط·آ­ط·آ©');

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
// FUNCTION 6: registerParent أ¢â‚¬â€‌ ط·ع¾ط·آ³ط·آ¬ط¸ظ¹ط¸â€‍ ط·آ­ط·آ³ط·آ§ط·آ¨ ط¸ث†ط¸â€‍ط¸ظ¹ ط·آ£ط¸â€¦ط·آ± ط·آ¬ط·آ¯ط¸ظ¹ط·آ¯
// ط¸ظ¹ط¸عˆط¸â€ ط·آ´ط·آ¦ ط·آ­ط·آ³ط·آ§ط·آ¨ ط·آ¨ط·آ§ط¸â€‍ط·آ±ط¸â€ڑط¸â€¦ ط·آ§ط¸â€‍ط¸â€¦ط·آ¯ط¸â€ ط¸ظ¹ ط¸ث†ط¸ظ¹ط¸عˆط·آµط·آ¯ط·آ± Custom Token ط¸â€‍ط·ع¾ط·آ³ط·آ¬ط¸ظ¹ط¸â€‍ ط·آ§ط¸â€‍ط·آ¯ط·آ®ط¸ث†ط¸â€‍ ط·آ§ط¸â€‍ط¸ظ¾ط¸ث†ط·آ±ط¸ظ¹
// ============================================================
exports.registerParent = onCall({ cors: [/bo3li1993\.github\.io$/, /localhost/], region: 'me-central1' }, async (request) => {
    const { schoolId, civilId, phone, password } = request.data;
    if (!schoolId || !civilId || !phone || !password) {
        throw new HttpsError('invalid-argument', 'ط·آ¬ط¸â€¦ط¸ظ¹ط·آ¹ ط·آ§ط¸â€‍ط·آ­ط¸â€ڑط¸ث†ط¸â€‍ ط¸â€¦ط·آ·ط¸â€‍ط¸ث†ط·آ¨ط·آ©');
    }
    if (!/^\d{5,15}$/.test(civilId)) throw new HttpsError('invalid-argument', 'ط·آ§ط¸â€‍ط·آ±ط¸â€ڑط¸â€¦ ط·آ§ط¸â€‍ط¸â€¦ط·آ¯ط¸â€ ط¸ظ¹ ط·ط›ط¸ظ¹ط·آ± ط·آµط·آ­ط¸ظ¹ط·آ­');
    if (password.length < 6) throw new HttpsError('invalid-argument', 'ط¸ئ’ط¸â€‍ط¸â€¦ط·آ© ط·آ§ط¸â€‍ط¸â€¦ط·آ±ط¸ث†ط·آ± ط¸â€ڑط·آµط¸ظ¹ط·آ±ط·آ© ط·آ¬ط·آ¯ط·آ§ط¸â€¹');

    const accountId = `${schoolId}_${civilId}`;
    const accountRef = db.collection('parent_accounts').doc(accountId);
    const existing = await accountRef.get();
    if (existing.exists) throw new HttpsError('already-exists', 'ط¸â€،ط·آ°ط·آ§ ط·آ§ط¸â€‍ط·آ±ط¸â€ڑط¸â€¦ ط·آ§ط¸â€‍ط¸â€¦ط·آ¯ط¸â€ ط¸ظ¹ ط¸â€¦ط·آ³ط·آ¬ط¸â€کط¸â€‍ ط¸â€¦ط·آ³ط·آ¨ط¸â€ڑط·آ§ط¸â€¹');

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
// FUNCTION 7: loginParent أ¢â‚¬â€‌ ط·ع¾ط·آ³ط·آ¬ط¸ظ¹ط¸â€‍ ط·آ¯ط·آ®ط¸ث†ط¸â€‍ ط¸ث†ط¸â€‍ط¸ظ¹ ط·آ§ط¸â€‍ط·آ£ط¸â€¦ط·آ± ط·آ¨ط·آ§ط¸â€‍ط·آ±ط¸â€ڑط¸â€¦ ط·آ§ط¸â€‍ط¸â€¦ط·آ¯ط¸â€ ط¸ظ¹
// ============================================================
exports.loginParent = onCall({ cors: [/bo3li1993\.github\.io$/, /localhost/], region: 'me-central1' }, async (request) => {
    const { schoolId, civilId, password } = request.data;
    if (!civilId || !password) throw new HttpsError('invalid-argument', 'ط·آ§ط¸â€‍ط·آ±ط¸â€ڑط¸â€¦ ط·آ§ط¸â€‍ط¸â€¦ط·آ¯ط¸â€ ط¸ظ¹ ط¸ث†ط¸ئ’ط¸â€‍ط¸â€¦ط·آ© ط·آ§ط¸â€‍ط¸â€¦ط·آ±ط¸ث†ط·آ± ط¸â€¦ط·آ·ط¸â€‍ط¸ث†ط·آ¨ط·آ§ط¸â€ ');

    const rateLimitKey = `parent_${civilId}`;
    const rateCheck = await checkRateLimit(rateLimitKey);
    if (rateCheck.locked) {
        throw new HttpsError('resource-exhausted', `ط¸â€¦ط·آ­ط·آ§ط¸ث†ط¸â€‍ط·آ§ط·ع¾ ط¸ئ’ط·آ«ط¸ظ¹ط·آ±ط·آ© ط¸ظ¾ط·آ§ط·آ´ط¸â€‍ط·آ© أ¢â‚¬â€‌ ط¸ظ¹ط·آ±ط·آ¬ط¸â€° ط·آ§ط¸â€‍ط¸â€¦ط·آ­ط·آ§ط¸ث†ط¸â€‍ط·آ© ط·آ¨ط·آ¹ط·آ¯ ${rateCheck.remaining} ط·آ¯ط¸â€ڑط¸ظ¹ط¸â€ڑط·آ©`);
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
            throw new HttpsError('failed-precondition', 'ط¸ظ¹ط·آ±ط·آ¬ط¸â€° ط·آ§ط·آ³ط·ع¾ط·آ®ط·آ¯ط·آ§ط¸â€¦ ط·آ±ط·آ§ط·آ¨ط·آ· ط¸â€¦ط·آ¯ط·آ±ط·آ³ط·ع¾ط¸ئ’ ط·آ§ط¸â€‍ط·آ®ط·آ§ط·آµ ط¸â€‍ط·ع¾ط·آ³ط·آ¬ط¸ظ¹ط¸â€‍ ط·آ§ط¸â€‍ط·آ¯ط·آ®ط¸ث†ط¸â€‍');
        }
    }

    if (!accountData || accountData.passwordHash !== passwordHash) {
        await recordFailedAttempt(rateLimitKey);
        throw new HttpsError('unauthenticated', 'ط·آ§ط¸â€‍ط·آ±ط¸â€ڑط¸â€¦ ط·آ§ط¸â€‍ط¸â€¦ط·آ¯ط¸â€ ط¸ظ¹ ط·آ£ط¸ث† ط¸ئ’ط¸â€‍ط¸â€¦ط·آ© ط·آ§ط¸â€‍ط¸â€¦ط·آ±ط¸ث†ط·آ± ط·ط›ط¸ظ¹ط·آ± ط·آµط·آ­ط¸ظ¹ط·آ­ط·آ©');
    }

    await resetAttempts(rateLimitKey);

    const accountId = `${matchedSchoolId}_${civilId}`;
    const token = await admin.auth().createCustomToken(accountId, { role: 'parent', schoolId: matchedSchoolId, civilId });
    return { token, schoolId: matchedSchoolId, civilId };
});

// ============================================================
// FUNCTION 8: getRegistrationClasses أ¢â‚¬â€‌ ط·آ¬ط¸â€‍ط·آ¨ ط¸â€ڑط·آ§ط·آ¦ط¸â€¦ط·آ© ط·آ§ط¸â€‍ط¸ظ¾ط·آµط¸ث†ط¸â€‍ (ط·آ¨ط·آ¯ط¸ث†ط¸â€  ط·آ­ط·آ§ط·آ¬ط·آ© ط¸â€‍ط·ع¾ط·آ³ط·آ¬ط¸ظ¹ط¸â€‍ ط·آ¯ط·آ®ط¸ث†ط¸â€‍)
// ط¸ظ¹ط¸عˆط·آ³ط·ع¾ط·آ®ط·آ¯ط¸â€¦ ط¸ظ¾ط¸â€ڑط·آ· ط·آ¨ط·آµط¸ظ¾ط·آ­ط·آ© ط·ع¾ط·آ³ط·آ¬ط¸ظ¹ط¸â€‍ ط¸ث†ط¸â€‍ط¸ظ¹ ط·آ§ط¸â€‍ط·آ£ط¸â€¦ط·آ± ط·آ§ط¸â€‍ط·آ¬ط·آ¯ط¸ظ¹ط·آ¯ط·إ’ ط¸ظ¹ط·آ±ط·آ¬ط·آ¹ ط·آ£ط·آ³ط¸â€¦ط·آ§ط·طŒ ط·آ§ط¸â€‍ط¸ظ¾ط·آµط¸ث†ط¸â€‍ ط¸ظ¾ط¸â€ڑط·آ· (ط·آ¨ط¸ظ¹ط·آ§ط¸â€ ط·آ§ط·ع¾ ط·ط›ط¸ظ¹ط·آ± ط·آ­ط·آ³ط·آ§ط·آ³ط·آ©)
// ============================================================
exports.getRegistrationClasses = onCall({ cors: [/bo3li1993\.github\.io$/, /localhost/], region: 'me-central1' }, async (request) => {
    const { schoolId } = request.data;
    if (!schoolId) throw new HttpsError('invalid-argument', 'schoolId ط¸â€¦ط·آ·ط¸â€‍ط¸ث†ط·آ¨');

    // ط¸â€ ط·آ¬ط·آ±ط·آ¨ classes collection ط·آ£ط¸ث†ط¸â€‍ط·آ§ط¸â€¹ (ط·آ£ط·آ®ط¸ظ¾ ط¸ث†ط·آ£ط·آ³ط·آ±ط·آ¹)
    const classesSnap = await db.collection('classes').where('schoolId', '==', schoolId).get();
    if (!classesSnap.empty) {
        const classes = [...new Set(classesSnap.docs.map(d => d.data().classId).filter(Boolean))];
        return { classes: classes.sort((a, b) => a.localeCompare(b)) };
    }

    // fallback: ط¸â€¦ط·آ³ط·آ­ students ط¸â€‍ط·آ§ط·آ³ط·ع¾ط·آ®ط·آ±ط·آ§ط·آ¬ ط·آ§ط¸â€‍ط¸ظ¾ط·آµط¸ث†ط¸â€‍
    const studentsSnap = await db.collection('students').where('schoolId', '==', schoolId).get();
    const classes = [...new Set(studentsSnap.docs.map(d => d.data().classId).filter(Boolean))];
    return { classes: classes.sort((a, b) => a.localeCompare(b)) };
});

// ============================================================
// FUNCTION 9: getRegistrationStudents أ¢â‚¬â€‌ ط·آ¬ط¸â€‍ط·آ¨ ط·آ£ط·آ³ط¸â€¦ط·آ§ط·طŒ ط·آ·ط¸â€‍ط·آ§ط·آ¨ ط¸ظ¾ط·آµط¸â€‍ ط¸â€¦ط·آ¹ط¸ظ¹ط¸â€کط¸â€  (ط·آ¨ط·آ¯ط¸ث†ط¸â€  ط·ع¾ط·آ³ط·آ¬ط¸ظ¹ط¸â€‍ ط·آ¯ط·آ®ط¸ث†ط¸â€‍)
// ط¸ظ¹ط·آ±ط·آ¬ط·آ¹ ط¸ظ¾ط¸â€ڑط·آ· id + name (ط·آ¨ط·آ¯ط¸ث†ط¸â€  ط¸â€،ط·آ§ط·ع¾ط¸ظ¾ ط·آ£ط¸ث† ط·آ±ط¸â€ڑط¸â€¦ ط¸â€¦ط·آ¯ط¸â€ ط¸ظ¹ط·إ’ ط·آ­ط¸â€¦ط·آ§ط¸ظ¹ط·آ© ط¸â€‍ط¸â€‍ط·آ®ط·آµط¸ث†ط·آµط¸ظ¹ط·آ©)
// ============================================================
exports.getRegistrationStudents = onCall({ cors: [/bo3li1993\.github\.io$/, /localhost/], region: 'me-central1' }, async (request) => {
    const { schoolId, classId } = request.data;
    if (!schoolId || !classId) throw new HttpsError('invalid-argument', 'schoolId ط¸ث† classId ط¸â€¦ط·آ·ط¸â€‍ط¸ث†ط·آ¨ط·آ§ط¸â€ ');

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
// FUNCTION 10: changeParentPassword أ¢â‚¬â€‌ ط·ع¾ط·ط›ط¸ظ¹ط¸ظ¹ط·آ± ط¸ئ’ط¸â€‍ط¸â€¦ط·آ© ط¸â€¦ط·آ±ط¸ث†ط·آ± ط¸ث†ط¸â€‍ط¸ظ¹ ط·آ§ط¸â€‍ط·آ£ط¸â€¦ط·آ± ط·آ¨ط·آ£ط¸â€¦ط·آ§ط¸â€ 
// ط¸ظ¹ط·ع¾ط·آ­ط¸â€ڑط¸â€ڑ ط¸â€¦ط¸â€  ط·آ§ط¸â€‍ط¸ئ’ط¸â€‍ط¸â€¦ط·آ© ط·آ§ط¸â€‍ط·آ­ط·آ§ط¸â€‍ط¸ظ¹ط·آ© server-side ط¸â€ڑط·آ¨ط¸â€‍ ط·آ§ط¸â€‍ط·آ­ط¸ظ¾ط·آ¸ ط·آ¨ط¸â‚¬ Firestore
// ============================================================
exports.changeParentPassword = onCall({ cors: [/bo3li1993\.github\.io$/, /localhost/], region: 'me-central1' }, async (request) => {
    const { schoolId, civilId, currentPassword, newPassword } = request.data;
    if (!schoolId || !civilId || !currentPassword || !newPassword) {
        throw new HttpsError('invalid-argument', 'ط·آ¬ط¸â€¦ط¸ظ¹ط·آ¹ ط·آ§ط¸â€‍ط·آ­ط¸â€ڑط¸ث†ط¸â€‍ ط¸â€¦ط·آ·ط¸â€‍ط¸ث†ط·آ¨ط·آ©');
    }
    if (newPassword.length < 6) throw new HttpsError('invalid-argument', 'ط¸ئ’ط¸â€‍ط¸â€¦ط·آ© ط·آ§ط¸â€‍ط¸â€¦ط·آ±ط¸ث†ط·آ± ط·آ§ط¸â€‍ط·آ¬ط·آ¯ط¸ظ¹ط·آ¯ط·آ© ط¸â€ڑط·آµط¸ظ¹ط·آ±ط·آ© ط·آ¬ط·آ¯ط·آ§ط¸â€¹');

    const crypto = require('crypto');
    const currentHash = crypto.createHash('sha256').update(currentPassword).digest('hex');

    const accountId = `${schoolId}_${civilId}`;
    const accountRef = db.collection('parent_accounts').doc(accountId);
    const accountSnap = await accountRef.get();

    if (!accountSnap.exists) throw new HttpsError('not-found', 'ط·آ§ط¸â€‍ط·آ­ط·آ³ط·آ§ط·آ¨ ط·ط›ط¸ظ¹ط·آ± ط¸â€¦ط¸ث†ط·آ¬ط¸ث†ط·آ¯');
    if (accountSnap.data().passwordHash !== currentHash) {
        throw new HttpsError('unauthenticated', 'ط¸ئ’ط¸â€‍ط¸â€¦ط·آ© ط·آ§ط¸â€‍ط¸â€¦ط·آ±ط¸ث†ط·آ± ط·آ§ط¸â€‍ط·آ­ط·آ§ط¸â€‍ط¸ظ¹ط·آ© ط·ط›ط¸ظ¹ط·آ± ط·آµط·آ­ط¸ظ¹ط·آ­ط·آ©');
    }

    const newHash = crypto.createHash('sha256').update(newPassword).digest('hex');
    await accountRef.update({ passwordHash: newHash, updatedAt: admin.firestore.FieldValue.serverTimestamp() });

    return { success: true };
});
// ============================================================
// FUNCTION 11: promoteStudents أ¢â‚¬â€‌ ط·آ§ط¸â€‍ط·ع¾ط·آ±ط·آ­ط¸ظ¹ط¸â€‍ ط·آ§ط¸â€‍ط·آ³ط¸â€ ط¸ث†ط¸ظ¹ ط·آ§ط¸â€‍ط·آ´ط·آ§ط¸â€¦ط¸â€‍
// ط¸ظ¹ط·آ±ط¸ظ¾ط·آ¹ ط¸ئ’ط¸â€‍ ط·آ·ط·آ§ط¸â€‍ط·آ¨ ط·آµط¸ظ¾ط·آ§ط¸â€¹ ط¸ث†ط·آ§ط·آ­ط·آ¯ط·آ§ط¸â€¹ (ط¸â€ ط¸ظ¾ط·آ³ ط·آ§ط¸â€‍ط·آ´ط·آ¹ط·آ¨ط·آ©)ط·إ’ ط¸ظ¹ط·آ¤ط·آ±ط·آ´ط¸ظ¾ ط·آµط¸ظ¾ 9 ط¸ئ’ط·آ®ط·آ±ط¸ظ¹ط·آ¬ط¸ظ¹ط¸â€ ط·إ’
// ط¸ث†ط¸ظ¹ط·آ³ط¸â€¦ ط¸ئ’ط¸â€‍ ط·آ§ط¸â€‍ط·آ³ط·آ¬ط¸â€‍ط·آ§ط·ع¾ ط·آ§ط¸â€‍ط·آ­ط·آ§ط¸â€‍ط¸ظ¹ط·آ© ط·آ¨ط·آ§ط¸â€‍ط·آ³ط¸â€ ط·آ© ط·آ§ط¸â€‍ط·آ¯ط·آ±ط·آ§ط·آ³ط¸ظ¹ط·آ© ط¸â€ڑط·آ¨ط¸â€‍ ط·آ§ط¸â€‍ط·ع¾ط·آ±ط·آ­ط¸ظ¹ط¸â€‍
// ============================================================
exports.promoteStudents = onCall({ cors: [/bo3li1993\.github\.io$/, /localhost/], region: 'me-central1' }, async (request) => {
    if (!request.auth || !['admin', 'assistant_manager'].includes(request.auth.token.role)) {
        throw new HttpsError('permission-denied', 'ط¸â€،ط·آ°ط·آ§ ط·آ§ط¸â€‍ط·آ¥ط·آ¬ط·آ±ط·آ§ط·طŒ ط¸ظ¹ط·ع¾ط·آ·ط¸â€‍ط·آ¨ ط·آµط¸â€‍ط·آ§ط·آ­ط¸ظ¹ط·آ© ط¸â€¦ط·آ¯ط¸ظ¹ط·آ±');
    }

    const { schoolId, academicYearLabel } = request.data;
    if (!schoolId) throw new HttpsError('invalid-argument', 'schoolId ط¸â€¦ط·آ·ط¸â€‍ط¸ث†ط·آ¨');
    if (request.auth.token.schoolId !== schoolId) {
        throw new HttpsError('permission-denied', 'ط¸â€‍ط·آ§ ط¸ظ¹ط¸â€¦ط¸ئ’ط¸â€ ط¸ئ’ ط·ع¾ط·آ±ط·آ­ط¸ظ¹ط¸â€‍ ط¸â€¦ط·آ¯ط·آ±ط·آ³ط·آ© ط·آ£ط·آ®ط·آ±ط¸â€°');
    }

    const now = new Date();
    const startYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
    const yearLabel = academicYearLabel || `${startYear}-${startYear + 1}`;

    // ===== ط·آ§ط¸â€‍ط·آ®ط·آ·ط¸ث†ط·آ© 1: ط·ع¾ط·آ³ط¸â€¦ط¸ظ¹ط·آ© ط¸ئ’ط¸â€‍ ط·آ§ط¸â€‍ط·آ³ط·آ¬ط¸â€‍ط·آ§ط·ع¾ ط·ط›ط¸ظ¹ط·آ± ط·آ§ط¸â€‍ط¸â€¦ط¸ث†ط·آ³ط¸ث†ط¸â€¦ط·آ© ط·آ¨ط·آ¹ط·آ¯ ط·آ¨ط·آ§ط¸â€‍ط·آ³ط¸â€ ط·آ© ط·آ§ط¸â€‍ط·آ¯ط·آ±ط·آ§ط·آ³ط¸ظ¹ط·آ© =====
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

    // ===== ط·آ§ط¸â€‍ط·آ®ط·آ·ط¸ث†ط·آ© 2: ط·ع¾ط·آ±ط·آ­ط¸ظ¹ط¸â€‍ ط·آ§ط¸â€‍ط·آ·ط¸â€‍ط·آ§ط·آ¨ =====
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

    // ===== ط·آ§ط¸â€‍ط·آ®ط·آ·ط¸ث†ط·آ© 3: ط·ع¾ط·آ­ط·آ¯ط¸ظ¹ط·آ« ط¸ئ’ط¸ث†ط¸â€‍ط¸ئ’ط·آ´ط¸â€  classes ط·آ¨ط·آ§ط¸â€‍ط¸ظ¾ط·آµط¸ث†ط¸â€‍ ط·آ§ط¸â€‍ط·آ¬ط·آ¯ط¸ظ¹ط·آ¯ط·آ© =====
    if (newClassesSet.size > 0) {
        const batch3 = db.batch();
        newClassesSet.forEach(c => {
            const ref = db.collection('classes').doc(`${schoolId}_${c.replace('/', '-')}`);
            batch3.set(ref, { schoolId, classId: c, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        });
        await batch3.commit();
    }

    // ===== ط·آ§ط¸â€‍ط·آ®ط·آ·ط¸ث†ط·آ© 4: ط·آ­ط¸ظ¾ط·آ¸ ط·آ³ط·آ¬ط¸â€‍ ط·آ§ط¸â€‍ط·ع¾ط·آ±ط·آ­ط¸ظ¹ط¸â€‍ ط¸â€ ط¸ظ¾ط·آ³ط¸â€، =====
    await db.collection('promotion_logs').add({
        schoolId, yearLabel, promoted, graduated, skipped,
        taggedCounts, performedBy: request.auth.token.userId || 'admin',
        performedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, promoted, graduated, skipped, taggedCounts, yearLabel };
});

// ============================================================
// FUNCTION 12: resetUserPassword أ¢â‚¬â€‌ ط·آ¥ط·آ¹ط·آ§ط·آ¯ط·آ© ط·ع¾ط·آ¹ط¸ظ¹ط¸ظ¹ط¸â€  ط¸ئ’ط¸â€‍ط¸â€¦ط·آ© ط¸â€¦ط·آ±ط¸ث†ط·آ± ط¸â€¦ط¸ث†ط·آ¸ط¸ظ¾ (Admin ط¸ظ¾ط¸â€ڑط·آ·)
// ط¸ظ¹ط·آ³ط·ع¾ط·آ®ط·آ¯ط¸â€¦ SHA-256 hash ط·آ¨ط·آ¯ط¸â€‍ ط·آ§ط¸â€‍ط¸â€ ط·آµ ط·آ§ط¸â€‍ط·آµط·آ±ط¸ظ¹ط·آ­ أ¢â‚¬â€‌ ط¸ظ¹ط·آ­ط¸â€‍ ط·آ«ط·ط›ط·آ±ط·آ© plainPass ط·ع¾ط·آ¯ط·آ±ط¸ظ¹ط·آ¬ط¸ظ¹ط·آ§ط¸â€¹
// ============================================================
exports.resetUserPassword = onCall({ cors: [/bo3li1993\.github\.io$/, /localhost/], region: 'me-central1' }, async (request) => {
    if (!request.auth || !['admin', 'assistant_manager'].includes(request.auth.token.role)) {
        throw new HttpsError('permission-denied', 'ط¸â€،ط·آ°ط·آ§ ط·آ§ط¸â€‍ط·آ¥ط·آ¬ط·آ±ط·آ§ط·طŒ ط¸ظ¹ط·ع¾ط·آ·ط¸â€‍ط·آ¨ ط·آµط¸â€‍ط·آ§ط·آ­ط¸ظ¹ط·آ© ط¸â€¦ط·آ¯ط¸ظ¹ط·آ±');
    }

    const { userDocId, newPassword } = request.data;
    if (!userDocId || !newPassword) throw new HttpsError('invalid-argument', 'ط·آ§ط¸â€‍ط·آ­ط¸â€ڑط¸ث†ط¸â€‍ ط¸â€¦ط·آ·ط¸â€‍ط¸ث†ط·آ¨ط·آ©');
    if (newPassword.length < 4) throw new HttpsError('invalid-argument', 'ط¸ئ’ط¸â€‍ط¸â€¦ط·آ© ط·آ§ط¸â€‍ط¸â€¦ط·آ±ط¸ث†ط·آ± ط¸â€ڑط·آµط¸ظ¹ط·آ±ط·آ© ط·آ¬ط·آ¯ط·آ§ط¸â€¹');

    const userRef = db.collection('users').doc(userDocId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) throw new HttpsError('not-found', 'ط·آ§ط¸â€‍ط¸â€¦ط·آ³ط·ع¾ط·آ®ط·آ¯ط¸â€¦ ط·ط›ط¸ظ¹ط·آ± ط¸â€¦ط¸ث†ط·آ¬ط¸ث†ط·آ¯');
    if (userSnap.data().schoolId !== request.auth.token.schoolId) {
        throw new HttpsError('permission-denied', 'ط¸â€‍ط·آ§ ط¸ظ¹ط¸â€¦ط¸ئ’ط¸â€ ط¸ئ’ ط·ع¾ط·آ¹ط·آ¯ط¸ظ¹ط¸â€‍ ط¸â€¦ط¸ث†ط·آ¸ط¸ظ¾ ط·آ¨ط¸â€¦ط·آ¯ط·آ±ط·آ³ط·آ© ط·آ£ط·آ®ط·آ±ط¸â€°');
    }

    const crypto = require('crypto');
    const passHash = crypto.createHash('sha256').update(newPassword).digest('hex');

    // ط¸â€ ط·آ­ط·آ°ط¸ظ¾ plainPass ط·آ§ط¸â€‍ط¸â€ڑط·آ¯ط¸ظ¹ط¸â€¦ (ط¸â€‍ط¸ث† ط¸â€¦ط¸ث†ط·آ¬ط¸ث†ط·آ¯) ط¸ث†ط¸â€ ط·آ­ط¸ظ¾ط·آ¸ passHash ط·آ§ط¸â€‍ط·آ¢ط¸â€¦ط¸â€  ط·آ¨ط·آ¯ط¸â€‍ط·آ§ط¸â€¹ ط¸â€¦ط¸â€ ط¸â€،
    await userRef.update({
        passHash,
        plainPass: admin.firestore.FieldValue.delete()
    });

    return { success: true };
});
// ============================================================
// FUNCTION 13: saveFcmToken أ¢â‚¬â€‌ ط·آ­ط¸ظ¾ط·آ¸ ط·ع¾ط¸ث†ط¸ئ’ط¸â€  ط·آ§ط¸â€‍ط·آ¥ط·آ´ط·آ¹ط·آ§ط·آ±ط·آ§ط·ع¾ ط¸â€‍ط¸ث†ط¸â€‍ط¸ظ¹ ط·آ§ط¸â€‍ط·آ£ط¸â€¦ط·آ±
// ============================================================
exports.saveFcmToken = onCall({ cors: [/bo3li1993\.github\.io$/, /localhost/], region: 'me-central1' }, async (request) => {
    const { schoolId, civilId, fcmToken } = request.data;
    if (!schoolId || !civilId || !fcmToken) {
        throw new HttpsError('invalid-argument', 'ط·آ§ط¸â€‍ط·آ¨ط¸ظ¹ط·آ§ط¸â€ ط·آ§ط·ع¾ ط¸â€ ط·آ§ط¸â€ڑط·آµط·آ©');
    }

    try {
        // ط¸â€ ط·آ¨ط·آ­ط·آ« ط·آ¹ط¸â€  ط¸ث†ط¸â€‍ط¸ظ¹ ط·آ§ط¸â€‍ط·آ£ط¸â€¦ط·آ± ط·آ¨ط·آ§ط¸â€‍ط·آ±ط¸â€ڑط¸â€¦ ط·آ§ط¸â€‍ط¸â€¦ط·آ¯ط¸â€ ط¸ظ¹
        const snap = await db.collection('users')
            .where('schoolId', '==', schoolId)
            .where('civilId', '==', civilId)
            .where('role', '==', 'parent')
            .limit(1).get();

        if (snap.empty) throw new HttpsError('not-found', 'ط¸ث†ط¸â€‍ط¸ظ¹ ط·آ§ط¸â€‍ط·آ£ط¸â€¦ط·آ± ط·ط›ط¸ظ¹ط·آ± ط¸â€¦ط¸ث†ط·آ¬ط¸ث†ط·آ¯');

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
// FUNCTION 14: askAiAssistant أ¢â‚¬â€‌ ط·آ§ط¸â€‍ط¸â€¦ط·آ³ط·آ§ط·آ¹ط·آ¯ ط·آ§ط¸â€‍ط·آ°ط¸ئ’ط¸ظ¹ (proxy ط·آ¢ط¸â€¦ط¸â€ )
// ط¸ظ¹ط·آ³ط·ع¾ط·آ¯ط·آ¹ط¸ظ¹ Claude API ط·آ¨ط·آ¯ط¸ث†ط¸â€  ط¸ئ’ط·آ´ط¸ظ¾ ط·آ§ط¸â€‍ط¸â‚¬ API key ط¸â€‍ط¸â€‍ط¸â‚¬ frontend
// ============================================================
exports.askAiAssistant = onCall({ cors: [/bo3li1993\.github\.io$/, /localhost/], region: 'me-central1' }, async (request) => {
    const { context, question, history = [] } = request.data;

    if (!question) throw new HttpsError('invalid-argument', 'ط·آ§ط¸â€‍ط·آ³ط·آ¤ط·آ§ط¸â€‍ ط¸â€¦ط·آ·ط¸â€‍ط¸ث†ط·آ¨');

    // API Key ط¸â€¦ط·آ­ط¸ظ¾ط¸ث†ط·آ¸ ط¸ظ¾ط¸ظ¹ Firebase environment
    const apiKey = process.env.ANTHROPIC_API_KEY || functions.config().anthropic?.api_key;
    if (!apiKey) throw new HttpsError('internal', 'API key ط·ط›ط¸ظ¹ط·آ± ط¸â€¦ط¸عˆط·آ¹ط¸ظ¹ط¸عکط¸â€کط¸â€ ');

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
                system: `ط·آ£ط¸â€ ط·ع¾ ط¸â€¦ط·آ³ط·آ§ط·آ¹ط·آ¯ ط·آ°ط¸ئ’ط¸ظ¹ ط·آ¯ط·آ§ط·آ®ط¸â€‍ ط¸â€¦ط¸â€ ط·آ¸ط¸ث†ط¸â€¦ط·آ© ط·آ¥ط·آ¯ط·آ§ط·آ±ط·آ© ط¸â€¦ط·آ¯ط·آ±ط·آ³ط·آ© ط¸ظ¾ط¸ظ¹ ط·آ§ط¸â€‍ط¸ئ’ط¸ث†ط¸ظ¹ط·ع¾.
ط·ع¾ط·آ¬ط·آ§ط¸ث†ط·آ¨ ط·آ¨ط·آ§ط¸â€‍ط·آ¹ط·آ±ط·آ¨ط¸ظ¹ ط·آ¨ط·آ´ط¸ئ’ط¸â€‍ ط¸â€¦ط·آ®ط·ع¾ط·آµط·آ± ط¸ث†ط¸ث†ط·آ§ط·آ¶ط·آ­ ط¸ث†ط¸â€¦ط¸ظ¾ط¸ظ¹ط·آ¯.
ط¸â€‍ط·آ§ ط·ع¾ط·آ³ط·ع¾ط·آ®ط·آ¯ط¸â€¦ ط¸â€¦ط·آµط·آ·ط¸â€‍ط·آ­ط·آ§ط·ع¾ ط·ع¾ط¸â€ڑط¸â€ ط¸ظ¹ط·آ©.
ط·آ§ط¸â€‍ط·آ£ط·آ±ط¸â€ڑط·آ§ط¸â€¦ ط¸ث†ط·آ§ط¸â€‍ط·آ£ط·آ³ط¸â€¦ط·آ§ط·طŒ ط¸â€¦ط¸â€  ط·آ§ط¸â€‍ط·آ¨ط¸ظ¹ط·آ§ط¸â€ ط·آ§ط·ع¾ ط·آ§ط¸â€‍ط¸â€¦ط¸عˆط·آ¹ط·آ·ط·آ§ط·آ© ط¸ظ¾ط¸â€ڑط·آ·.
ط·آ¥ط·آ°ط·آ§ ط·آ§ط¸â€‍ط·آ³ط·آ¤ط·آ§ط¸â€‍ ط·آ¹ط¸â€  ط·آ¥ط·آ¬ط·آ±ط·آ§ط·طŒط·إ’ ط¸ث†ط·آ¶ط¸â€کط·آ­ ط·آ§ط¸â€‍ط·آ®ط·آ·ط¸ث†ط·آ§ط·ع¾ ط·آ¨ط·آ¨ط·آ³ط·آ§ط·آ·ط·آ©.`,
                messages: [
                    ...history.map(h => ({ role: h.role, content: h.content })),
                    { role: 'user', content: `ط·آ§ط¸â€‍ط·آ¨ط¸ظ¹ط·آ§ط¸â€ ط·آ§ط·ع¾ ط·آ§ط¸â€‍ط·آ­ط·آ§ط¸â€‍ط¸ظ¹ط·آ©:\n${context}\n\nط·آ§ط¸â€‍ط·آ³ط·آ¤ط·آ§ط¸â€‍: ${question}` }
                ]
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Claude API error: ${response.status} أ¢â‚¬â€‌ ${err}`);
        }

        const data = await response.json();
        return { answer: data.content?.[0]?.text || 'ط¸â€‍ط¸â€¦ ط¸ظ¹ط¸عˆط·آ±ط·آ¬ط·آ¹ ط·آ§ط¸â€‍ط¸â€¦ط·آ³ط·آ§ط·آ¹ط·آ¯ ط·آ¥ط·آ¬ط·آ§ط·آ¨ط·آ©' };

    } catch(e) {
        console.error('askAiAssistant error:', e.message);
        throw new HttpsError('internal', 'ط·ع¾ط·آ¹ط·آ°ط·آ± ط·آ§ط¸â€‍ط·آ§ط·ع¾ط·آµط·آ§ط¸â€‍ ط·آ¨ط·آ§ط¸â€‍ط¸â€¦ط·آ³ط·آ§ط·آ¹ط·آ¯ ط·آ§ط¸â€‍ط·آ°ط¸ئ’ط¸ظ¹: ' + e.message);
    }
});// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
// FUNCTION: addStudentIds - ط¥ط¶ط§ظپط© studentId ظ„ظƒظ„ ط§ظ„ط·ظ„ط§ط¨ ط§ظ„ظ‚ط¯ط§ظ…ظ‰
// طھط´ط؛ظ‘ظ„ ظ…ط±ط© ظˆط§ط­ط¯ط© ظپظ‚ط· ظ…ظ† super admin
// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
exports.addStudentIds = onCall({
    cors: [/bo3li1993\.github\.io$/, /localhost/],
    region: "me-central1"
}, async (request) => {
    if (!request.auth || request.auth.uid !== "superadmin") {
        throw new HttpsError("permission-denied", "Super Admin ظپظ‚ط·");
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
// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
// FUNCTION: linkParentsToStudents - ط±ط¨ط· ط£ظˆظ„ظٹط§ط، ط§ظ„ط£ظ…ظˆط± ط¨ظ€ studentId
// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
exports.linkParentsToStudents = onCall({
    cors: [/bo3li1993\.github\.io$/, /localhost/],
    region: "me-central1"
}, async (request) => {
    if (!request.auth || request.auth.uid !== "superadmin") {
        throw new HttpsError("permission-denied", "Super Admin ظپظ‚ط·");
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
// ════════════════════════════════════════════════════════════════
// FUNCTION: archiveYear — أرشفة سنوية للبيانات
// ════════════════════════════════════════════════════════════════
exports.archiveYear = onCall({
    cors: [/bo3li1993\.github\.io$/, /localhost/],
    region: "me-central1"
}, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "يجب تسجيل الدخول");

    const adminDoc = await db.collection("users").doc(request.auth.uid).get();
    if (!adminDoc.exists || !["admin", "superadmin"].includes(adminDoc.data().role)) {
        throw new HttpsError("permission-denied", "المدير فقط");
    }

    const { year, schoolId } = request.data;
    if (!year || !schoolId) throw new HttpsError("invalid-argument", "year و schoolId مطلوبان");

    const verifiedSchoolId = adminDoc.data().role === "superadmin" ? schoolId : adminDoc.data().schoolId;

    try {
        // أرشف بيانات الغياب
        const attendanceSnap = await db.collection("attendance")
            .where("schoolId", "==", verifiedSchoolId)
            .where("date", ">=", year + "-01-01")
            .where("date", "<=", year + "-12-31")
            .get();

        const batch = db.batch();
        let archived = 0;

        attendanceSnap.docs.forEach(function(doc) {
            const archiveRef = db.collection("archive_attendance").doc(year + "_" + doc.id);
            batch.set(archiveRef, { ...doc.data(), archivedYear: year, archivedAt: admin.firestore.FieldValue.serverTimestamp() });
            archived++;
        });

        // أرشف بيانات السلوك
        const behaviorSnap = await db.collection("behavior")
            .where("schoolId", "==", verifiedSchoolId)
            .where("date", ">=", year + "-01-01")
            .where("date", "<=", year + "-12-31")
            .get();

        behaviorSnap.docs.forEach(function(doc) {
            const archiveRef = db.collection("archive_behavior").doc(year + "_" + doc.id);
            batch.set(archiveRef, { ...doc.data(), archivedYear: year, archivedAt: admin.firestore.FieldValue.serverTimestamp() });
            archived++;
        });

        // أرشف الإنذارات
        const warningsSnap = await db.collection("warnings")
            .where("schoolId", "==", verifiedSchoolId)
            .where("date", ">=", year + "-01-01")
            .where("date", "<=", year + "-12-31")
            .get();

        warningsSnap.docs.forEach(function(doc) {
            const archiveRef = db.collection("archive_warnings").doc(year + "_" + doc.id);
            batch.set(archiveRef, { ...doc.data(), archivedYear: year, archivedAt: admin.firestore.FieldValue.serverTimestamp() });
            archived++;
        });

        await batch.commit();

        // سجل العملية في audit log
        await db.collection("audit_log").add({
            schoolId: verifiedSchoolId,
            action: "archive_year",
            year: year,
            recordsArchived: archived,
            performedBy: adminDoc.data().name || request.auth.uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return { 
            success: true, 
            archived: archived,
            message: "تم أرشفة " + archived + " سجل للسنة " + year
        };

    } catch(e) {
        throw new HttpsError("internal", "خطأ في الأرشفة: " + e.message);
    }
});

// ════════════════════════════════════════════════════════════════
// FUNCTION: getAuditLog — سجل التدقيق الكامل
// ════════════════════════════════════════════════════════════════
exports.getAuditLog = onCall({
    cors: [/bo3li1993\.github\.io$/, /localhost/],
    region: "me-central1"
}, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "يجب تسجيل الدخول");

    const adminDoc = await db.collection("users").doc(request.auth.uid).get();
    if (!adminDoc.exists || !["admin", "superadmin", "assistant_manager"].includes(adminDoc.data().role)) {
        throw new HttpsError("permission-denied", "لا توجد صلاحيات");
    }

    const schoolId = adminDoc.data().schoolId;
    const { limit: limitNum = 50 } = request.data || {};

    const snap = await db.collection("audit_log")
        .where("schoolId", "==", schoolId)
        .orderBy("createdAt", "desc")
        .limit(limitNum)
        .get();

    const logs = [];
    snap.forEach(function(doc) {
        const data = doc.data();
        logs.push({
            id: doc.id,
            action: data.action,
            performedBy: data.performedBy,
            details: data.details || "",
            createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null
        });
    });

    return { logs: logs };
});