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
        const token = await admin.auth().createCustomToken("superadmin", { role: "superadmin", schoolId: "system", superadmin: true });
        return { token, role: "superadmin", schoolId: "system", name: "Super Admin", userId: "superadmin" };
    }
    if (!schoolId) throw new HttpsError("invalid-argument", "schoolId مطلوب");
    let q = db.collection("users").where("userId", "==", userId).where("schoolId", "==", schoolId);
    const snap = await q.limit(1).get();
    if (snap.empty) { await recFail(userId); throw new HttpsError("not-found", "المستخدم غير موجود"); }
    const user = snap.docs[0].data();

    const docId = snap.docs[0].id;
    if (!user.passHash) { await recFail(userId); throw new HttpsError("unauthenticated", "كلمة المرور غير صحيحة"); }
    const v = await verifyPassword(user.passHash, password);
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
    const ROLE_RANK = { superadmin:99, admin:3, assistant_manager:2, teacher:1, parent:0 }; if ((ROLE_RANK[role]||0) >= (ROLE_RANK[au.role]||0) && au.role !== "superadmin") throw new HttpsError("permission-denied", "لا يمكنك إنشاء دور أعلى أو مساوٍ لدورك");
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
    const { targetUserId, newPassword } = req.data;
    if (!newPassword || newPassword.length < 8) throw new HttpsError("invalid-argument", "كلمة المرور قصيرة");
    if (!targetUserId) throw new HttpsError("invalid-argument", "يجب تحديد المستخدم");
    const s = await db.collection("users").where("userId","==",targetUserId).where("schoolId","==",sid).limit(1).get();
    if (s.empty) throw new HttpsError("not-found", "المستخدم غير موجود");
    const targetDoc = s.docs[0]; const targetRole = targetDoc.data().role;
    const ROLE_RANK2 = { superadmin:99, admin:3, assistant_manager:2, teacher:1, parent:0 }; if ((ROLE_RANK2[targetRole]||0) >= (ROLE_RANK2[au.role]||0) && au.role !== "superadmin") throw new HttpsError("permission-denied", "لا يمكنك إعادة تعيين كلمة مرور هذا الدور");
    const docId = targetDoc.id;
    if (!docId) throw new HttpsError("not-found", "المستخدم غير موجود");
    const passHash = await hashPassword(newPassword);
    await db.collection("users").doc(docId).update({ passHash, passwordResetRequired: true, resetAt: admin.firestore.FieldValue.serverTimestamp() });
    await logAudit(sid, "reset_password", au.name, `userId: ${targetUserId}`);
    return { success: true, message: "تم تحديث كلمة المرور" };
});


exports.registerParent = onCall({ cors: CORS, region: REGION }, async (req) => {
    const { schoolId, civilId, phone, password, studentName, studentCivilId } = req.data;
    if (!schoolId || !civilId || !phone || !password || !studentName || password.length < 8) throw new HttpsError("invalid-argument", "جميع الحقول مطلوبة");
    const ex = await db.collection("users").where("schoolId","==",schoolId).where("civilId","==",civilId).where("role","==","parent").limit(1).get();
    if (!ex.empty) throw new HttpsError("already-exists", "الحساب موجود");
    let ssq = db.collection("students").where("schoolId","==",schoolId).where("name","==",studentName);
    if (studentCivilId) ssq = ssq.where("civilId","==",studentCivilId);
    const ss = await ssq.limit(1).get();
    if (ss.empty) throw new HttpsError("not-found", "الطالب غير موجود أو البيانات غير مطابقة");
    const st = ss.docs[0].data();
    const passHash = await hashPassword(password);
    await db.collection("users").add({ schoolId, userId:"P-"+civilId, civilId, phone, passHash, role:"parent", studentName, studentId:st.studentId||ss.docs[0].id, childIds:[st.studentId||ss.docs[0].id], classId:st.classId||"", status:"active", createdAt:admin.firestore.FieldValue.serverTimestamp() });
    return { success: true, userId:"P-"+civilId };
});
exports.loginParent = onCall({ cors: CORS, region: REGION }, async (req) => {
    const { schoolId, civilId, password } = req.data;
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
    if (!req.auth || !req.auth.uid) throw new HttpsError("unauthenticated", "يجب تسجيل الدخول");
    const au2 = await requireAuth(req, ["admin","assistant_manager","superadmin","teacher"]);
    const { schoolId: scId } = req.data; const schoolId = au2.role === "superadmin" ? scId : au2.schoolId;
    if (!schoolId) throw new HttpsError("invalid-argument", "schoolId مطلوب");
    const snap = await db.collection("students").where("schoolId","==",schoolId).get();
    const cls = {};
    snap.forEach(d => { const c=d.data().classId; if(c) cls[c]=1; });
    return { classes: Object.keys(cls).sort() };
});

