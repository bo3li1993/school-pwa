// build: 20260826012154
"use strict";

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const argon2 = require("argon2");

admin.initializeApp();
const db = admin.firestore();
const { FieldValue } = require("firebase-admin/firestore");

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
    throw new HttpsError("unauthenticated", "[msg]");
  }
  if (req.auth.uid === "superadmin") {
    const sid = req.data?.schoolId || "system";
    if (roles && !roles.includes("superadmin")) {
      throw new HttpsError("permission-denied", "[msg]");
    }
    return { role: "superadmin", schoolId: sid, name: "Super Admin" };
  }
  const u = await db.collection("users").doc(req.auth.uid).get();
  if (!u.exists) throw new HttpsError("not-found", "[msg]");
  const d = u.data();
  if (roles && !roles.includes(d.role)) {
    throw new HttpsError("permission-denied", "[msg]");
  }
  if (d.status === "suspended") {
    throw new HttpsError("permission-denied", "account is suspended");
  }
  const claimedVersion = req.auth.token.tokenVersion || 1;
  const actualVersion = d.tokenVersion || 1;
  if (claimedVersion < actualVersion) {
    throw new HttpsError("unauthenticated", "session expired");
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
      createdAt: FieldValue.serverTimestamp()
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
      count: FieldValue.increment(1),
      lastAttempt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
}

async function resetRL(uid) {
  await db.collection("login_attempts").doc("user_" + uid).delete().catch(() => {});
}

