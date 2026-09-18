ï»¿const { initializeTestEnvironment, assertFails, assertSucceeds } = require("@firebase/rules-unit-testing");
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Ø¥Ø¹Ø¯Ø§Ø¯ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
async function setupData() {
    await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        // Ù…Ø¯ÙŠØ± Ù…Ø¯Ø±Ø³Ø© A
        await setDoc(doc(db, "users", "admin-a"), { schoolId: "school-a", role: "admin", name: "Ù…Ø¯ÙŠØ± Ø£" });
        // Ù…Ø¹Ù„Ù… Ù…Ø¯Ø±Ø³Ø© A
        await setDoc(doc(db, "users", "teacher-a"), { schoolId: "school-a", role: "teacher", name: "Ù…Ø¹Ù„Ù… Ø£" });
        // Ù…Ø¯ÙŠØ± Ù…Ø¯Ø±Ø³Ø© B
        await setDoc(doc(db, "users", "admin-b"), { schoolId: "school-b", role: "admin", name: "Ù…Ø¯ÙŠØ± Ø¨" });
        // ÙˆÙ„ÙŠ Ø£Ù…Ø± Ù…Ø¯Ø±Ø³Ø© A
        await setDoc(doc(db, "users", "parent-a"), { schoolId: "school-a", role: "parent", childIds: ["STU-001"] });
        // Ø·Ø§Ù„Ø¨ Ù…Ø¯Ø±Ø³Ø© A
        await setDoc(doc(db, "students", "student-a1"), { schoolId: "school-a", name: "Ø·Ø§Ù„Ø¨ 1", studentId: "STU-001" });
        // Ø·Ø§Ù„Ø¨ Ù…Ø¯Ø±Ø³Ø© B
        await setDoc(doc(db, "students", "student-b1"), { schoolId: "school-b", name: "Ø·Ø§Ù„Ø¨ Ø¨", studentId: "STU-B01" });
        // Ø³Ø¬Ù„ ØºÙŠØ§Ø¨ Ù…Ø¯Ø±Ø³Ø© A
        await setDoc(doc(db, "attendance", "att-a1"), { schoolId: "school-a", studentId: "STU-001", studentName: "Ø·Ø§Ù„Ø¨ 1", date: "2026-08-01", status: "absent" });
        // graduate Ù…Ø¯Ø±Ø³Ø© A
        await setDoc(doc(db, "graduates", "grad-a1"), { schoolId: "school-a", name: "Ø®Ø±ÙŠØ¬ 1" });
        // graduate Ù…Ø¯Ø±Ø³Ø© B
        await setDoc(doc(db, "graduates", "grad-b1"), { schoolId: "school-b", name: "Ø®Ø±ÙŠØ¬ Ø¨" });
    });
}

