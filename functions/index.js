"use strict"; const { onCall, HttpsError } = require("firebase-functions/v2/https"); const { onSchedule } = require("firebase-functions/v2/scheduler"); const admin = require("firebase-admin"); const argon2 = require("argon2"); admin.initializeApp(); const db = admin.firestore(); const CORS = [/bo3li1993\.github\.io$/, /localhost/]; const REGION = "me-central1"; const MAX_ATTEMPTS = 5; const LOCKOUT_MINUTES = 15; async function hashPassword(p) { return argon2.hash(p, { type: argon2.argon2id, memoryCost: 32768, timeCost: 3, parallelism: 1 }); } async function verifyPassword(h, p) { try { return await argon2.verify(h, p); } catch(e) { return false; } } async function requireAuth(req, roles) { if (!req.auth || !req.auth.uid) throw new HttpsError("unauthenticated", "يجب تسجيل الدخول"); if (req.auth.uid === "superadmin") { const sid = req.data?.schoolId || "system"; if (roles && !roles.includes("superadmin")) throw new HttpsError("permission-denied", "لا صلاحيات"); return { role: "superadmin", schoolId: sid, name: "Super Admin" }; } const u = await db.collection("users").doc(req.auth.uid).get(); if (!u.exists) throw new HttpsError("not-found", "المستخدم غير موجود"); const d = u.data(); if (roles && !roles.includes(d.role)) throw new HttpsError("permission-denied", "لا صلاحيات"); return d; } async function logAudit(s,a,p,d) { try { await db.collection("audit_log").add({schoolId:s,action:a,performedBy:p,details:d||"",createdAt:admin.firestore.FieldValue.serverTimestamp()}); } catch(e){} } async function checkRL(uid) { const r = db.collection("login_attempts").doc("user_"+uid); const s = await r.get(); if(s.exists){const d=s.data();const m=(Date.now()-(d.lastAttempt?.toMillis?.()||0))/60000;if(d.count>=MAX_ATTEMPTS&&m<LOCKOUT_MINUTES)return{locked:true,remaining:Math.ceil(LOCKOUT_MINUTES-m)};} return{locked:false}; } async function recFail(uid) { const r=db.collection("login_attempts").doc("user_"+uid);const s=await r.get();await r.set({count:s.exists?(s.data().count||0)+1:1,lastAttempt:admin.firestore.FieldValue.serverTimestamp()}); } async function resetRL(uid) { await db.collection("login_attempts").doc("user_"+uid).delete().catch(()=>{}); }

exports.loginUser = onCall({ cors: CORS, region: REGION }, async (req) => {
    const { schoolId, userId, password } = req.data;
    if (!userId || !password) throw new HttpsError("invalid-argument", "userId و password مطلوبان");
    const rl = await checkRL(userId);
    if (rl.locked) throw new HttpsError("resource-exhausted", `انتظر ${rl.remaining} دقيقة`);
    if (userId === "superadmin") {
        const SH = process.env.SUPER_ADMIN_HASH || "";
        if (!SH) throw new HttpsError("internal", "خطا في الاعدادات");
        const v = await verifyPassword(SH, password);
        if (!v) { await recFail(userId); throw new HttpsError("unauthenticated", "كلمة المرور غير صحيحة"); }
        await resetRL(userId);
        const token = await admin.auth().createCustomToken("superadmin", { role: "superadmin", schoolId: "system" });
        return { token, role: "superadmin", schoolId: "system", name: "Super Admin", userId: "superadmin" };
    }
    let q = db.collection("users").where("userId", "==", userId);
    if (schoolId) q = q.where("schoolId", "==", schoolId);
    const snap = await q.limit(1).get();
    if (snap.empty) { await recFail(userId); throw new HttpsError("not-found", "المستخدم غير موجود"); }
    const user = snap.docs[0].data();
    const docId = snap.docs[0].id;
    let v = false;
    if (!user.passHash) { await recFail(userId); throw new HttpsError("unauthenticated", "كلمة المرور غير صحيحة"); }
    if (user.passHash.startsWith("$argon2")) {
      v = await verifyPassword(user.passHash, password);
    } else {
      const crypto = require("crypto");
      const sha = crypto.createHash("sha256").update(password).digest("hex");
      if (sha === user.passHash) {
        v = true;
        try { await db.collection("users").doc(docId).update({ passHash: await hashPassword(password) }); } catch(e){}
      }
    }
    if (!v) { await recFail(userId); throw new HttpsError("unauthenticated", "كلمة المرور غير صحيحة"); }
    if (user.status === "suspended") throw new HttpsError("permission-denied", "الحساب موقوف");
    await resetRL(userId);
    const schoolSnap = await db.collection("schools").doc(user.schoolId).get();
    const sd = schoolSnap.exists ? schoolSnap.data() : {};
    const token = await admin.auth().createCustomToken(docId, { role: user.role, schoolId: user.schoolId, userId: user.userId });
    return { token, role: user.role, schoolId: user.schoolId, userId: user.userId, name: user.name||"", schoolName: sd.name||"", email: user.email||"", phone: user.phone||"", department: user.department||"", classId: user.classId||"" };
});