// ===== loginUser =====
exports.loginUser = onCall({ cors: CORS, region: REGION, secrets: ["SUPER_ADMIN_HASH"] }, async (req) => {
  const { schoolId, userId, password } = req.data;

  if (!userId || !password) {
    throw new HttpsError("invalid-argument", "[msg]");
  }

  const rlKey = userId === "superadmin"
    ? "system:superadmin"
    : (schoolId || "system") + ":" + userId;

  const rl = await checkRL(rlKey);
  if (rl.locked) {
    throw new HttpsError("resource-exhausted", `[msg]`);
  }

  // Superadmin
  if (userId === "superadmin") {
const SH = (process.env.SUPER_ADMIN_HASH || "").trim();    if (!SH) throw new HttpsError("internal", "[msg]");
    const v = await verifyPassword(SH, password);
    if (!v) {
      await recFail(rlKey);
      throw new HttpsError("unauthenticated", "[msg]");
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
    throw new HttpsError("invalid-argument", "[msg]");
  }

  const snap = await db.collection("users")
    .where("userId", "==", userId)
    .where("schoolId", "==", schoolId)
    .limit(1)
    .get();

  if (snap.empty) {
    await recFail(rlKey);
    throw new HttpsError("unauthenticated", "[msg]");
  }

  const userDoc = snap.docs[0];
  const user = userDoc.data();
  const docId = userDoc.id;

  const secretSnap = await db.collection("user_secrets").doc(docId).get();
  const secretData = secretSnap.exists ? secretSnap.data() : {};
  if (!secretData.passHash) {
    await recFail(rlKey);
    throw new HttpsError("unauthenticated", "[msg]");
  }

  const v = await verifyPassword(secretData.passHash, password);
  if (!v) {
    await recFail(rlKey);
    throw new HttpsError("unauthenticated", "[msg]");
  }

  if (user.status === "suspended") {
    throw new HttpsError("permission-denied", "[msg]");
  }

  await resetRL(rlKey);

  const tokenVersion = user.tokenVersion || 1;
  const token = await admin.auth().createCustomToken(docId, {
    role: user.role,
    schoolId: user.schoolId,
    userId: user.userId,
    tokenVersion
  });

  await logAudit(schoolId, "LOGIN", userId, `[msg]`);

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
  const { schoolId, civilId, password } = req.data;
  if (!schoolId || !civilId || !password) {
    throw new HttpsError("invalid-argument", "[msg]");
  }
  const rlKey = schoolId + ":parent:" + civilId;
  const rl = await checkRL(rlKey);
  if (rl.locked) {
    throw new HttpsError("resource-exhausted", "[msg]" + rl.remaining + "[msg]");
  }
  const snap = await db.collection("parents")
    .where("schoolId", "==", schoolId)
    .where("civilId", "==", civilId)
    .limit(1)
    .get();
  if (snap.empty) {
    await recFail(rlKey);
    throw new HttpsError("unauthenticated", "[msg]");
  }
  const parentDoc = snap.docs[0];
  const parent = parentDoc.data();
  if (!parent.passHash) {
    await recFail(rlKey);
    throw new HttpsError("unauthenticated", "[msg]");
  }
  const v = await verifyPassword(parent.passHash, password);
  if (!v) {
    await recFail(rlKey);
    throw new HttpsError("unauthenticated", "[msg]");
  }
  await resetRL(rlKey);
  const childIds = parent.studentIds || (parent.studentId ? [parent.studentId] : []);
  const parentPhone = parent.phone || "";
  const parentTokenVersion = parent.tokenVersion || 1;
  const token = await admin.auth().createCustomToken(parentDoc.id, {
    role: "parent",
    schoolId,
    phone: parentPhone,
    childIds,
    tokenVersion: parentTokenVersion
  });
  return {
    token,
    role: "parent",
    schoolId,
    phone: parentPhone,
    name: parent.name || "",
    childIds
  };
});
// ===== createUser =====
exports.createUser = onCall({ cors: CORS, region: REGION }, async (req) => {
  const caller = await requireAuth(req, ["admin", "assistant_manager", "superadmin"]);
  const { schoolId, userId, name, role, password, phone, classId, department } = req.data;
  if (!schoolId || !userId || !name || !role || !password) {
    throw new HttpsError("invalid-argument", "[msg]");
  }
  if (caller.role !== "superadmin" && caller.schoolId !== schoolId) {
    throw new HttpsError("permission-denied", "[msg]");
  }
  const ALLOWED_ROLES = ["admin","assistant_manager","wing_supervisor","department_head","teacher","social_worker","nurse","guard"];
  const ROLE_RANK = { superadmin:99, admin:80, assistant_manager:70, wing_supervisor:60, department_head:50, teacher:40, social_worker:30, nurse:30, guard:20 };
  if (!ALLOWED_ROLES.includes(role)) {
    throw new HttpsError("permission-denied", "[msg]");
  }
  if (caller.role !== "superadmin" && ROLE_RANK[caller.role] === undefined) {
    throw new HttpsError("permission-denied", "Unknown caller role");
  }
  if (caller.role !== "superadmin" && (ROLE_RANK[role]||0) >= (ROLE_RANK[caller.role]||0)) {
    throw new HttpsError("permission-denied", "[msg]");
  }
  const passHash = await hashPassword(password);
  const userRef = db.collection("users").doc("user_" + schoolId + "_" + userId);
  await db.runTransaction(async (t) => {
    const snap = await t.get(userRef);
    if (snap.exists) {
      throw new HttpsError("already-exists", "[msg]");
    }
    t.set(userRef, {
      schoolId, userId, name, role,
      phone: phone || "",
      classId: classId || "",
      department: department || "",
      status: "active",
      createdAt: FieldValue.serverTimestamp()
    });
    const secretRef = db.collection("user_secrets").doc(userRef.id);
    t.set(secretRef, { passHash, userId, schoolId });
  });
  await logAudit(schoolId, "CREATE_USER", caller.userId || "superadmin", "[msg]" + role + ": " + userId);
  return { success: true, docId: userRef.id };
});
// ===== resetUserPassword =====
exports.resetUserPassword = onCall({ cors: CORS, region: REGION }, async (req) => {
  const caller = await requireAuth(req, ["admin", "assistant_manager", "superadmin"]);

  const { targetUserDocId, newPassword } = req.data;
  if (!newPassword || newPassword.length < 8) {
    throw new HttpsError("invalid-argument", "Password must be at least 8 characters");
  }
  if (!targetUserDocId || !newPassword) {
    throw new HttpsError("invalid-argument", "[msg]");
  }

  const userDoc = await db.collection("users").doc(targetUserDocId).get();
  if (!userDoc.exists) {
    throw new HttpsError("not-found", "[msg]");
  }

  const userData = userDoc.data();
  const ROLE_RANK_R = { superadmin:100, admin:80, assistant_manager:70, wing_supervisor:60, department_head:50, teacher:40, social_worker:30, nurse:30, guard:20, parent:10 };
  const targetRole = userData.role || "teacher";
  if (ROLE_RANK_R[targetRole] === undefined) {
    throw new HttpsError("permission-denied", "Unknown target role");
  }
  if (caller.role !== "superadmin" && ROLE_RANK_R[targetRole] >= (ROLE_RANK_R[caller.role] || 0)) {
    throw new HttpsError("permission-denied", "no permission to reset this role");
  }
  if (caller.role !== "superadmin" && caller.schoolId !== userData.schoolId) {
    throw new HttpsError("permission-denied", "[msg]");
  }

  const passHash = await hashPassword(newPassword);
  await db.collection("user_secrets").doc(targetUserDocId).set({ passHash, userId: userData.userId, schoolId: userData.schoolId }, { merge: true });

  await logAudit(userData.schoolId, "RESET_PASSWORD", caller.userId || "superadmin", `[msg]`);

  return { success: true };
});


// ===== OTP Config =====
const OTP_CONFIG = {
  SEND: {
    KEY_PREFIX: "otp:send:",
    MAX_ATTEMPTS: 3,
    WINDOW_MINUTES: 60,
    OTP_VALIDITY_MINUTES: 10
  },
  VERIFY: {
    KEY_PREFIX: "otp:verify:",
    MAX_ATTEMPTS: 5,
    WINDOW_MINUTES: 15
  }
};

// ===== OTP Helpers =====
function validateKuwaitiPhone(phone) {
  if (!phone || typeof phone !== "string") return null;
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("965")) {
    if (cleaned.length !== 12) return null;
  } else if (cleaned.startsWith("9")) {
    if (cleaned.length !== 8) return null;
    cleaned = "965" + cleaned;
  } else {
    return null;
  }
  return cleaned;
}

