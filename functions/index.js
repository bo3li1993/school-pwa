// build: 20260824_CLEAN
"use strict";

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const argon2 = require("argon2");

admin.initializeApp();
const db = admin.firestore();

const CORS = [
  /^https:\/\/bo3li1993\.github\.io(\/.*)?$/,
  /^http:\/\/localhost(?::\d+)?$/
];
const REGION = "me-central1";
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

// ===== Password Helpers =====
async function hashPassword(p) {
  return argon2.hash(p, {
    type: argon2.argon2id,
    memoryCost: 32768,
    timeCost: 3,
    parallelism: 1
  });
}

async function verifyPassword(h, p) {
  try {
    return await argon2.verify(h, p);
  } catch (e) {
    return false;
  }
}

// ===== Auth Helper =====
async function requireAuth(req, roles) {
  if (!req.auth || !req.auth.uid) {
    throw new HttpsError("unauthenticated", "يجب تسجيل الدخول");
  }
  if (req.auth.uid === "superadmin") {
    const sid = req.data?.schoolId || "system";
    if (roles && !roles.includes("superadmin")) {
      throw new HttpsError("permission-denied", "لا صلاحيات");
    }
    return { role: "superadmin", schoolId: sid, name: "Super Admin" };
  }
  const u = await db.collection("users").doc(req.auth.uid).get();
  if (!u.exists) throw new HttpsError("not-found", "المستخدم غير موجود");
  const d = u.data();
  if (roles && !roles.includes(d.role)) {
    throw new HttpsError("permission-denied", "لا صلاحيات");
  }
  return d;
}

