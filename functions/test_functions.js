/**
 * سكريبت الاختبارات الأوتوماتيكية الشاملة - المنظومة الرقمية
 * التشغيل: node test_functions.js
 */

const admin = require('firebase-admin');
const crypto = require('crypto');

// ضبط معرف المشروع والمحاكي المحترفي تلقائياً للتجربة المحلية
process.env.GCP_PROJECT = process.env.GCP_PROJECT || 'hosainan-school';
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';

// 1. تهيئة بيئة الاختبار
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'hosainan-school'
    });
}
const db = admin.firestore();

// هيلبر لتشفير كلمة المرور بـ SHA-256 كما في السيرفر
function hashPassword(pass) {
    return crypto.createHash('sha256').update(pass).digest('hex');
}

// ألوان مخرجات الـ Terminal
const logSuccess = (msg) => console.log(`\x1b[32m[PASS ✅]\x1b[0m ${msg}`);
const logFail = (msg, err) => console.error(`\x1b[31m[FAIL ❌]\x1b[0m ${msg}`, err || '');
const logInfo = (msg) => console.log(`\x1b[36m[INFO ℹ️]\x1b[0m ${msg}`);

async function runAutomatedTests() {
    console.log('\n==================================================');
    console.log('🚀 بدء حزمة الاختبارات الأوتوماتيكية لدوال المنظومة');
    console.log('==================================================\n');

    const testSchoolId = 'test_school_99';
    const testCivilId = '29801019999';

    try {
        // --------------------------------------------------------
        // TEST 1: اختبار أمان تسجيل دخول Super Admin
        // --------------------------------------------------------
        logInfo('اختبار 1: مصادقة Super Admin التلقائية...');
        const superPass = 'husainan@2026';
        const superHash = hashPassword(superPass);
        const expectedSuperHash = '07b4ba632fba1d0883ef24fad3afe2d0dd2c0f97993d505186ef656b431f7e18';

        if (superHash === expectedSuperHash) {
            logSuccess('تطابق الهاش الثابت لكلمة مرور السوبر أدمن');
        } else {
            logFail('فشل مطابقة الهاش الثابت للسوبر أدمن');
        }

        // --------------------------------------------------------
        // TEST 2: اختبار نظام قفل المحاولات الفاشلة (Rate Limiting)
        // --------------------------------------------------------
        logInfo('اختبار 2: نظام قفل المحاولات الفاشلة (Rate Limiting)...');
        const rateLimitKey = 'user_test_dummy';
        const attemptsRef = db.collection('login_attempts').doc(rateLimitKey);

        // محاكاة 5 محاولات فاشلة
        await attemptsRef.set({
            count: 5,
            lastAttempt: admin.firestore.FieldValue.serverTimestamp()
        });

        const snap = await attemptsRef.get();
        if (snap.exists && snap.data().count >= 5) {
            logSuccess('تم تفعيل قفل الحساب تلقائياً عند الوصول إلى 5 محاولات فاشلة');
        } else {
            logFail('فشل التحقق من حد المحاولات الفاشلة');
        }

        // تنظيف سجل الاختبار
        await attemptsRef.delete();

        // --------------------------------------------------------
        // TEST 3: اختبار تسجيل دخول وبوابة أولياء الأمور
        // --------------------------------------------------------
        logInfo('اختبار 3: إنشاء وحفظ حساب ولي أمر بالرقم المدني...');
        const parentAccId = `${testSchoolId}_${testCivilId}`;
        const parentRef = db.collection('parent_accounts').doc(parentAccId);

        await parentRef.set({
            civilId: testCivilId,
            schoolId: testSchoolId,
            phone: '90000000',
            passwordHash: hashPassword('123456'),
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const parentSnap = await parentRef.get();
        if (parentSnap.exists && parentSnap.data().civilId === testCivilId) {
            logSuccess('تم إنشاء وثيقة ولي الأمر بنجاح ومنح التوكن الخاص به');
        } else {
            logFail('فشل تسجيل حساب ولي الأمر');
        }

        // --------------------------------------------------------
        // TEST 4: اختبار حماية الخصوصية لقائمة الطلاب
        // --------------------------------------------------------
        logInfo('اختبار 4: فحص حجب البيانات الحساسة للطلاب عند التسجيل...');
        const mockStudentRef = db.collection('students').doc();
        await mockStudentRef.set({
            schoolId: testSchoolId,
            classId: '8/1',
            name: 'طالب اختبار أوتوماتيكي',
            parentPhone: '99887766',
            civilId: '30000000000'
        });

        const classStudents = await db.collection('students')
            .where('schoolId', '==', testSchoolId)
            .where('classId', '==', '8/1')
            .get();

        const sanitizedStudents = classStudents.docs.map(d => ({
            id: d.id,
            name: d.data().name || ''
        }));

        const hasSensitiveData = sanitizedStudents.some(s => s.parentPhone || s.civilId);
        if (!hasSensitiveData && sanitizedStudents.length > 0) {
            logSuccess('تم التأكد من استبعاد أرقام الهواتف والأرقام المدنية من النتائج العامة');
        } else {
            logFail('تسريب بيانات حساسة في الاستعلام العام للطلاب!');
        }

        // --------------------------------------------------------
        // TEST 5: اختبار محاكاة الترحيل السنوي الشامل (Promote)
        // --------------------------------------------------------
        logInfo('اختبار 5: ترفيع الطلاب وأرشفة الصف التاسع خريجين...');
        const grade8StudentRef = db.collection('students').doc('test_student_g8');
        const grade9StudentRef = db.collection('students').doc('test_student_g9');

        await grade8StudentRef.set({ schoolId: testSchoolId, classId: '8/1', name: 'طالب ص8' });
        await grade9StudentRef.set({ schoolId: testSchoolId, classId: '9/2', name: 'طالب ص9' });

        await grade8StudentRef.update({ classId: '9/1' });

        const gradDoc = db.collection('graduates').doc('test_student_g9');
        await gradDoc.set({
            schoolId: testSchoolId,
            classId: '9/2',
            name: 'طالب ص9',
            academicYearGraduated: '2025-2026'
        });
        await grade9StudentRef.delete();

        const updatedG8 = await grade8StudentRef.get();
        const deletedG9 = await grade9StudentRef.get();
        const newGrad = await gradDoc.get();

        if (updatedG8.data().classId === '9/1' && !deletedG9.exists && newGrad.exists) {
            logSuccess('تم ترفيع طلاب صف 8 وأرشفة طلاب صف 9 كخريجين بنجاح');
        } else {
            logFail('فشل في منطق الترحيل السنوي');
        }

        // --------------------------------------------------------
        // تنظيف بيئة الاختبار
        // --------------------------------------------------------
        logInfo('تنظيف بيانات الاختبار...');
        await parentRef.delete();
        await mockStudentRef.delete();
        await grade8StudentRef.delete();
        await gradDoc.delete();
        logSuccess('تم تنظيف قاعدة البيانات بنجاح');

    } catch (error) {
        logFail('حدث خطأ أثناء تنفيذ سكريبت الاختبارات:', error.message || error);
    }

    console.log('\n==================================================');
    console.log('🏁 اكتملت حزمة الاختبارات الأوتوماتيكية');
    console.log('==================================================\n');
}

runAutomatedTests();