// checkAndRecordOtpSend: atomic check + increment ظ„ظ„ط¥ط±ط³ط§ظ„
async function checkAndRecordOtpSend(key, maxAttempts, windowMinutes) {
  const ref = db.collection("otp_rate_limits").doc(key);
  const windowMs = windowMinutes * 60 * 1000;
  let result;
  await db.runTransaction(async (t) => {
    const doc = await t.get(ref);
    const now = Date.now();
    if (!doc.exists) {
      t.set(ref, { count: 1, windowStart: new Date() });
      result = { locked: false, attempts: 1 };
    } else {
      const data = doc.data();
      const windowStart = data.windowStart?.toMillis?.() || 0;
      const inWindow = (now - windowStart) <= windowMs;
      const count = inWindow ? data.count : 0;
      if (count >= maxAttempts) {
        result = { locked: true, attempts: count, remaining: Math.ceil((windowStart + windowMs - now) / 60000) };
        return;
      }
      if (inWindow) {
        t.update(ref, { count: FieldValue.increment(1) });
        result = { locked: false, attempts: count + 1 };
      } else {
        t.set(ref, { count: 1, windowStart: new Date() });
        result = { locked: false, attempts: 1 };
      }
    }
  });
  return result;
}

async function checkAndRecordOtpAttempt(key, maxAttempts, windowMinutes) {
  const ref = db.collection("otp_rate_limits").doc(key);
  const windowMs = windowMinutes * 60 * 1000;
  let result;
  await db.runTransaction(async (t) => {
    const doc = await t.get(ref);
    const now = Date.now();
    if (!doc.exists) {
      t.set(ref, { count: 1, windowStart: new Date() });
      result = { locked: false, attempts: 1 };
    } else {
      const data = doc.data();
      const windowStart = data.windowStart?.toMillis?.() || 0;
      const inWindow = (now - windowStart) <= windowMs;
      const count = inWindow ? data.count : 0;
      if (count >= maxAttempts) {
        const remaining = Math.ceil((windowStart + windowMs - now) / 60000);
        result = { locked: true, attempts: count, remaining };
        return; // ظ„ط§ ظ†ط²ظٹط¯ ط§ظ„ط¹ط¯ط§ط¯ ط¥ط°ط§ ظƒط§ظ† ظ…ظ‚ظپظ„ط§ظ‹
      }
      if (inWindow) {
        t.update(ref, { count: FieldValue.increment(1) });
        result = { locked: false, attempts: count + 1 };
      } else {
        t.set(ref, { count: 1, windowStart: new Date() });
        result = { locked: false, attempts: 1 };
      }
    }
  });
  return result;
}

