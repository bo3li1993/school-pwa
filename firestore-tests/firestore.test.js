const { initializeTestEnvironment, assertFails, assertSucceeds } = require("@firebase/rules-unit-testing");
const { doc, getDoc, setDoc, updateDoc, addDoc, collection } = require("firebase/firestore");
const fs = require("fs");

let testEnv;

beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
        projectId: "hosainan-school",
        firestore: {
            rules: fs.readFileSync("../firestore.rules", "utf8"),
            host: "localhost",
            port: 8080
        }
    });
});

afterAll(async () => {
    await testEnv.cleanup();
});

// ════════════════════════════════════════════════════════════════
// إعداد البيانات
// ════════════════════════════════════════════════════════════════
async function setupData() {
    await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        // مدير مدرسة A
        await setDoc(doc(db, "users", "admin-a"), { schoolId: "school-a", role: "admin", name: "مدير أ" });
        // معلم مدرسة A
        await setDoc(doc(db, "users", "teacher-a"), { schoolId: "school-a", role: "teacher", name: "معلم أ" });
        // مدير مدرسة B
        await setDoc(doc(db, "users", "admin-b"), { schoolId: "school-b", role: "admin", name: "مدير ب" });
        // ولي أمر مدرسة A
        await setDoc(doc(db, "users", "parent-a"), { schoolId: "school-a", role: "parent", childIds: ["STU-001"] });
        // طالب مدرسة A
        await setDoc(doc(db, "students", "student-a1"), { schoolId: "school-a", name: "طالب 1", studentId: "STU-001" });
        // طالب مدرسة B
        await setDoc(doc(db, "students", "student-b1"), { schoolId: "school-b", name: "طالب ب", studentId: "STU-B01" });
        // سجل غياب مدرسة A
        await setDoc(doc(db, "attendance", "att-a1"), { schoolId: "school-a", studentId: "STU-001", studentName: "طالب 1", date: "2026-08-01", status: "absent" });
        // graduate مدرسة A
        await setDoc(doc(db, "graduates", "grad-a1"), { schoolId: "school-a", name: "خريج 1" });
        // graduate مدرسة B
        await setDoc(doc(db, "graduates", "grad-b1"), { schoolId: "school-b", name: "خريج ب" });
    });
}

beforeEach(async () => {
    await testEnv.clearFirestore();
    await setupData();
});

// ════════════════════════════════════════════════════════════════
// 1. اختبارات العزل بين المدارس
// ════════════════════════════════════════════════════════════════
describe("عزل البيانات بين المدارس", () => {

    test("مدير A لا يقرأ طلاب مدرسة B", async () => {
        const db = testEnv.authenticatedContext("admin-a").firestore();
        await assertFails(getDoc(doc(db, "students", "student-b1")));
    });

    test("مدير A يقرأ طلاب مدرسته", async () => {
        const db = testEnv.authenticatedContext("admin-a").firestore();
        await assertSucceeds(getDoc(doc(db, "students", "student-a1")));
    });

    test("مدير A لا يقرأ خريجي مدرسة B", async () => {
        const db = testEnv.authenticatedContext("admin-a").firestore();
        await assertFails(getDoc(doc(db, "graduates", "grad-b1")));
    });

    test("مدير A يقرأ خريجي مدرسته", async () => {
        const db = testEnv.authenticatedContext("admin-a").firestore();
        await assertSucceeds(getDoc(doc(db, "graduates", "grad-a1")));
    });

});

// ════════════════════════════════════════════════════════════════
// 2. اختبارات ولي الأمر
// ════════════════════════════════════════════════════════════════
describe("صلاحيات ولي الأمر", () => {

    test("ولي الأمر يقرأ بيانات ابنه المسجل", async () => {
        const db = testEnv.authenticatedContext("parent-a").firestore();
        await assertSucceeds(getDoc(doc(db, "students", "student-a1")));
    });

    test("ولي الأمر لا يقرأ طالب ليس ابنه", async () => {
        const db = testEnv.authenticatedContext("parent-a").firestore();
        // طالب في نفس المدرسة لكن ليس في childIds
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), "students", "other-student"), { schoolId: "school-a", studentId: "STU-999" });
        });
        await assertFails(getDoc(doc(db, "students", "other-student")));
    });

    test("ولي الأمر لا يضيف طلاب", async () => {
        const db = testEnv.authenticatedContext("parent-a").firestore();
        await assertFails(addDoc(collection(db, "students"), { schoolId: "school-a", name: "طالب مزيف" }));
    });

    test("ولي الأمر يقرأ غياب ابنه", async () => {
        const db = testEnv.authenticatedContext("parent-a").firestore();
        await assertSucceeds(getDoc(doc(db, "attendance", "att-a1")));
    });

});

// ════════════════════════════════════════════════════════════════
// 3. اختبارات رفع الصلاحيات (Critical!)
// ════════════════════════════════════════════════════════════════
describe("منع رفع الصلاحيات", () => {

    test("مدير لا يستطيع تغيير دوره لـ superadmin", async () => {
        const db = testEnv.authenticatedContext("admin-a").firestore();
        await assertFails(updateDoc(doc(db, "users", "admin-a"), { role: "superadmin" }));
    });

    test("مدير لا يستطيع تغيير schoolId", async () => {
        const db = testEnv.authenticatedContext("admin-a").firestore();
        await assertFails(updateDoc(doc(db, "users", "teacher-a"), { schoolId: "school-b" }));
    });

    test("مستخدم بدون مصادقة لا يقرأ أي بيانات", async () => {
        const db = testEnv.unauthenticatedContext().firestore();
        await assertFails(getDoc(doc(db, "students", "student-a1")));
        await assertFails(getDoc(doc(db, "users", "admin-a")));
    });

    test("مدير A لا يكتب في audit_log مدرسة B", async () => {
        const db = testEnv.authenticatedContext("admin-a").firestore();
        await assertFails(addDoc(collection(db, "audit_log"), {
            schoolId: "school-b",
            action: "fake_action",
            performedBy: "hacker"
        }));
    });

});

// ════════════════════════════════════════════════════════════════
// 4. اختبارات النسخ الاحتياطي
// ════════════════════════════════════════════════════════════════
describe("النسخ الاحتياطية", () => {

    test("مدير A لا يقرأ نسخ مدرسة B", async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), "backups", "backup-b"), { schoolId: "school-b" });
        });
        const db = testEnv.authenticatedContext("admin-a").firestore();
        await assertFails(getDoc(doc(db, "backups", "backup-b")));
    });

    test("ولي الأمر لا يقرأ النسخ الاحتياطية", async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), "backups", "backup-a"), { schoolId: "school-a" });
        });
        const db = testEnv.authenticatedContext("parent-a").firestore();
        await assertFails(getDoc(doc(db, "backups", "backup-a")));
    });

});
