const { initializeTestEnvironment, assertFails, assertSucceeds } = require("@firebase/rules-unit-testing");
const { doc, getDoc, setDoc, collection, addDoc } = require("firebase/firestore");

let testEnv;

beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
        projectId: "hosainan-school",
        firestore: {
            rules: require("fs").readFileSync("../firestore.rules", "utf8"),
            host: "localhost",
            port: 8080
        }
    });
});

afterAll(async () => {
    await testEnv.cleanup();
});

// ════════════════════════════════════════════════════════════════
// اختبارات Firestore Rules
// ════════════════════════════════════════════════════════════════

describe("Firestore Security Rules", () => {

    // اختبار 1: منع الوصول بدون مصادقة
    test("منع قراءة الطلاب بدون تسجيل دخول", async () => {
        const unauthedDb = testEnv.unauthenticatedContext().firestore();
        await assertFails(
            getDoc(doc(unauthedDb, "students", "test-student"))
        );
    });

    // اختبار 2: السماح للمدير بقراءة طلاب مدرسته
    test("السماح للمدير بقراءة طلاب مدرسته", async () => {
        const adminDb = testEnv.authenticatedContext("admin-uid", {
            schoolId: "school-a",
            role: "admin"
        }).firestore();

        await testEnv.withSecurityRulesDisabled(async (context) => {
            await setDoc(doc(context.firestore(), "users", "admin-uid"), {
                schoolId: "school-a",
                role: "admin"
            });
            await setDoc(doc(context.firestore(), "students", "student-1"), {
                schoolId: "school-a",
                name: "طالب اختبار"
            });
        });

        await assertSucceeds(
            getDoc(doc(adminDb, "students", "student-1"))
        );
    });

    // اختبار 3: منع المدير من قراءة طلاب مدرسة أخرى
    test("منع المدير من قراءة طلاب مدرسة أخرى", async () => {
        const adminDb = testEnv.authenticatedContext("admin-uid", {
            schoolId: "school-a",
            role: "admin"
        }).firestore();

        await testEnv.withSecurityRulesDisabled(async (context) => {
            await setDoc(doc(context.firestore(), "students", "student-other"), {
                schoolId: "school-b",
                name: "طالب مدرسة أخرى"
            });
        });

        await assertFails(
            getDoc(doc(adminDb, "students", "student-other"))
        );
    });

    // اختبار 4: ولي الأمر يقرأ بيانات ابنه فقط
    test("ولي الأمر يقرأ بيانات مدرسته فقط", async () => {
        const parentDb = testEnv.authenticatedContext("parent-uid", {
            schoolId: "school-a",
            role: "parent"
        }).firestore();

        await assertSucceeds(
            getDoc(doc(parentDb, "students", "student-1"))
        );
    });

    // اختبار 5: منع ولي الأمر من الكتابة
    test("منع ولي الأمر من إضافة طلاب", async () => {
        const parentDb = testEnv.authenticatedContext("parent-uid", {
            schoolId: "school-a",
            role: "parent"
        }).firestore();

        await assertFails(
            addDoc(collection(parentDb, "students"), {
                schoolId: "school-a",
                name: "طالب مزيف"
            })
        );
    });
});
