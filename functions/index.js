const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// ============================================================
// FUNCTION 1: loginUser — مصادقة المستخدمين (موجودة ومفعّلة)
// ============================================================
exports.loginUser = onCall({ cors: true, region: 'us-central1' }, async (request) => {
    const { schoolId, userId, password } = request.data;
    if (!userId || !password) throw new HttpsError('invalid-argument', 'userId و password مطلوبان');

    // Super Admin
    if (userId === 'superadmin') {
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256').update(password).digest('hex');

        const configSnap = await db.collection('system_config').where('key', '==', 'super_pass_hash').limit(1).get();
        const DEFAULT_HASH = 'e2fedb220c651a45d88c3237fd27e98b4ed6daf5c83b66f6988b36a215528fe2';
        const SUPER_HASH = configSnap.empty ? DEFAULT_HASH : configSnap.docs[0].data().value;

        if (hash !== SUPER_HASH) throw new HttpsError('unauthenticated', 'كلمة المرور غير صحيحة');
        const token = await admin.auth().createCustomToken('superadmin', { role: 'superadmin', schoolId: 'system' });
        return { token, role: 'superadmin', schoolId: 'system', name: 'حسين', userId: 'superadmin' };
    }

    // Regular users
    let usersQuery = db.collection('users').where('userId', '==', userId);
    if (schoolId) usersQuery = usersQuery.where('schoolId', '==', schoolId);
    const snap = await usersQuery.limit(1).get();

    if (snap.empty) throw new HttpsError('not-found', 'المستخدم غير موجود');

    const user = snap.docs[0].data();
    if (user.plainPass !== password) throw new HttpsError('unauthenticated', 'كلمة المرور غير صحيحة');
    if (user.status === 'suspended') throw new HttpsError('permission-denied', 'الحساب موقوف');

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
// FUNCTION 2: onAttendanceCreated — إشعار FCM عند تسجيل غياب
// ============================================================
exports.onAttendanceCreated = onDocumentCreated({
    document: 'attendance/{docId}',
    region: 'us-central1'
}, async (event) => {
    const data = event.data.data();

    // فقط الغياب (مش حضور أو تأخير)
    if (data.status !== 'absent') return null;

    const { studentName, classId, period, date, schoolId } = data;

    try {
        // جلب بيانات الطالب (رقم هاتف ولي الأمر)
        const studentsSnap = await db.collection('students')
            .where('schoolId', '==', schoolId)
            .where('name', '==', studentName)
            .limit(1).get();

        if (studentsSnap.empty) return null;
        const student = studentsSnap.docs[0].data();
        const parentPhone = student.parentPhone;
        if (!parentPhone) return null;

        // إضافة لقائمة إشعارات واتساب (للإرسال اليدوي أو السيرفر)
        await db.collection('notifications_queue').add({
            schoolId,
            studentName,
            classId,
            period,
            date,
            parentPhone,
            message: `غياب: ${studentName} — الفصل ${classId} — الحصة ${period} — ${date}`,
            type: 'absence',
            sent: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // إرسال FCM لولي الأمر (لو مسجّل)
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
                        title: `غياب: ${studentName}`,
                        body: `غاب ابنكم بتاريخ ${date} — الحصة ${period}`
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
// FUNCTION 3: generateMonthlyReport — تقرير شهري تلقائي
// كل أول الشهر الساعة 7 صباحاً بتوقيت الكويت (UTC+3 = 04:00 UTC)
// ============================================================
exports.generateMonthlyReport = onSchedule({
    schedule: '0 4 1 * *',
    timeZone: 'Asia/Kuwait',
    region: 'us-central1'
}, async (event) => {
    console.log('🔄 Monthly Report: Starting...');

    // الشهر الماضي
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const fromDate = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth()+1).padStart(2,'0')}-01`;
    const toDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth()+1, 0).toISOString().slice(0,10);
    const monthLabel = `${lastMonth.getFullYear()}/${String(lastMonth.getMonth()+1).padStart(2,'0')}`;

    // جلب كل المدارس النشطة
    const schoolsSnap = await db.collection('schools').where('status', '==', 'active').get();
    console.log(`Found ${schoolsSnap.size} active schools`);

    for (const schoolDoc of schoolsSnap.docs) {
        const schoolId = schoolDoc.id;
        const schoolData = schoolDoc.data();

        try {
            // إحصائيات الغياب
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

            // إحصائيات السلوك
            const behSnap = await db.collection('behavior')
                .where('schoolId', '==', schoolId)
                .where('date', '>=', fromDate)
                .where('date', '<=', toDate)
                .get();

            // إحصائيات الاستئذان
            const gateSnap = await db.collection('gatepass')
                .where('schoolId', '==', schoolId)
                .where('dateStr', '>=', fromDate)
                .where('dateStr', '<=', toDate)
                .get();

            // إحصائيات العيادة
            const clinicSnap = await db.collection('clinic')
                .where('schoolId', '==', schoolId)
                .where('dateStr', '>=', fromDate)
                .where('dateStr', '<=', toDate)
                .get();

            // تجميع بالفصل والطالب
            const absenceByClass = {};
            const absenceByStudent = {};
            let positiveBeh = 0, negativeBeh = 0;

            absSnap.forEach(d => {
                const dd = d.data();
                absenceByClass[dd.classId] = (absenceByClass[dd.classId] || 0) + 1;
                absenceByStudent[dd.studentName] = (absenceByStudent[dd.studentName] || 0) + 1;
            });

            behSnap.forEach(d => {
                if (d.data().type === 'إيجابي') positiveBeh++;
                else if (d.data().type === 'سلبي') negativeBeh++;
            });

            // أكثر 10 طلاب غياباً
            const topAbsentees = Object.entries(absenceByStudent)
                .sort((a,b) => b[1]-a[1]).slice(0,10)
                .map(([name, count]) => ({ name, count }));

            // حفظ التقرير بـ Firestore
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

            console.log(`✅ Report generated for ${schoolId}: ${absSnap.size} absences`);
        } catch (err) {
            console.error(`❌ Error for ${schoolId}:`, err);
        }
    }

    return null;
});

// ============================================================
// FUNCTION 4: generateReportNow — توليد تقرير فوري (Callable)
// يُستدعى من super.html أو admin.html لتوليد تقرير أي شهر
// ============================================================
exports.generateReportNow = onCall({ cors: true, region: 'us-central1' }, async (request) => {
    const { schoolId, fromDate, toDate, monthLabel } = request.data;
    if (!schoolId || !fromDate || !toDate) throw new HttpsError('invalid-argument', 'schoolId و fromDate و toDate مطلوبة');

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
        if (d.data().type === 'إيجابي') positiveBeh++;
        else if (d.data().type === 'سلبي') negativeBeh++;
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
// FUNCTION 5: changeSuperPassword — تغيير كلمة مرور السوبر أدمن بأمان
// يتحقق من الكلمة الحالية server-side قبل الحفظ بـ Firestore
// ============================================================
exports.changeSuperPassword = onCall({ cors: true, region: 'us-central1' }, async (request) => {
    const { currentPassword, newPassword } = request.data;
    if (!currentPassword || !newPassword) throw new HttpsError('invalid-argument', 'الحقول مطلوبة');
    if (newPassword.length < 6) throw new HttpsError('invalid-argument', 'كلمة المرور الجديدة قصيرة جداً');

    const crypto = require('crypto');
    const currentHash = crypto.createHash('sha256').update(currentPassword).digest('hex');

    // جلب الـ hash الحالي المخزّن (من system_config أو الافتراضي)
    const configSnap = await db.collection('system_config').where('key', '==', 'super_pass_hash').limit(1).get();
    const DEFAULT_HASH = 'e2fedb220c651a45d88c3237fd27e98b4ed6daf5c83b66f6988b36a215528fe2';
    const storedHash = configSnap.empty ? DEFAULT_HASH : configSnap.docs[0].data().value;

    if (currentHash !== storedHash) throw new HttpsError('unauthenticated', 'كلمة المرور الحالية غير صحيحة');

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
// FUNCTION 6: registerParent — تسجيل حساب ولي أمر جديد
// يُنشئ حساب بالرقم المدني ويُصدر Custom Token لتسجيل الدخول الفوري
// ============================================================
exports.registerParent = onCall({ cors: true, region: 'us-central1' }, async (request) => {
    const { schoolId, civilId, phone, password } = request.data;
    if (!schoolId || !civilId || !phone || !password) {
        throw new HttpsError('invalid-argument', 'جميع الحقول مطلوبة');
    }
    if (!/^\d{5,15}$/.test(civilId)) throw new HttpsError('invalid-argument', 'الرقم المدني غير صحيح');
    if (password.length < 6) throw new HttpsError('invalid-argument', 'كلمة المرور قصيرة جداً');

    const accountId = `${schoolId}_${civilId}`;
    const accountRef = db.collection('parent_accounts').doc(accountId);
    const existing = await accountRef.get();
    if (existing.exists) throw new HttpsError('already-exists', 'هذا الرقم المدني مسجّل مسبقاً');

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
// FUNCTION 7: loginParent — تسجيل دخول ولي الأمر بالرقم المدني
// ============================================================
exports.loginParent = onCall({ cors: true, region: 'us-central1' }, async (request) => {
    const { schoolId, civilId, password } = request.data;
    if (!civilId || !password) throw new HttpsError('invalid-argument', 'الرقم المدني وكلمة المرور مطلوبان');

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
            throw new HttpsError('failed-precondition', 'يرجى استخدام رابط مدرستك الخاص لتسجيل الدخول');
        }
    }

    if (!accountData || accountData.passwordHash !== passwordHash) {
        throw new HttpsError('unauthenticated', 'الرقم المدني أو كلمة المرور غير صحيحة');
    }

    const accountId = `${matchedSchoolId}_${civilId}`;
    const token = await admin.auth().createCustomToken(accountId, { role: 'parent', schoolId: matchedSchoolId, civilId });
    return { token, schoolId: matchedSchoolId, civilId };
});

// ============================================================
// FUNCTION 8: getRegistrationClasses — جلب قائمة الفصول (بدون حاجة لتسجيل دخول)
// يُستخدم فقط بصفحة تسجيل ولي الأمر الجديد، يرجع أسماء الفصول فقط (بيانات غير حساسة)
// ============================================================
exports.getRegistrationClasses = onCall({ cors: true, region: 'us-central1' }, async (request) => {
    const { schoolId } = request.data;
    if (!schoolId) throw new HttpsError('invalid-argument', 'schoolId مطلوب');

    // نجرب classes collection أولاً (أخف وأسرع)
    const classesSnap = await db.collection('classes').where('schoolId', '==', schoolId).get();
    if (!classesSnap.empty) {
        const classes = [...new Set(classesSnap.docs.map(d => d.data().classId).filter(Boolean))];
        return { classes: classes.sort((a, b) => a.localeCompare(b)) };
    }

    // fallback: مسح students لاستخراج الفصول
    const studentsSnap = await db.collection('students').where('schoolId', '==', schoolId).get();
    const classes = [...new Set(studentsSnap.docs.map(d => d.data().classId).filter(Boolean))];
    return { classes: classes.sort((a, b) => a.localeCompare(b)) };
});

// ============================================================
// FUNCTION 9: getRegistrationStudents — جلب أسماء طلاب فصل معيّن (بدون تسجيل دخول)
// يرجع فقط id + name (بدون هاتف أو رقم مدني، حماية للخصوصية)
// ============================================================
exports.getRegistrationStudents = onCall({ cors: true, region: 'us-central1' }, async (request) => {
    const { schoolId, classId } = request.data;
    if (!schoolId || !classId) throw new HttpsError('invalid-argument', 'schoolId و classId مطلوبان');

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
// FUNCTION 10: changeParentPassword — تغيير كلمة مرور ولي الأمر بأمان
// يتحقق من الكلمة الحالية server-side قبل الحفظ بـ Firestore
// ============================================================
exports.changeParentPassword = onCall({ cors: true, region: 'us-central1' }, async (request) => {
    const { schoolId, civilId, currentPassword, newPassword } = request.data;
    if (!schoolId || !civilId || !currentPassword || !newPassword) {
        throw new HttpsError('invalid-argument', 'جميع الحقول مطلوبة');
    }
    if (newPassword.length < 6) throw new HttpsError('invalid-argument', 'كلمة المرور الجديدة قصيرة جداً');

    const crypto = require('crypto');
    const currentHash = crypto.createHash('sha256').update(currentPassword).digest('hex');

    const accountId = `${schoolId}_${civilId}`;
    const accountRef = db.collection('parent_accounts').doc(accountId);
    const accountSnap = await accountRef.get();

    if (!accountSnap.exists) throw new HttpsError('not-found', 'الحساب غير موجود');
    if (accountSnap.data().passwordHash !== currentHash) {
        throw new HttpsError('unauthenticated', 'كلمة المرور الحالية غير صحيحة');
    }

    const newHash = crypto.createHash('sha256').update(newPassword).digest('hex');
    await accountRef.update({ passwordHash: newHash, updatedAt: admin.firestore.FieldValue.serverTimestamp() });

    return { success: true };
});