// ===== sendParentOTP =====
exports.sendParentOTP = onCall({ cors: CORS, region: REGION }, async (req) => {
  const { schoolId, studentCivilId } = req.data;

  // [FIX 1] ظ„ط§ ظ†ظ‚ط¨ظ„ parentPhone ظ…ظ† ط§ظ„ط·ظ„ط¨
  if (!schoolId || !studentCivilId) {
    throw new HttpsError("invalid-argument", "schoolId ظˆ studentCivilId ظ…ط·ظ„ظˆط¨ط§ظ†");
  }

  // ط¬ظ„ط¨ ط¨ظٹط§ظ†ط§طھ ط§ظ„ط·ط§ظ„ط¨
  const snap = await db.collection("students")
    .where("schoolId", "==", schoolId)
    .where("civilId", "==", studentCivilId)
    .limit(1)
    .get();

  if (snap.empty) {
    console.log("OTP: student not found", schoolId, studentCivilId);
    throw new HttpsError("failed-precondition", "طھط¹ط°ط± ط¥طھظ…ط§ظ… ط§ظ„ط¹ظ…ظ„ظٹط©");
  }

  // [atomic] Rate Limit - ط¨ط¹ط¯ ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ظˆط¬ظˆط¯ ط§ظ„ط·ط§ظ„ط¨
  const sendRLKey = OTP_CONFIG.SEND.KEY_PREFIX + schoolId + ":" + studentCivilId;
  const rl = await checkAndRecordOtpSend(sendRLKey, OTP_CONFIG.SEND.MAX_ATTEMPTS, OTP_CONFIG.SEND.WINDOW_MINUTES);
  if (rl.locked) {
    throw new HttpsError("resource-exhausted", "طھظ… طھط¬ط§ظˆط² ط­ط¯ ط§ظ„ظ…ط­ط§ظˆظ„ط§طھ. ط§ظ†طھط¸ط± " + rl.remaining + " ط¯ظ‚ظٹظ‚ط©");
  }

  const studentDoc = snap.docs[0];
  const studentData = studentDoc.data();

  // [FIX 1] ط¬ظ„ط¨ ط§ظ„ظ‡ط§طھظپ ظ…ظ† ط¨ظٹط§ظ†ط§طھ ط§ظ„ط·ط§ظ„ط¨ ط§ظ„ظ…ظˆط«ظ‚ط© ظپظ‚ط·
  const rawPhone = studentData.parentPhone || studentData.fatherPhone || studentData.phone;
  if (!rawPhone) {
    console.log("OTP: no phone for student", studentCivilId);
    throw new HttpsError("failed-precondition", "طھط¹ط°ط± ط¥طھظ…ط§ظ… ط§ظ„ط¹ظ…ظ„ظٹط©");
  }

  const validatedPhone = validateKuwaitiPhone(rawPhone);
  if (!validatedPhone) {
    console.log("OTP: invalid phone", studentCivilId);
    throw new HttpsError("failed-precondition", "طھط¹ط°ط± ط¥طھظ…ط§ظ… ط§ظ„ط¹ظ…ظ„ظٹط©");
  }

  // ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط¹ط¯ظ… ظˆط¬ظˆط¯ ط­ط³ط§ط¨ ط³ط§ط¨ظ‚
  const existingParent = await db.collection("parents")
    .where("schoolId", "==", schoolId)
    .where("studentDocId", "==", studentDoc.id)
    .limit(1)
    .get();
  if (!existingParent.empty) {
    console.log("OTP: parent already exists", schoolId, studentCivilId);
    throw new HttpsError("failed-precondition", "طھط¹ط°ط± ط¥طھظ…ط§ظ… ط§ظ„ط¹ظ…ظ„ظٹط©");
  }

  // طھظˆظ„ظٹط¯ OTP
  const crypto = require("crypto");
  const otp = crypto.randomInt(100000, 999999).toString();
  const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
  const expiresAt = new Date(Date.now() + OTP_CONFIG.SEND.OTP_VALIDITY_MINUTES * 60 * 1000);

  // ط­ظپط¸ OTP ظ…ط¹ ط¹ط¯ط§ط¯ ظ…ط­ط§ظˆظ„ط§طھ ط§ظ„طھط­ظ‚ظ‚
  await db.collection("otp_requests").doc(schoolId + "_" + studentCivilId).set({
    schoolId,
    studentDocId: studentDoc.id,
    studentId: studentData.studentId || studentDoc.id,
    studentCivilId,
    parentPhone: validatedPhone,          // [FIX 1] ظ…ظ† ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ظˆط«ظ‚ط©
    otpHash,
    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    verificationAttempts: 0,             // [FIX 3] ط¹ط¯ط§ط¯ ظ…ظ†ظپطµظ„
    maxVerificationAttempts: OTP_CONFIG.VERIFY.MAX_ATTEMPTS,
    status: "pending",
    createdAt: FieldValue.serverTimestamp()
  });
  // [atomic] ط§ظ„ط¹ط¯ط§ط¯ ط³ط¬ظ‘ظ„ ظپظٹ checkAndRecordOtpSend
  console.log("OTP sent to validated phone for student:", studentCivilId);
  return { success: true, message: "طھظ… ط¥ط±ط³ط§ظ„ ظƒظˆط¯ ط§ظ„طھط­ظ‚ظ‚ ط¨ط±ط³ط§ظ„ط© ظ†طµظٹط©. ط§ظ„ظƒظˆط¯ طµط§ظ„ط­ ظ„ظ€ 10 ط¯ظ‚ط§ط¦ظ‚" };
});