// ===== Audit Log =====
async function logAudit(s, a, p, d) {
  try {
    await db.collection("audit_log").add({
      schoolId: s,
      action: a,
      performedBy: p,
      details: d || "",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {
    console.error("AUDIT_FAIL", a, s, e.message);
  }
}

// ===== Rate Limiting =====
async function checkRL(uid) {
  const r = db.collection("login_attempts").doc("user_" + uid);
  const s = await r.get();
  if (s.exists) {
    const d = s.data();
    const m = (Date.now() - (d.lastAttempt?.toMillis?.() || 0)) / 60000;
    if (d.count >= MAX_ATTEMPTS && m < LOCKOUT_MINUTES) {
      return { locked: true, remaining: Math.ceil(LOCKOUT_MINUTES - m) };
    }
  }
  return { locked: false };
}

async function recFail(uid) {
  await db.collection("login_attempts").doc("user_" + uid).set(
    {
      count: admin.firestore.FieldValue.increment(1),
      lastAttempt: admin.firestore.FieldValue.serverTimestamp()
    },
    { merge: true }
  );
}

async function resetRL(uid) {
  await db.collection("login_attempts").doc("user_" + uid).delete().catch(() => {});
}

// ===== loginUser =====
exports.loginUser = onCall({ cors: CORS, region: REGION }, async (req) => {
  const { schoolId, userId, password } = req.data;

  if (!userId || !password) {
    throw new HttpsError("invalid-argument", "userId و password مطلوبان");
  }

  const rlKey = userId === "superadmin"
    ? "system:superadmin"
    : (schoolId || "system") + ":" + userId;

  const rl = await checkRL(rlKey);
  if (rl.locked) {
    throw new HttpsError("resource-exhausted", `انتظر ${rl.remaining} دقيقة`);
  }

  // Superadmin
  if (userId === "superadmin") {
    const SH = process.env.SUPER_ADMIN_HASH || "";
    if (!SH) throw new HttpsError("internal", "خطأ في الإعدادات");
    const v = await verifyPassword(SH, password);
    if (!v) {
      await recFail(rlKey);
      throw new HttpsError("unauthenticated", "كلمة المرور غير صحيحة");
    }
    await resetRL(rlKey);
    const token = await admin.auth().createCustomToken("superadmin", {
      role: "superadmin",
      schoolId: "system",
      superadmin: true
    });
    return { token, role: "superadmin", schoolId: "system", name: "Super Admin", userId: "superadmin" };
  }

  if (!schoolId) {
    throw new HttpsError("invalid-argument", "schoolId مطلوب");
  }

  const snap = await db.collection("users")
    .where("userId", "==", userId)
    .where("schoolId", "==", schoolId)
    .limit(1)
    .get();

  if (snap.empty) {
    await recFail(rlKey);
    throw new HttpsError("unauthenticated", "بيانات الدخول غير صحيحة");
  }

  const userDoc = snap.docs[0];
  const user = userDoc.data();
  const docId = userDoc.id;

  if (!user.passHash) {
    await recFail(rlKey);
    throw new HttpsError("unauthenticated", "كلمة المرور غير صحيحة");
  }

  const v = await verifyPassword(user.passHash, password);
  if (!v) {
    await recFail(rlKey);
    throw new HttpsError("unauthenticated", "بيانات الدخول غير صحيحة");
  }

  if (user.status === "suspended") {
    throw new HttpsError("permission-denied", "الحساب موقوف");
  }

  await resetRL(rlKey);

  const token = await admin.auth().createCustomToken(docId, {
    role: user.role,
    schoolId: user.schoolId,
    userId: user.userId
  });

  await logAudit(schoolId, "LOGIN", userId, `دخول من ${user.role}`);

  return {
    token,
    role: user.role,
    schoolId: user.schoolId,
    userId: user.userId,
    name: user.name || "",
    classId: user.classId || "",
    docId
  };
});

// ===== loginParent =====
exports.loginParent = onCall({ cors: CORS, region: REGION }, async (req) => {
  const { schoolId, phone, password } = req.data;
  if (!schoolId || !phone || !password) {
    throw new HttpsError("invalid-argument", "schoolId و phone و password مطلوبة");
  }

  const rlKey = schoolId + ":parent:" + phone;
  const rl = await checkRL(rlKey);
  if (rl.locked) {
    throw new HttpsError("resource-exhausted", `انتظر ${rl.remaining} دقيقة`);
  }

  const snap = await db.collection("parents")
    .where("schoolId", "==", schoolId)
    .where("phone", "==", phone)
    .limit(1)
    .get();

  if (snap.empty) {
    await recFail(rlKey);
    throw new HttpsError("unauthenticated", "بيانات الدخول غير صحيحة");
  }

  const parentDoc = snap.docs[0];
  const parent = parentDoc.data();

  if (!parent.passHash) {
    await recFail(rlKey);
    throw new HttpsError("unauthenticated", "كلمة المرور غير صحيحة");
  }

  const v = await verifyPassword(parent.passHash, password);
  if (!v) {
    await recFail(rlKey);
    throw new HttpsError("unauthenticated", "بيانات الدخول غير صحيحة");
  }

  await resetRL(rlKey);

  const token = await admin.auth().createCustomToken(parentDoc.id, {
    role: "parent",
    schoolId,
    phone
  });

  return {
    token,
    role: "parent",
    schoolId,
    phone,
    name: parent.name || "",
    studentIds: parent.studentIds || []
  };
});

// ===== createUser =====
exports.createUser = onCall({ cors: CORS, region: REGION }, async (req) => {
  const caller = await requireAuth(req, ["admin", "assistant_manager", "superadmin"]);

  const { schoolId, userId, name, role, password, phone, classId, department } = req.data;
  if (!schoolId || !userId || !name || !role || !password) {
    throw new HttpsError("invalid-argument", "الحقول المطلوبة ناقصة");
  }

  if (caller.role !== "superadmin" && caller.schoolId !== schoolId) {
    throw new HttpsError("permission-denied", "لا صلاحية لإنشاء مستخدم في مدرسة أخرى");
  }

  const existing = await db.collection("users")
    .where("userId", "==", userId)
    .where("schoolId", "==", schoolId)
    .limit(1)
    .get();

  if (!existing.empty) {
    throw new HttpsError("already-exists", "اسم المستخدم موجود مسبقاً");
  }

  const passHash = await hashPassword(password);

  const ref = await db.collection("users").add({
    schoolId, userId, name, role,
    phone: phone || "",
    classId: classId || "",
    department: department || "",
    passHash,
    status: "active",
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  await logAudit(schoolId, "CREATE_USER", caller.userId || "superadmin", `إنشاء ${role}: ${userId}`);

  return { success: true, docId: ref.id };
});

// ===== resetUserPassword =====
exports.resetUserPassword = onCall({ cors: CORS, region: REGION }, async (req) => {
  const caller = await requireAuth(req, ["admin", "assistant_manager", "superadmin"]);

  const { targetUserDocId, newPassword } = req.data;
  if (!targetUserDocId || !newPassword) {
    throw new HttpsError("invalid-argument", "targetUserDocId و newPassword مطلوبان");
  }

  const userDoc = await db.collection("users").doc(targetUserDocId).get();
  if (!userDoc.exists) {
    throw new HttpsError("not-found", "المستخدم غير موجود");
  }

  const userData = userDoc.data();
  if (caller.role !== "superadmin" && caller.schoolId !== userData.schoolId) {
    throw new HttpsError("permission-denied", "لا صلاحية");
  }

  const passHash = await hashPassword(newPassword);
  await db.collection("users").doc(targetUserDocId).update({ passHash });

  await logAudit(userData.schoolId, "RESET_PASSWORD", caller.userId || "superadmin", `تغيير كلمة مرور: ${userData.userId}`);

  return { success: true };
});

// ===== sendParentOTP =====
exports.sendParentOTP = onCall({ cors: CORS, region: REGION }, async (req) => {
  const { schoolId, studentCivilId, parentPhone } = req.data;
  if (!schoolId || !studentCivilId || !parentPhone) {
    throw new HttpsError("invalid-argument", "schoolId و studentCivilId و parentPhone مطلوبة");
  }

  const snap = await db.collection("students")
    .where("schoolId", "==", schoolId)
    .where("civilId", "==", studentCivilId)
    .limit(1)
    .get();

  if (snap.empty) {
    throw new HttpsError("not-found", "الطالب غير موجود");
  }

  const studentDoc = snap.docs[0];
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db.collection("otp_requests").doc(schoolId + "_" + studentCivilId).set({
    schoolId,
    studentDocId: studentDoc.id,
    studentCivilId,
    parentPhone,
    otp,
    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  console.log(`OTP for ${parentPhone}: ${otp}`);

  return { success: true, message: "تم إرسال رمز التحقق" };
});

// ===== verifyOTPAndRegister =====
exports.verifyOTPAndRegister = onCall({ cors: CORS, region: REGION }, async (req) => {
  const { schoolId, studentCivilId, parentPhone, otp, password } = req.data;
  if (!schoolId || !studentCivilId || !parentPhone || !otp || !password) {
    throw new HttpsError("invalid-argument", "جميع الحقول مطلوبة");
  }

  const otpRef = db.collection("otp_requests").doc(schoolId + "_" + studentCivilId);

  return await db.runTransaction(async (t) => {
    const otpDoc = await t.get(otpRef);
    if (!otpDoc.exists) throw new HttpsError("not-found", "لم يتم طلب OTP");

    const data = otpDoc.data();
    if (data.otp !== otp) throw new HttpsError("unauthenticated", "رمز التحقق غير صحيح");
    if (data.expiresAt.toDate() < new Date()) throw new HttpsError("deadline-exceeded", "انتهت صلاحية الرمز");
    if (data.parentPhone !== parentPhone) throw new HttpsError("permission-denied", "رقم الهاتف غير مطابق");

    const passHash = await hashPassword(password);

    const parentRef = db.collection("parents").doc();
    t.set(parentRef, {
      schoolId,
      phone: parentPhone,
      studentDocId: data.studentDocId,
      studentCivilId,
      passHash,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    t.delete(otpRef);

    return { success: true, parentId: parentRef.id };
  });
});

// ===== getRegistrationClasses =====
exports.getRegistrationClasses = onCall({ cors: CORS, region: REGION }, async (req) => {
  await requireAuth(req, ["admin", "assistant_manager", "superadmin", "wing_supervisor"]);
  const { schoolId } = req.data;
  if (!schoolId) throw new HttpsError("invalid-argument", "schoolId مطلوب");

  const snap = await db.collection("classes")
    .where("schoolId", "==", schoolId)
    .get();

  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
});

// ===== getRegistrationStudents =====
exports.getRegistrationStudents = onCall({ cors: CORS, region: REGION }, async (req) => {
  await requireAuth(req, ["admin", "assistant_manager", "superadmin", "wing_supervisor", "teacher"]);
  const { schoolId, classId } = req.data;
  if (!schoolId) throw new HttpsError("invalid-argument", "schoolId مطلوب");

  let q = db.collection("students").where("schoolId", "==", schoolId);
  if (classId) q = q.where("classId", "==", classId);

  const snap = await q.get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
});

// ===== addStudentIds =====
exports.addStudentIds = onCall({ cors: CORS, region: REGION }, async (req) => {
  await requireAuth(req, ["admin", "assistant_manager", "superadmin"]);
  const { schoolId, students } = req.data;
  if (!schoolId || !Array.isArray(students)) {
    throw new HttpsError("invalid-argument", "schoolId و students مطلوبان");
  }

  const batch = db.batch();
  students.slice(0, 499).forEach(s => {
    const ref = db.collection("students").doc(s.id || db.collection("students").doc().id);
    batch.set(ref, { schoolId, ...s }, { merge: true });
  });
  await batch.commit();

  return { success: true, count: students.length };
});

// ===== createBackup =====
exports.createBackup = onCall({ cors: CORS, region: REGION }, async (req) => {
  await requireAuth(req, ["admin", "superadmin"]);
  const { schoolId } = req.data;
  if (!schoolId) throw new HttpsError("invalid-argument", "schoolId مطلوب");

  const collections = ["users", "students", "classes", "attendance"];
  const backup = {};

  for (const col of collections) {
    const snap = await db.collection(col).where("schoolId", "==", schoolId).get();
    backup[col] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  const ref = await db.collection("backups").add({
    schoolId,
    data: JSON.stringify(backup),
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { success: true, backupId: ref.id };
});

// ===== getAuditLog =====
exports.getAuditLog = onCall({ cors: CORS, region: REGION }, async (req) => {
  await requireAuth(req, ["admin", "superadmin"]);
  const { schoolId, limit: lim = 50 } = req.data;
  if (!schoolId) throw new HttpsError("invalid-argument", "schoolId مطلوب");

  const snap = await db.collection("audit_log")
    .where("schoolId", "==", schoolId)
    .orderBy("createdAt", "desc")
    .limit(lim)
    .get();

  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
});

// ===== generateReportNow =====
exports.generateReportNow = onCall({ cors: CORS, region: REGION }, async (req) => {
  await requireAuth(req, ["admin", "assistant_manager", "superadmin"]);
  const { schoolId, type } = req.data;
  if (!schoolId) throw new HttpsError("invalid-argument", "schoolId مطلوب");

  const snap = await db.collection("attendance")
    .where("schoolId", "==", schoolId)
    .orderBy("date", "desc")
    .limit(500)
    .get();

  const report = {
    schoolId, type, generatedAt: new Date().toISOString(),
    records: snap.docs.map(d => d.data())
  };

  const ref = await db.collection("reports").add({
    schoolId, type, data: JSON.stringify(report),
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { success: true, reportId: ref.id };
});

// ===== scheduledDailyBackup =====
exports.scheduledDailyBackup = onSchedule(
  { schedule: "0 1 * * *", region: REGION, timeZone: "Asia/Kuwait" },
  async () => {
    const schoolsSnap = await db.collection("schools")
      .where("status", "==", "active")
      .get();

    for (const schoolDoc of schoolsSnap.docs) {
      const schoolId = schoolDoc.id;
      try {
        const collections = ["users", "students", "classes", "attendance"];
        const backup = {};
        for (const col of collections) {
          const snap = await db.collection(col).where("schoolId", "==", schoolId).get();
          backup[col] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
        await db.collection("backups").add({
          schoolId, automatic: true,
          data: JSON.stringify(backup),
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (e) {
        console.error("BACKUP_FAIL", schoolId, e.message);
      }
    }
  }
);