beforeEach(async () => {
    await testEnv.clearFirestore();
    await setupData();
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 1. Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª Ø§Ù„Ø¹Ø²Ù„ Ø¨ÙŠÙ† Ø§Ù„Ù…Ø¯Ø§Ø±Ø³
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
describe("Ø¹Ø²Ù„ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø¨ÙŠÙ† Ø§Ù„Ù…Ø¯Ø§Ø±Ø³", () => {

    test("Ù…Ø¯ÙŠØ± A Ù„Ø§ ÙŠÙ‚Ø±Ø£ Ø·Ù„Ø§Ø¨ Ù…Ø¯Ø±Ø³Ø© B", async () => {
        const db = testEnv.authenticatedContext("admin-a").firestore();
        await assertFails(getDoc(doc(db, "students", "student-b1")));
    });

    test("Ù…Ø¯ÙŠØ± A ÙŠÙ‚Ø±Ø£ Ø·Ù„Ø§Ø¨ Ù…Ø¯Ø±Ø³ØªÙ‡", async () => {
        const db = testEnv.authenticatedContext("admin-a").firestore();
        await assertSucceeds(getDoc(doc(db, "students", "student-a1")));
    });

    test("Ù…Ø¯ÙŠØ± A Ù„Ø§ ÙŠÙ‚Ø±Ø£ Ø®Ø±ÙŠØ¬ÙŠ Ù…Ø¯Ø±Ø³Ø© B", async () => {
        const db = testEnv.authenticatedContext("admin-a").firestore();
        await assertFails(getDoc(doc(db, "graduates", "grad-b1")));
    });

    test("Ù…Ø¯ÙŠØ± A ÙŠÙ‚Ø±Ø£ Ø®Ø±ÙŠØ¬ÙŠ Ù…Ø¯Ø±Ø³ØªÙ‡", async () => {
        const db = testEnv.authenticatedContext("admin-a").firestore();
        await assertSucceeds(getDoc(doc(db, "graduates", "grad-a1")));
    });

});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 2. Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø±
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
describe("ØµÙ„Ø§Ø­ÙŠØ§Øª ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø±", () => {

    test("ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø± ÙŠÙ‚Ø±Ø£ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ø¨Ù†Ù‡ Ø§Ù„Ù…Ø³Ø¬Ù„", async () => {
        const db = testEnv.authenticatedContext("parent-a").firestore();
        await assertSucceeds(getDoc(doc(db, "students", "student-a1")));
    });

    test("ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø± Ù„Ø§ ÙŠÙ‚Ø±Ø£ Ø·Ø§Ù„Ø¨ Ù„ÙŠØ³ Ø§Ø¨Ù†Ù‡", async () => {
        const db = testEnv.authenticatedContext("parent-a").firestore();
        // Ø·Ø§Ù„Ø¨ ÙÙŠ Ù†ÙØ³ Ø§Ù„Ù…Ø¯Ø±Ø³Ø© Ù„ÙƒÙ† Ù„ÙŠØ³ ÙÙŠ childIds
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), "students", "other-student"), { schoolId: "school-a", studentId: "STU-999" });
        });
        await assertFails(getDoc(doc(db, "students", "other-student")));
    });

    test("ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø± Ù„Ø§ ÙŠØ¶ÙŠÙ Ø·Ù„Ø§Ø¨", async () => {
        const db = testEnv.authenticatedContext("parent-a").firestore();
        await assertFails(addDoc(collection(db, "students"), { schoolId: "school-a", name: "Ø·Ø§Ù„Ø¨ Ù…Ø²ÙŠÙ" }));
    });

    test("ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø± ÙŠÙ‚Ø±Ø£ ØºÙŠØ§Ø¨ Ø§Ø¨Ù†Ù‡", async () => {
        const db = testEnv.authenticatedContext("parent-a").firestore();
        await assertSucceeds(getDoc(doc(db, "attendance", "att-a1")));
    });

});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 3. Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª Ø±ÙØ¹ Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ§Øª (Critical!)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
describe("Ù…Ù†Ø¹ Ø±ÙØ¹ Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ§Øª", () => {

    test("Ù…Ø¯ÙŠØ± Ù„Ø§ ÙŠØ³ØªØ·ÙŠØ¹ ØªØºÙŠÙŠØ± Ø¯ÙˆØ±Ù‡ Ù„Ù€ superadmin", async () => {
        const db = testEnv.authenticatedContext("admin-a").firestore();
        await assertFails(updateDoc(doc(db, "users", "admin-a"), { role: "superadmin" }));
    });

    test("Ù…Ø¯ÙŠØ± Ù„Ø§ ÙŠØ³ØªØ·ÙŠØ¹ ØªØºÙŠÙŠØ± schoolId", async () => {
        const db = testEnv.authenticatedContext("admin-a").firestore();
        await assertFails(updateDoc(doc(db, "users", "teacher-a"), { schoolId: "school-b" }));
    });

    test("Ù…Ø³ØªØ®Ø¯Ù… Ø¨Ø¯ÙˆÙ† Ù…ØµØ§Ø¯Ù‚Ø© Ù„Ø§ ÙŠÙ‚Ø±Ø£ Ø£ÙŠ Ø¨ÙŠØ§Ù†Ø§Øª", async () => {
        const db = testEnv.unauthenticatedContext().firestore();
        await assertFails(getDoc(doc(db, "students", "student-a1")));
        await assertFails(getDoc(doc(db, "users", "admin-a")));
    });

    test("Ù…Ø¯ÙŠØ± A Ù„Ø§ ÙŠÙƒØªØ¨ ÙÙŠ audit_log Ù…Ø¯Ø±Ø³Ø© B", async () => {
        const db = testEnv.authenticatedContext("admin-a").firestore();
        await assertFails(addDoc(collection(db, "audit_log"), {
            schoolId: "school-b",
            action: "fake_action",
            performedBy: "hacker"
        }));
    });

});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 4. Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª Ø§Ù„Ù†Ø³Ø® Ø§Ù„Ø§Ø­ØªÙŠØ§Ø·ÙŠ
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
describe("Ø§Ù„Ù†Ø³Ø® Ø§Ù„Ø§Ø­ØªÙŠØ§Ø·ÙŠØ©", () => {

    test("Ù…Ø¯ÙŠØ± A Ù„Ø§ ÙŠÙ‚Ø±Ø£ Ù†Ø³Ø® Ù…Ø¯Ø±Ø³Ø© B", async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), "backups", "backup-b"), { schoolId: "school-b" });
        });
        const db = testEnv.authenticatedContext("admin-a").firestore();
        await assertFails(getDoc(doc(db, "backups", "backup-b")));
    });

    test("ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø± Ù„Ø§ ÙŠÙ‚Ø±Ø£ Ø§Ù„Ù†Ø³Ø® Ø§Ù„Ø§Ø­ØªÙŠØ§Ø·ÙŠØ©", async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), "backups", "backup-a"), { schoolId: "school-a" });
        });
        const db = testEnv.authenticatedContext("parent-a").firestore();
        await assertFails(getDoc(doc(db, "backups", "backup-a")));
    });

});