// ===== verifyOTPAndRegister =====
exports.verifyOTPAndRegister = onCall({ cors: CORS, region: REGION }, async (req) => {
  const { schoolId, studentCivilId, otp, password } = req.data;

  // [FIX 1] ظ„ط§ ظ†ظ‚ط¨ظ„ parentPhone ظ…ظ† ط§ظ„ط·ظ„ط¨
  if (!schoolId || !studentCivilId || !otp || !password || password.length < 8) {
    throw new HttpsError("invalid-argument", "ط¬ظ…ظٹط¹ ط§ظ„ط­ظ‚ظˆظ„ ظ…ط·ظ„ظˆط¨ط©");
  }

  // [FIX 2] Rate Limit ظ…ظ†ظپطµظ„ ظ„ظ„طھط­ظ‚ظ‚
  const verifyRLKey = OTP_CONFIG.VERIFY.KEY_PREFIX + schoolId + ":" + studentCivilId;
  const rl = await checkAndRecordOtpAttempt(verifyRLKey, OTP_CONFIG.VERIFY.MAX_ATTEMPTS, OTP_CONFIG.VERIFY.WINDOW_MINUTES);
  if (rl.locked) {
    throw new HttpsError("resource-exhausted", "طھظ… طھط¬ط§ظˆط² ظ…ط­ط§ظˆظ„ط§طھ ط§ظ„طھط­ظ‚ظ‚. ط§ظ†طھط¸ط± " + rl.remaining + " ط¯ظ‚ظٹظ‚ط©");
  }

  const otpRef = db.collection("otp_requests").doc(schoolId + "_" + studentCivilId);

  // hash ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ظ‚ط¨ظ„ Transaction ظ„طھط¬ظ†ط¨ side effects
  const hashedPassword = await argon2.hash(password, {
    type: argon2.argon2id, memoryCost: 32768, timeCost: 3, parallelism: 1
  });

  let txResult;
  await db.runTransaction(async (t) => {
    const otpDoc = await t.get(otpRef);
    if (!otpDoc.exists) throw new HttpsError("not-found", "ظ„ظ… ظٹطھظ… ط·ظ„ط¨ ظƒظˆط¯ طھط­ظ‚ظ‚. ط§ط¨ط¯ط£ ظ…ظ† ط¬ط¯ظٹط¯");

    const data = otpDoc.data();

    // [FIX 3] ظپط­طµ ط¹ط¯ط§ط¯ ط§ظ„ظ…ط­ط§ظˆظ„ط§طھ
    if (data.verificationAttempts >= OTP_CONFIG.VERIFY.MAX_ATTEMPTS) {
      t.delete(otpRef);
      throw new HttpsError("resource-exhausted", "طھط¬ط§ظˆط²طھ ط­ط¯ ظ…ط­ط§ظˆظ„ط§طھ ط§ظ„طھط­ظ‚ظ‚ (5). ط§ط·ظ„ط¨ ط±ظ…ط² ط¬ط¯ظٹط¯");
    }

    // ظپط­طµ ط§ظ†طھظ‡ط§ط، ط§ظ„طµظ„ط§ط­ظٹط©
    if (new Date() > data.expiresAt.toDate()) {
      t.delete(otpRef);
      throw new HttpsError("deadline-exceeded", "ط§ظ†طھظ‡طھ طµظ„ط§ط­ظٹط© ط§ظ„ط±ظ…ط². ط§ط·ظ„ط¨ ط±ظ…ط² ط¬ط¯ظٹط¯ط§ظ‹");
    }

    // ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط§ظ„ط±ظ…ط²
    const crypto = require("crypto");
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    if (otpHash !== data.otpHash) {
      const newAttempts = data.verificationAttempts + 1;
      const remaining = OTP_CONFIG.VERIFY.MAX_ATTEMPTS - newAttempts;

      // [FIX 3] ط²ظٹط§ط¯ط© ط§ظ„ط¹ط¯ط§ط¯
      if (remaining <= 0) {
        t.delete(otpRef);
      } else {
        t.update(otpRef, {
          verificationAttempts: newAttempts,
          lastAttemptAt: FieldValue.serverTimestamp()
        });
      }

      throw new HttpsError("unauthenticated", "ط§ظ„ط±ظ…ط² ط؛ظٹط± طµط­ظٹط­. ظ…ط­ط§ظˆظ„ط§طھ ظ…طھط¨ظ‚ظٹط©: " + remaining);
    }

    // [FIX 1] ط§ظ„ظ‡ط§طھظپ ظ…ظ† ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ظˆط«ظ‚ط© ط§ظ„ظ…ط®ط²ظ†ط© (ظ„ظٹط³ ظ…ظ† ط§ظ„ط·ظ„ط¨)
    const parentDocId = "parent_" + schoolId + "_" + data.studentDocId;
    t.set(db.collection("parents").doc(parentDocId), {
      schoolId,
      studentDocId: data.studentDocId,
      studentId: data.studentId,
      civilId: data.studentCivilId,
      phone: data.parentPhone,           // [FIX 1] ظ…ظ† ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ظˆط«ظ‚ط©
      passHash: hashedPassword,
      verified: true,
      tokenVersion: 1,
      createdAt: FieldValue.serverTimestamp()
    });

    // ط­ط°ظپ OTP ط¨ط¹ط¯ ط§ظ„ظ†ط¬ط§ط­
    t.delete(otpRef);

    txResult = { parentDocId, schoolId, studentId: data.studentId };
  });

  // createCustomToken ط®ط§ط±ط¬ Transaction ظ„طھط¬ظ†ط¨ side effects ط¹ظ†ط¯ retry
  const customToken = await admin.auth().createCustomToken(
    txResult.parentDocId,
    { schoolId: txResult.schoolId, role: "parent", childIds: [txResult.studentId], tokenVersion: 1 }
  );
  return { success: true, token: customToken, message: "طھظ… ط¥ظ†ط´ط§ط، ط­ط³ط§ط¨ظƒ ط¨ظ†ط¬ط§ط­" };
});

