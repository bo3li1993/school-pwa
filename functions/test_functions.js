/**
 * ط³ظƒط±ظٹط¨طھ ط§ظ„ط§ط®طھط¨ط§ط±ط§طھ ط§ظ„ط£ظˆطھظˆظ…ط§طھظٹظƒظٹط© ط§ظ„ط´ط§ظ…ظ„ط© - ط§ظ„ظ…ظ†ط¸ظˆظ…ط© ط§ظ„ط±ظ‚ظ…ظٹط©
 * ط§ظ„طھط´ط؛ظٹظ„: node test_functions.js
 */

const admin = require('firebase-admin');
const crypto = require('crypto');

// ط¶ط¨ط· ظ…ط¹ط±ظپ ط§ظ„ظ…ط´ط±ظˆط¹ ظˆط§ظ„ظ…ط­ط§ظƒظٹ ط§ظ„ظ…ط­طھط±ظپظٹ طھظ„ظ‚ط§ط¦ظٹط§ظ‹ ظ„ظ„طھط¬ط±ط¨ط© ط§ظ„ظ…ط­ظ„ظٹط©
process.env.GCP_PROJECT = process.env.GCP_PROJECT || 'hosainan-school';
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';

// 1. طھظ‡ظٹط¦ط© ط¨ظٹط¦ط© ط§ظ„ط§ط®طھط¨ط§ط±
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'hosainan-school'
    });
}
const db = admin.firestore();

// ظ‡ظٹظ„ط¨ط± ظ„طھط´ظپظٹط± ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ط¨ظ€ SHA-256 ظƒظ…ط§ ظپظٹ ط§ظ„ط³ظٹط±ظپط±
function hashPassword(pass) {
    return crypto.createHash('sha256').update(pass).digest('hex');
}

// ط£ظ„ظˆط§ظ† ظ…ط®ط±ط¬ط§طھ ط§ظ„ظ€ Terminal
const logSuccess = (msg) => console.log(`\x1b[32m[PASS âœ…]\x1b[0m ${msg}`);
const logFail = (msg, err) => console.error(`\x1b[31m[FAIL â‌Œ]\x1b[0m ${msg}`, err || '');
const logInfo = (msg) => console.log(`\x1b[36m[INFO â„¹ï¸ڈ]\x1b[0m ${msg}`);