exports.createUser = onCall({ cors: CORS, region: REGION }, async (req) => {
    const au = await requireAuth(req, ["admin", "assistant_manager", "superadmin"]);
    const sid = au.role === "superadmin" ? req.data.schoolId : au.schoolId;
    const { userId, name, password, role, email, phone, department, classId } = req.data;
    if (!userId || !name || !password || !role || !sid) throw new HttpsError("invalid-argument", "جميع الحقول مطلوبة");
    if (role === "superadmin") throw new HttpsError("permission-denied", "لا يمكن انشاء superadmin");
    if (password.length < 8) throw new HttpsError("invalid-argument", "كلمة المرور قصيرة");
    const ex = await db.collection("users").where("userId","==",userId).where("schoolId","==",sid).limit(1).get();
    if (!ex.empty) throw new HttpsError("already-exists", "المستخدم موجود");
    const passHash = await hashPassword(password);
    await db.collection("users").add({ schoolId:sid, userId, name, passHash, role, email:email||"", phone:phone||"", department:department||"", classId:classId||"", status:"active", createdAt:admin.firestore.FieldValue.serverTimestamp() });
    await logAudit(sid, "create_user", au.name, `userId: ${userId}`);
    return { success: true };
});

exports.resetUserPassword = onCall({ cors: CORS, region: REGION }, async (req) => {
    const au = await requireAuth(req, ["admin", "assistant_manager", "superadmin"]);
    const sid = au.role === "superadmin" ? req.data.schoolId : au.schoolId;
    const { targetUserId, userDocId, newPassword } = req.data;
    if (!newPassword || newPassword.length < 8) throw new HttpsError("invalid-argument", "كلمة المرور قصيرة");
    let docId = userDocId;
    if (!docId && targetUserId) {
        const s = await db.collection("users").where("userId","==",targetUserId).where("schoolId","==",sid).limit(1).get();
        if (s.empty) throw new HttpsError("not-found", "المستخدم غير موجود");
        docId = s.docs[0].id;
    }
    if (!docId) throw new HttpsError("invalid-argument", "يجب تحديد المستخدم");
    const passHash = await hashPassword(newPassword);
    await db.collection("users").doc(docId).update({ passHash, passwordResetRequired: true, resetAt: admin.firestore.FieldValue.serverTimestamp() });
    await logAudit(sid, "reset_password", au.name, `docId: ${docId}`);
    return { success: true, message: "تم تحديث كلمة المرور" };
});

exports.registerParent = onCall({ cors: CORS, region: REGION }, async (req) => {
    const { schoolId, civilId, phone, password, studentName } = req.data;
    if (!schoolId || !civilId || !phone || !password || password.length < 8) throw new HttpsError("invalid-argument", "جميع الحقول مطلوبة");
    const ex = await db.collection("users").where("schoolId","==",schoolId).where("civilId","==",civilId).where("role","==","parent").limit(1).get();
    if (!ex.empty) throw new HttpsError("already-exists", "الحساب موجود");
    const ss = await db.collection("students").where("schoolId","==",schoolId).where("name","==",studentName).limit(1).get();
    if (ss.empty) throw new HttpsError("not-found", "الطالب غير موجود");
    const st = ss.docs[0].data();
    const passHash = await hashPassword(password);
    await db.collection("users").add({ schoolId, userId:"P-"+civilId, civilId, phone, passHash, role:"parent", studentName, studentId:st.studentId||ss.docs[0].id, childIds:[st.studentId||ss.docs[0].id], classId:st.classId||"", status:"active", createdAt:admin.firestore.FieldValue.serverTimestamp() });
    return { success: true, userId:"P-"+civilId };
});

exports.loginParent = onCall({ cors: CORS, region: REGION }, async (req) => {
    const { schoolId, civilId, password } = req.data;
    if (!schoolId || !civilId || !password) throw new HttpsError("invalid-argument", "جميع الحقول مطلوبة");
    const rl = await checkRL("parent_"+civilId);
    if (rl.locked) throw new HttpsError("resource-exhausted", `انتظر ${rl.remaining} دقيقة`);
    const snap = await db.collection("users").where("schoolId","==",schoolId).where("civilId","==",civilId).where("role","==","parent").limit(1).get();
    if (snap.empty) { await recFail("parent_"+civilId); throw new HttpsError("not-found", "الحساب غير موجود"); }
    const user = snap.docs[0].data();
    const v = await verifyPassword(user.passHash, password);
    if (!v) { await recFail("parent_"+civilId); throw new HttpsError("unauthenticated", "كلمة المرور غير صحيحة"); }
    await resetRL("parent_"+civilId);
    const token = await admin.auth().createCustomToken(snap.docs[0].id, { role:"parent", schoolId:user.schoolId, userId:user.userId });
    const sd = await db.collection("schools").doc(user.schoolId).get();
    return { token, role:"parent", schoolId:user.schoolId, userId:user.userId, studentName:user.studentName||"", studentId:user.studentId||"", classId:user.classId||"", schoolName:sd.exists?sd.data().name:"" };
});