exports.getRegistrationClasses = onCall({ cors: CORS, region: REGION }, async (req) => {
 const callerGRC = await requireAuth(req, ["admin", "assistant_manager", "superadmin", "wing_supervisor"]);
  const schoolId = callerGRC.role === "superadmin" ? req.data.schoolId : callerGRC.schoolId;
  if (!schoolId) throw new HttpsError("invalid-argument", "[msg]");

  const snap = await db.collection("classes")
    .where("schoolId", "==", schoolId)
    .get();

  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
});

// ===== getRegistrationStudents =====
exports.getRegistrationStudents = onCall({ cors: CORS, region: REGION }, async (req) => {
   const callerGRS = await requireAuth(req, ["admin", "assistant_manager", "superadmin", "wing_supervisor", "teacher"]);
  const { classId } = req.data;
  const schoolId = callerGRS.role === "superadmin" ? req.data.schoolId : callerGRS.schoolId;
  if (!schoolId) throw new HttpsError("invalid-argument", "[msg]");

  let q = db.collection("students").where("schoolId", "==", schoolId);
  if (classId) q = q.where("classId", "==", classId);

  const snap = await q.get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
});

// ===== addStudentIds =====
exports.addStudentIds = onCall({ cors: CORS, region: REGION }, async (req) => {
   const callerASI = await requireAuth(req, ["admin", "assistant_manager", "superadmin"]);
  const { students } = req.data;
  const schoolId = callerASI.role === "superadmin" ? req.data.schoolId : callerASI.schoolId;
  if (!schoolId || !Array.isArray(students)) {
    throw new HttpsError("invalid-argument", "[msg]");
  }

  const batch = db.batch();
  for (const s of students.slice(0, 499)) {
    const ref = db.collection("students").doc(s.id || db.collection("students").doc().id);
    let safeStudent;
    if (s.id) {
      const existing = await ref.get();
      if (existing.exists) {
        if (callerASI.role !== "superadmin" && existing.data().schoolId !== schoolId) {
          throw new HttpsError("permission-denied", "student belongs to another school");
        }
        safeStudent = { name: s.name, classId: s.classId };
      } else {
        safeStudent = { name: s.name, civilId: s.civilId, classId: s.classId, studentId: s.studentId };
      }
    } else {
      safeStudent = { name: s.name, civilId: s.civilId, classId: s.classId, studentId: s.studentId };
    }
    batch.set(ref, { ...safeStudent, schoolId }, { merge: true });
  }
  await batch.commit();

  return { success: true, count: Math.min(students.length, 499) };
});