exports.getRegistrationStudents = onCall({ cors: CORS, region: REGION }, async (req) => {
    const au3 = await requireAuth(req, ["admin","assistant_manager","superadmin","teacher"]);
    const { schoolId: scId2, classId } = req.data;
    const schoolId2 = au3.role === "superadmin" ? scId2 : au3.schoolId;
    if (!schoolId2) throw new HttpsError("invalid-argument", "schoolId مطلوب");
    let q = db.collection("students").where("schoolId","==",schoolId2);
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
    const sid = au.role === "superadmin" ? (req.data?.schoolId || null) : au.schoolId;
    let q = db.collection("audit_log").orderBy("createdAt","desc").limit(lim); if (sid && sid !== "system") q = q.where("schoolId","==",sid);
    const snap = await q.get();
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

exports.sendParentOTP = onCall({ cors: CORS, region: REGION }, async (req) => {
exports.sendParentOTP = onCall({ cors: CORS, region: REGION }, async (req) => {
    const { schoolId, phone, studentName, studentCivilId } = req.data;
    if (!schoolId || !phone || !studentName) throw new HttpsError("invalid-argument", "جميع الحقول مطلوبة");
    const rl = await checkRL("otp_"+phone); if (rl.locked) throw new HttpsError("resource-exhausted", "انتظر " + rl.remaining + " دقيقة");
    let ssq = db.collection("students").where("schoolId","==",schoolId).where("name","==",studentName);
    if (studentCivilId) ssq = ssq.where("civilId","==",studentCivilId);
    const ss = await ssq.limit(1).get();
    if (ss.empty) { await recFail("otp_"+phone); throw new HttpsError("not-found", "الطالب غير موجود"); }
    const st = ss.docs[0].data(); const regPhone = st.parentPhone||st.phone||""; if (regPhone && regPhone !== phone) { await recFail("otp_"+phone); throw new HttpsError("permission-denied", "رقم الهاتف غير مطابق"); }
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); const expires = Date.now() + 10*60*1000;
    await db.collection("otp_requests").doc(phone).set({ otp, expires, schoolId, studentName, createdAt: admin.firestore.FieldValue.serverTimestamp() }); await resetRL("otp_"+phone);
    console.log("OTP for " + phone + ": " + otp); return { success: true, message: "تم إرسال رمز التحقق" };
});
    if (!otpDoc.exists) throw new HttpsError("not-found", "لم يتم طلب رمز تحقق");
    const otpData = otpDoc.data();
    if (otpData.otp !== otp) throw new HttpsError("unauthenticated", "رمز التحقق غير صحيح");
    if (Date.now() > otpData.expires) throw new HttpsError("deadline-exceeded", "انتهت صلاحية رمز التحقق");
    if (otpData.schoolId !== schoolId) throw new HttpsError("permission-denied", "بيانات غير متطابقة");
    await db.collection("otp_requests").doc(phone).delete();
    const ex = await db.collection("users").where("schoolId","==",schoolId).where("civilId","==",civilId).where("role","==","parent").limit(1).get();
    if (!ex.empty) throw new HttpsError("already-exists", "الحساب موجود");
    let ssq = db.collection("students").where("schoolId","==",schoolId).where("name","==",studentName);
    if (studentCivilId) ssq = ssq.where("civilId","==",studentCivilId);
    const ss = await ssq.limit(1).get();
    if (ss.empty) throw new HttpsError("not-found", "الطالب غير موجود أو البيانات غير مطابقة");
    const st = ss.docs[0].data();
    const passHash = await hashPassword(password);
    await db.collection("users").add({ schoolId, userId:"P-"+civilId, civilId, phone, passHash, role:"parent", studentName, studentId:st.studentId||ss.docs[0].id, childIds:[st.studentId||ss.docs[0].id], classId:st.classId||"", status:"active", createdAt:admin.firestore.FieldValue.serverTimestamp() });
    return { success: true, userId:"P-"+civilId };
});
