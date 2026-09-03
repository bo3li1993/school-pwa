const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const argon2 = require("argon2");

// تهيئة تطبيق Firebase Admin
initializeApp();
const db = getFirestore();
const auth = getAuth();

// تحديد المنطقة التي تُنفذ فيها الدوال (الكويت / الشرق الأوسط)
const REGION = "me-central1";

/**
 * دالة للتحقق من تسجيل الدخول والصلاحيات (Authentication & Authorization)
 * @param {Object} req - طلب Firebase Cloud Function
 * @param {Array<string>} roles - مصفوفة الصلاحيات المسموح لها بالدخول (اختياري)
 */
async function requireAuth(req, roles = []) {
  // 1. التحقق من وجود تسجيل دخول
  if (!req.auth || !req.auth.uid) {
    throw new HttpsError("unauthenticated", "يجب تسجيل الدخول أولاً للمتابعة.");
  }

  // 2. التحقق من الأدوار (Roles) إذا تم تحديدها
  if (roles.length > 0) {
    // البحث أولاً في Custom Claims للمستخدم
    let userRole = req.auth.token.role;

    // إذا لم تكن موجودة في التوكن، يتم الاستعلام عنها من قاعدة بيانات Firestore
    if (!userRole) {
      const userDoc = await db.collection("users").doc(req.auth.uid).get();
      if (userDoc.exists) {
        userRole = userDoc.data()?.role;
      }
    }

    // رفض الطلب إذا لم يمتلك المستخدم الصلاحية المطلوبة
    if (!userRole || !roles.includes(userRole)) {
      throw new HttpsError("permission-denied", "ليس لديك الصلاحية الكافية لتنفيذ هذا الإجراء.");
    }
  }

  return req.auth;
}

/**
 * دالة تشفير كلمات المرور باستخدام Argon2id
 */
async function hashPassword(password) {
  try {
    return await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64 MB
      timeCost: 3,
      parallelism: 1,
    });
  } catch (error) {
    console.error("خطأ أثناء تشفير كلمة المرور:", error);
    throw new HttpsError("internal", "حدث خطأ في النظام أثناء تشفير كلمة المرور.");
  }
}

/**
 * دالة للتحقق من مطابقة كلمة المرور مع التشفير
 */
async function verifyPassword(hash, password) {
  try {
    return await argon2.verify(hash, password);
  } catch (error) {
    console.error("خطأ أثناء مطابقة كلمة المرور:", error);
    return false;
  }
}

// =========================================================================
// دوال Cloud Functions المصدرة (Exports)
// =========================================================================

/**
 * 1. دالة إنشاء حساب مستخدم جديد (مقتصرة على مسؤول النظام admin)
 */
exports.createUserAccount = onCall({ region: REGION }, async (request) => {
  // التحقق من أن المنادي يحمل صلاحية "admin"
  await requireAuth(request, ["admin"]);

  const { email, password, displayName, role } = request.data;

  if (!email || !password || !role) {
    throw new HttpsError("invalid-argument", "يرجى تقديم البريد الإلكتروني، كلمة المرور، والدور المطلوب.");
  }

  try {
    // تشفير كلمة المرور بـ Argon2
    const hashedPassword = await hashPassword(password);

    // إنشاء المستخدم في Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: displayName || "",
    });

    // إضافة Role في Custom Claims لتسريع عملية التحقق مستقبلاً
    await auth.setCustomUserClaims(userRecord.uid, { role });

    // حفظ بيانات المستخدم في Firestore
    await db.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      displayName: displayName || "",
      role,
      passwordHash: hashedPassword,
      createdAt: new Date().toISOString(),
    });

    return {
      success: true,
      message: "تم إنشاء حساب المستخدم بنجاح.",
      uid: userRecord.uid,
    };
  } catch (error) {
    console.error("خطأ أثناء إنشاء حساب المستخدم:", error);
    throw new HttpsError("internal", error.message || "فشل في إنشاء حساب المستخدم.");
  }
});

/**
 * 2. دالة جلب بيانات الملف الشخصي للمستخدم الحالي
 */
exports.getUserProfile = onCall({ region: REGION }, async (request) => {
  // يتطلب فقط أن يكون المستخدم مسجلاً لدخوله
  const userAuth = await requireAuth(request);

  const userDoc = await db.collection("users").doc(userAuth.uid).get();

  if (!userDoc.exists) {
    throw new HttpsError("not-found", "لم يتم العثور على بيانات المستخدم.");
  }

  const userData = userDoc.data();
  // إزالة تجزئة كلمة المرور من النتيجة المرجعة لزيادة الأمان
  delete userData.passwordHash;

  return {
    success: true,
    data: userData,
  };
});

/**
 * 3. دالة مجدولة تعمل يومياً في منتصف الليل بتوقيت الكويت للصيانة والتنظيف
 */
exports.dailyMaintenance = onSchedule(
  {
    region: REGION,
    schedule: "0 0 * * *",
    timeZone: "Asia/Kuwait",
  },
  async (event) => {
    console.log("بدء المهمة المجدولة اليومية...");
    try {
      // ضع هنا أي عمليات صيانة دورية أو تنظيف بيانات قديمة
      console.log("تم تنفيذ المهمة المجدولة بنجاح.");
    } catch (error) {
      console.error("حدث خطأ أثناء تنفيذ المهمة المجدولة:", error);
    }
  }
);