// ===== createBackup =====
exports.createBackup = onCall({ cors: CORS, region: REGION }, async (req) => {
   const callerCB = await requireAuth(req, ["admin", "superadmin"]);
  const schoolId = callerCB.role === "superadmin" ? req.data.schoolId : callerCB.schoolId;
  if (!schoolId) throw new HttpsError("invalid-argument", "[msg]");

  const collections = ["users", "students", "classes", "attendance"];
  const backup = {};

  for (const col of collections) {
    const snap = await db.collection(col).where("schoolId", "==", schoolId).get();
    backup[col] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  const ref = await db.collection("backups").add({
    schoolId,
    data: JSON.stringify(backup),
    createdAt: FieldValue.serverTimestamp()
  });

  return { success: true, backupId: ref.id };
});

// ===== getAuditLog =====
exports.getAuditLog = onCall({ cors: CORS, region: REGION }, async (req) => {
    const callerGAL = await requireAuth(req, ["admin", "superadmin"]);
  const { limit: lim = 50 } = req.data;
  const schoolId = callerGAL.role === "superadmin" ? req.data.schoolId : callerGAL.schoolId;
  if (!schoolId) throw new HttpsError("invalid-argument", "[msg]");
  const snap = await db.collection("audit_log")
    .where("schoolId", "==", schoolId)
    .orderBy("createdAt", "desc")
    .limit(lim)
    .get();

  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
});

// ===== generateReportNow =====
exports.generateReportNow = onCall({ cors: CORS, region: REGION }, async (req) => {
    const callerGRN = await requireAuth(req, ["admin", "assistant_manager", "superadmin"]);
  const { type } = req.data;
  const schoolId = callerGRN.role === "superadmin" ? req.data.schoolId : callerGRN.schoolId;
  if (!schoolId) throw new HttpsError("invalid-argument", "[msg]");

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
    createdAt: FieldValue.serverTimestamp()
  });

  return { success: true, reportId: ref.id };
});

// ===== scheduledDailyBackup =====

exports.updateUserStatus = onCall({ cors: CORS, region: REGION }, async (req) => {
  const caller = await requireAuth(req, ["admin", "superadmin"]);
  const { schoolId, docId, status } = req.data;
  if (!docId || !status) throw new HttpsError("invalid-argument", "docId and status required");
  if (!["active", "suspended"].includes(status)) throw new HttpsError("invalid-argument", "invalid status");
  if (caller.role !== "superadmin" && caller.schoolId !== schoolId) {
    throw new HttpsError("permission-denied", "cross-school not allowed");
  }
  const userRef = db.collection("users").doc(docId);
  const userDoc = await userRef.get();
  if (!userDoc.exists) throw new HttpsError("not-found", "user not found");
  const currentVersion = userDoc.data().tokenVersion || 1;
  await userRef.update({
    status,
    tokenVersion: status === "suspended" ? currentVersion + 1 : currentVersion
  });
  await logAudit(schoolId, "UPDATE_STATUS", docId, status);
  return { success: true };
});

// ===== promoteStudents â€” ط§ظ„طھط±ظ‚ظٹط© ط§ظ„ط³ظ†ظˆظٹط© =====
// ط£ط¶ظپ ظ‡ط°ط§ ط§ظ„ظƒظˆط¯ ظپظٹ ظ†ظ‡ط§ظٹط© functions/index.js ظ‚ط¨ظ„ scheduledDailyBackup