exports.getRegistrationClasses = onCall({ cors: CORS, region: REGION }, async (req) => {
    const { schoolId } = req.data;
    if (!schoolId) throw new HttpsError("invalid-argument", "schoolId مطلوب");
    const snap = await db.collection("students").where("schoolId","==",schoolId).get();
    const cls = {};
    snap.forEach(d => { const c=d.data().classId; if(c) cls[c]=1; });
    return { classes: Object.keys(cls).sort() };
});

exports.getRegistrationStudents = onCall({ cors: CORS, region: REGION }, async (req) => {
    const { schoolId, classId } = req.data;
    if (!schoolId) throw new HttpsError("invalid-argument", "schoolId مطلوب");
    let q = db.collection("students").where("schoolId","==",schoolId);
    if (classId) q = q.where("classId","==",classId);
    const snap = await q.get();
    const students = [];
    snap.forEach(d => { const data=d.data(); students.push({name:data.name,classId:data.classId,studentId:data.studentId||d.id}); });
    return { students };
});

exports.addStudentIds = onCall({ cors: CORS, region: REGION }, async (req) => {
    if (!req.auth || req.auth.uid !== "superadmin") throw new HttpsError("permission-denied", "Super Admin فقط");
    const snap = await db.collection("students").get();
    let updated = 0;
    const batch = db.batch();
    snap.docs.filter(d => !d.data().studentId).forEach(d => { batch.update(d.ref, { studentId:"STU-"+d.id.substring(0,8).toUpperCase() }); updated++; });
    if (updated > 0) await batch.commit();
    return { success: true, updated };
});

exports.migrateAllPasswords = onCall({ cors: CORS, region: REGION }, async (req) => {
    if (!req.auth || req.auth.uid !== "superadmin") throw new HttpsError("permission-denied", "Super Admin فقط");
    const snap = await db.collection("users").get();
    let migrated = 0;
    for (const doc of snap.docs) {
        const data = doc.data();
        if (data.passHash && data.passHash.startsWith("$argon2")) continue;
        if (data.plainPass) { try { await doc.ref.update({ passHash: await hashPassword(data.plainPass), plainPass: admin.firestore.FieldValue.delete() }); migrated++; } catch(e){} }
    }
    return { success: true, migrated };
});

exports.createBackup = onCall({ cors: CORS, region: REGION }, async (req) => {
    const au = await requireAuth(req, ["admin", "superadmin"]);
    const sid = au.role === "superadmin" ? req.data.schoolId : au.schoolId;
    const cols = ["students","users","attendance","behavior","warnings","classes","departments"];
    const summary = {};
    for (const c of cols) { const s = await db.collection(c).where("schoolId","==",sid).get(); summary[c]=s.size; }
    const ref = await db.collection("backups").add({ schoolId:sid, summary, createdBy:au.name, createdAt:admin.firestore.FieldValue.serverTimestamp() });
    return { success:true, backupId:ref.id };
});

exports.getAuditLog = onCall({ cors: CORS, region: REGION }, async (req) => {
    const au = await requireAuth(req, ["admin","assistant_manager","superadmin"]);
    const lim = Math.min(req.data?.limit||50, 200);
    const snap = await db.collection("audit_log").where("schoolId","==",au.schoolId).orderBy("createdAt","desc").limit(lim).get();
    return { logs: snap.docs.map(d => ({ id:d.id, action:d.data().action, performedBy:d.data().performedBy, details:d.data().details||"", createdAt:d.data().createdAt?.toDate?.()?.toISOString()||null })) };
});

exports.generateReportNow = onCall({ cors: CORS, region: REGION }, async (req) => {
    const au = await requireAuth(req, ["admin","assistant_manager","superadmin"]);
    const sid = au.role==="superadmin" ? req.data.schoolId : au.schoolId;
    const { fromDate, toDate } = req.data;
    if (!sid||!fromDate||!toDate) throw new HttpsError("invalid-argument", "جميع الحقول مطلوبة");
    const [a,b,c] = await Promise.all([
        db.collection("attendance").where("schoolId","==",sid).where("status","==","absent").where("date",">=",fromDate).where("date","<=",toDate).get(),
        db.collection("behavior").where("schoolId","==",sid).where("date",">=",fromDate).where("date","<=",toDate).get(),
        db.collection("warnings").where("schoolId","==",sid).where("date",">=",fromDate).where("date","<=",toDate).get()
    ]);
    return { absences:a.size, behavior:b.size, warnings:c.size };
});

exports.scheduledDailyBackup = onSchedule({ schedule:"0 2 * * *", region:REGION, timeZone:"Asia/Kuwait" }, async () => {
    const snap = await db.collection("schools").get();
    for (const s of snap.docs) { try { await db.collection("backups").add({ schoolId:s.id, type:"scheduled", createdAt:admin.firestore.FieldValue.serverTimestamp() }); } catch(e){} }
    return null;
});