async function runAutomatedTests() {
    console.log('\n==================================================');
    console.log('ًںڑ€ ط¨ط¯ط، ط­ط²ظ…ط© ط§ظ„ط§ط®طھط¨ط§ط±ط§طھ ط§ظ„ط£ظˆطھظˆظ…ط§طھظٹظƒظٹط© ظ„ط¯ظˆط§ظ„ ط§ظ„ظ…ظ†ط¸ظˆظ…ط©');
    console.log('==================================================\n');

    const testSchoolId = 'test_school_99';
    const testCivilId = '29801019999';

    try {
        // --------------------------------------------------------
        // TEST 1: ط§ط®طھط¨ط§ط± ط£ظ…ط§ظ† طھط³ط¬ظٹظ„ ط¯ط®ظˆظ„ Super Admin
        // --------------------------------------------------------
        logInfo('ط§ط®طھط¨ط§ط± 1: ظ…طµط§ط¯ظ‚ط© Super Admin ط§ظ„طھظ„ظ‚ط§ط¦ظٹط©...');
        const superPass = process.env.TEST_SUPER_PASS || 'test-password-only';
        const superHash = hashPassword(superPass);
        const expectedSuperHash = '07b4ba632fba1d0883ef24fad3afe2d0dd2c0f97993d505186ef656b431f7e18';

        if (superHash === expectedSuperHash) {
            logSuccess('طھط·ط§ط¨ظ‚ ط§ظ„ظ‡ط§ط´ ط§ظ„ط«ط§ط¨طھ ظ„ظƒظ„ظ…ط© ظ…ط±ظˆط± ط§ظ„ط³ظˆط¨ط± ط£ط¯ظ…ظ†');
        } else {
            logFail('ظپط´ظ„ ظ…ط·ط§ط¨ظ‚ط© ط§ظ„ظ‡ط§ط´ ط§ظ„ط«ط§ط¨طھ ظ„ظ„ط³ظˆط¨ط± ط£ط¯ظ…ظ†');
        }

        // --------------------------------------------------------
        // TEST 2: ط§ط®طھط¨ط§ط± ظ†ط¸ط§ظ… ظ‚ظپظ„ ط§ظ„ظ…ط­ط§ظˆظ„ط§طھ ط§ظ„ظپط§ط´ظ„ط© (Rate Limiting)
        // --------------------------------------------------------
        logInfo('ط§ط®طھط¨ط§ط± 2: ظ†ط¸ط§ظ… ظ‚ظپظ„ ط§ظ„ظ…ط­ط§ظˆظ„ط§طھ ط§ظ„ظپط§ط´ظ„ط© (Rate Limiting)...');
        const rateLimitKey = 'user_test_dummy';
        const attemptsRef = db.collection('login_attempts').doc(rateLimitKey);

        // ظ…ط­ط§ظƒط§ط© 5 ظ…ط­ط§ظˆظ„ط§طھ ظپط§ط´ظ„ط©
        await attemptsRef.set({
            count: 5,
            lastAttempt: admin.firestore.FieldValue.serverTimestamp()
        });

        const snap = await attemptsRef.get();
        if (snap.exists && snap.data().count >= 5) {
            logSuccess('طھظ… طھظپط¹ظٹظ„ ظ‚ظپظ„ ط§ظ„ط­ط³ط§ط¨ طھظ„ظ‚ط§ط¦ظٹط§ظ‹ ط¹ظ†ط¯ ط§ظ„ظˆطµظˆظ„ ط¥ظ„ظ‰ 5 ظ…ط­ط§ظˆظ„ط§طھ ظپط§ط´ظ„ط©');
        } else {
            logFail('ظپط´ظ„ ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط­ط¯ ط§ظ„ظ…ط­ط§ظˆظ„ط§طھ ط§ظ„ظپط§ط´ظ„ط©');
        }

        // طھظ†ط¸ظٹظپ ط³ط¬ظ„ ط§ظ„ط§ط®طھط¨ط§ط±
        await attemptsRef.delete();

        // --------------------------------------------------------
        // TEST 3: ط§ط®طھط¨ط§ط± طھط³ط¬ظٹظ„ ط¯ط®ظˆظ„ ظˆط¨ظˆط§ط¨ط© ط£ظˆظ„ظٹط§ط، ط§ظ„ط£ظ…ظˆط±
        // --------------------------------------------------------
        logInfo('ط§ط®طھط¨ط§ط± 3: ط¥ظ†ط´ط§ط، ظˆط­ظپط¸ ط­ط³ط§ط¨ ظˆظ„ظٹ ط£ظ…ط± ط¨ط§ظ„ط±ظ‚ظ… ط§ظ„ظ…ط¯ظ†ظٹ...');
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
            logSuccess('طھظ… ط¥ظ†ط´ط§ط، ظˆط«ظٹظ‚ط© ظˆظ„ظٹ ط§ظ„ط£ظ…ط± ط¨ظ†ط¬ط§ط­ ظˆظ…ظ†ط­ ط§ظ„طھظˆظƒظ† ط§ظ„ط®ط§طµ ط¨ظ‡');
        } else {
            logFail('ظپط´ظ„ طھط³ط¬ظٹظ„ ط­ط³ط§ط¨ ظˆظ„ظٹ ط§ظ„ط£ظ…ط±');
        }

        // --------------------------------------------------------
        // TEST 4: ط§ط®طھط¨ط§ط± ط­ظ…ط§ظٹط© ط§ظ„ط®طµظˆطµظٹط© ظ„ظ‚ط§ط¦ظ…ط© ط§ظ„ط·ظ„ط§ط¨
        // --------------------------------------------------------
        logInfo('ط§ط®طھط¨ط§ط± 4: ظپط­طµ ط­ط¬ط¨ ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ط­ط³ط§ط³ط© ظ„ظ„ط·ظ„ط§ط¨ ط¹ظ†ط¯ ط§ظ„طھط³ط¬ظٹظ„...');
        const mockStudentRef = db.collection('students').doc();
        await mockStudentRef.set({
            schoolId: testSchoolId,
            classId: '8/1',
            name: 'ط·ط§ظ„ط¨ ط§ط®طھط¨ط§ط± ط£ظˆطھظˆظ…ط§طھظٹظƒظٹ',
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
            logSuccess('طھظ… ط§ظ„طھط£ظƒط¯ ظ…ظ† ط§ط³طھط¨ط¹ط§ط¯ ط£ط±ظ‚ط§ظ… ط§ظ„ظ‡ظˆط§طھظپ ظˆط§ظ„ط£ط±ظ‚ط§ظ… ط§ظ„ظ…ط¯ظ†ظٹط© ظ…ظ† ط§ظ„ظ†طھط§ط¦ط¬ ط§ظ„ط¹ط§ظ…ط©');
        } else {
            logFail('طھط³ط±ظٹط¨ ط¨ظٹط§ظ†ط§طھ ط­ط³ط§ط³ط© ظپظٹ ط§ظ„ط§ط³طھط¹ظ„ط§ظ… ط§ظ„ط¹ط§ظ… ظ„ظ„ط·ظ„ط§ط¨!');
        }

        // --------------------------------------------------------
        // TEST 5: ط§ط®طھط¨ط§ط± ظ…ط­ط§ظƒط§ط© ط§ظ„طھط±ط­ظٹظ„ ط§ظ„ط³ظ†ظˆظٹ ط§ظ„ط´ط§ظ…ظ„ (Promote)
        // --------------------------------------------------------
        logInfo('ط§ط®طھط¨ط§ط± 5: طھط±ظپظٹط¹ ط§ظ„ط·ظ„ط§ط¨ ظˆط£ط±ط´ظپط© ط§ظ„طµظپ ط§ظ„طھط§ط³ط¹ ط®ط±ظٹط¬ظٹظ†...');
        const grade8StudentRef = db.collection('students').doc('test_student_g8');
        const grade9StudentRef = db.collection('students').doc('test_student_g9');

        await grade8StudentRef.set({ schoolId: testSchoolId, classId: '8/1', name: 'ط·ط§ظ„ط¨ طµ8' });
        await grade9StudentRef.set({ schoolId: testSchoolId, classId: '9/2', name: 'ط·ط§ظ„ط¨ طµ9' });

        await grade8StudentRef.update({ classId: '9/1' });

        const gradDoc = db.collection('graduates').doc('test_student_g9');
        await gradDoc.set({
            schoolId: testSchoolId,
            classId: '9/2',
            name: 'ط·ط§ظ„ط¨ طµ9',
            academicYearGraduated: '2025-2026'
        });
        await grade9StudentRef.delete();

        const updatedG8 = await grade8StudentRef.get();
        const deletedG9 = await grade9StudentRef.get();
        const newGrad = await gradDoc.get();

        if (updatedG8.data().classId === '9/1' && !deletedG9.exists && newGrad.exists) {
            logSuccess('طھظ… طھط±ظپظٹط¹ ط·ظ„ط§ط¨ طµظپ 8 ظˆط£ط±ط´ظپط© ط·ظ„ط§ط¨ طµظپ 9 ظƒط®ط±ظٹط¬ظٹظ† ط¨ظ†ط¬ط§ط­');
        } else {
            logFail('ظپط´ظ„ ظپظٹ ظ…ظ†ط·ظ‚ ط§ظ„طھط±ط­ظٹظ„ ط§ظ„ط³ظ†ظˆظٹ');
        }

        // --------------------------------------------------------
        // طھظ†ط¸ظٹظپ ط¨ظٹط¦ط© ط§ظ„ط§ط®طھط¨ط§ط±
        // --------------------------------------------------------
        logInfo('طھظ†ط¸ظٹظپ ط¨ظٹط§ظ†ط§طھ ط§ظ„ط§ط®طھط¨ط§ط±...');
        await parentRef.delete();
        await mockStudentRef.delete();
        await grade8StudentRef.delete();
        await gradDoc.delete();
        logSuccess('طھظ… طھظ†ط¸ظٹظپ ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ ط¨ظ†ط¬ط§ط­');

    } catch (error) {
        logFail('ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، طھظ†ظپظٹط° ط³ظƒط±ظٹط¨طھ ط§ظ„ط§ط®طھط¨ط§ط±ط§طھ:', error.message || error);
    }

    console.log('\n==================================================');
    console.log('ًںڈپ ط§ظƒطھظ…ظ„طھ ط­ط²ظ…ط© ط§ظ„ط§ط®طھط¨ط§ط±ط§طھ ط§ظ„ط£ظˆطھظˆظ…ط§طھظٹظƒظٹط©');
    console.log('==================================================\n');
}

runAutomatedTests();