exports.promoteStudents = onCall({ cors: CORS, region: REGION }, async (req) => {
  const caller = await requireAuth(req, ["admin", "superadmin"]);
  const schoolId = caller.role === "superadmin" ? req.data.schoolId : caller.schoolId;

  if (!schoolId) throw new HttpsError("invalid-argument", "schoolId ظ…ط·ظ„ظˆط¨.");

  const now = new Date();
  const startYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  const yearLabel = `${startYear}-${startYear + 1}`;

  try {
    // ط¬ظ„ط¨ ظƒظ„ ط·ظ„ط§ط¨ ط§ظ„ظ…ط¯ط±ط³ط©
    const studentsSnap = await db.collection("students")
      .where("schoolId", "==", schoolId)
      .get();

    if (studentsSnap.empty) {
      throw new HttpsError("not-found", "ظ„ط§ ظٹظˆط¬ط¯ ط·ظ„ط§ط¨ ظ„ظ„طھط±ط­ظٹظ„.");
    }

    const GRADE_MAP = {
      "6": "7", "7": "8", "8": "9"
    };
    const GRADUATE_GRADE = "9";

    let promoted = 0;
    let graduated = 0;

    // طھط¹ظ„ظٹظ… ط§ظ„ط³ط¬ظ„ط§طھ ط¨ط§ظ„ط³ظ†ط© ط§ظ„ط¯ط±ط§ط³ظٹط© ظ‚ط¨ظ„ ط§ظ„طھط±ط­ظٹظ„
    const collections = ["attendance", "behavior", "gatepass", "clinic", "warnings", "rewards"];
    for (const colName of collections) {
      const colSnap = await db.collection(colName)
        .where("schoolId", "==", schoolId)
        .get();
      
      const batch = db.batch();
      colSnap.forEach(d => {
        if (!d.data().academicYear) {
          batch.update(d.ref, { academicYear: yearLabel });
        }
      });
      if (!colSnap.empty) await batch.commit();
    }

    // طھط±ط­ظٹظ„ ط§ظ„ط·ظ„ط§ط¨ ط¯ظپط¹ط§طھ
    const BATCH_SIZE = 400;
    const docs = studentsSnap.docs;

    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const chunk = docs.slice(i, i + BATCH_SIZE);
      const batch = db.batch();

      for (const d of chunk) {
        const data = d.data();
        const classId = data.classId || "";
        const parts = classId.split("/");
        if (parts.length !== 2) continue;
        
        const grade = parts[0];
        const section = parts[1];

        if (grade === GRADUATE_GRADE) {
          // ط£ط±ط´ظپط© ط§ظ„ط®ط±ظٹط¬ظٹظ†
          const archiveRef = db.collection("graduated_students").doc();
          batch.set(archiveRef, {
            ...data,
            originalId: d.id,
            graduatedYear: yearLabel,
            graduatedAt: new Date().toISOString(),
            schoolId
          });
          batch.delete(d.ref);
          graduated++;
        } else if (GRADE_MAP[grade]) {
          // طھط±ظ‚ظٹط© ظ„ظ„طµظپ ط§ظ„ط£ط¹ظ„ظ‰
          const newGrade = GRADE_MAP[grade];
          const newClassId = `${newGrade}/${section}`;
          batch.update(d.ref, { classId: newClassId });
          promoted++;
        }
      }

      await batch.commit();
    }

    // طھط³ط¬ظٹظ„ ط¹ظ…ظ„ظٹط© ط§ظ„طھط±ط­ظٹظ„
    await db.collection("promotion_logs").add({
      schoolId,
      yearLabel,
      promoted,
      graduated,
      performedBy: caller.uid || "admin",
      performedAt: new Date(),
    });

    return { success: true, promoted, graduated, yearLabel };

  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message || "ظپط´ظ„ ظپظٹ طھظ†ظپظٹط° ط§ظ„طھط±ط­ظٹظ„.");
  }
});


// ===== analyzeAttendance — تحليل الغياب بالذكاء الاصطناعي =====
// أضف هذا الكود في نهاية functions/index.js قبل scheduledDailyBackup
// ثم أضف في Firebase Secrets: ANTHROPIC_API_KEY

exports.analyzeAttendance = onCall({
  cors: CORS,
  region: REGION,
  secrets: ["ANTHROPIC_API_KEY"]
}, async (req) => {
  const caller = await requireAuth(req, ["admin", "assistant_manager", "superadmin"]);

  const { prompt } = req.data;
  if (!prompt || typeof prompt !== "string" || prompt.length > 5000) {
    throw new HttpsError("invalid-argument", "prompt غير صالح.");
  }

  const apiKey = (process.env.ANTHROPIC_API_KEY || "").trim();
  if (!apiKey) {
    throw new HttpsError("internal", "مفتاح API غير مضبوط.");
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      throw new Error("API error: " + response.status);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "لم يتم الحصول على نتيجة";

    return { text };

  } catch (error) {
    throw new HttpsError("internal", error.message || "فشل التحليل.");
  }
});


// ===== analyzeAttendance — تحليل الغياب بالذكاء الاصطناعي =====
// أضف هذا الكود في نهاية functions/index.js قبل scheduledDailyBackup
// ثم أضف في Firebase Secrets: ANTHROPIC_API_KEY

exports.analyzeAttendance = onCall({
  cors: CORS,
  region: REGION,
  secrets: ["ANTHROPIC_API_KEY"]
}, async (req) => {
  const caller = await requireAuth(req, ["admin", "assistant_manager", "superadmin"]);

  const { prompt } = req.data;
  if (!prompt || typeof prompt !== "string" || prompt.length > 5000) {
    throw new HttpsError("invalid-argument", "prompt غير صالح.");
  }

  const apiKey = (process.env.ANTHROPIC_API_KEY || "").trim();
  if (!apiKey) {
    throw new HttpsError("internal", "مفتاح API غير مضبوط.");
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      throw new Error("API error: " + response.status);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "لم يتم الحصول على نتيجة";

    return { text };

  } catch (error) {
    throw new HttpsError("internal", error.message || "فشل التحليل.");
  }
});


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
          createdAt: FieldValue.serverTimestamp()
        });
      } catch (e) {
        console.error("BACKUP_FAIL", schoolId, e.message);
      }
    }
  }
);
// updated: 20260826012547
// fix: remove OTP from logs 20260826072312
// security-patch: 1787718478

// redeploy 09/03/2026 08:39:51


