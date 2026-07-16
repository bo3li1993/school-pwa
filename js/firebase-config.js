import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getAuth, signInWithCustomToken, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getMessaging, getToken } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js';

// 🏢 بيانات الاتصال السحابية للمنظومة الموحدة
export const firebaseConfig = {
    apiKey: "AIzaSyDEA77qGfSK7w5rYynyzP9-mvD13rRT0tU",
    authDomain: "hosainan-school.firebaseapp.com",
    projectId: "hosainan-school",
    storageBucket: "hosainan-school.firebasestorage.app",
    messagingSenderId: "264264994076",
    appId: "1:264264994076:web:1a87730b7d3c684bdf3ed9"
};

// تهيئة التطبيق ومنع التكرار
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
export const auth = getAuth(app);
export { onAuthStateChanged };

// 🔔 تفعيل وتصدير نظام المراسلات الفورية والإشعارات (FCM) للمتصفحات المتوافقة والهواتف
export const messaging = typeof window !== 'undefined' && 'serviceWorker' in navigator ? getMessaging(app) : null;

// 🔐 استعادة جلسة الـ Custom Token تلقائياً فور تحميل أي صفحة بالخلفية لضمان استقرار الصلاحيات
const savedToken = localStorage.getItem('hs_custom_token');
if (savedToken && !auth.currentUser) {
    signInWithCustomToken(auth, savedToken).catch(() => {
        // تصفير التوكن التالف أو المنتهي لحماية أمن النظام
        localStorage.removeItem('hs_custom_token');
    });
}

// 🔑 دالة جلب معرف المدرسة النشطة الحالية من جلسة المستخدم
export function getActiveSchoolId() {
    try {
        const user = JSON.parse(localStorage.getItem('hs_user'));
        return user?.schoolId || null;
    } catch { return null; }
}

// 📅 دالة جلب التاريخ الحالي الموحد للمنظومة بصيغة ISO الثابتة (YYYY-MM-DD)
export function getTodayISO() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
}

// ⚡ موديول جلب الفصول الذكي الموفر للفواتير بنسبة 100% (يعتمد على الكاش الفهرسي)
export async function getSchoolClasses(db, schoolId) {
    try {
        // أولاً: البحث في كولكشن classes الفهرسي الخفيف جداً (يستهلك قراءة واحدة فقط للمدرسة)
        const classesSnap = await getDocs(query(collection(db, 'classes'), where('schoolId', '==', schoolId)));
        if (!classesSnap.empty) {
            return classesSnap.docs.map(d => d.data().classId).filter(Boolean).sort((a, b) => a.localeCompare(b));
        }
        
        // نظام حماية احتياطي (Fallback) في حال عدم تهيئة الفصول: يمسح الطلاب لبناء الكاش لأول مرة فقط
        const studentsSnap = await getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId)));
        return [...new Set(studentsSnap.docs.map(d => d.data().classId).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    } catch (e) {
        console.error("⚠️ خطأ أثناء استدعاء كولكشن الفصول المركزي:", e);
        return [];
    }
}

// ✉️ موديول تفعيل وتحديث توكن الإشعارات الفورية (FCM Token) بحساب المستخدم لايف
export async function requestNotificationPermission(db, schoolId, userId) {
    try {
        if (typeof window === 'undefined' || !('Notification' in window)) {
            console.warn('[FCM] الإشعارات الفورية غير مدعومة في بيئة هذا المتصفح حالياً.');
            return null;
        }

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.warn('[FCM] تم رفض إذن استقبال الإشعارات من قبل المستخدم.');
            return null;
        }

        if (!messaging) {
            console.warn('[FCM] تعذر تهيئة خادم المراسلات الفورية في هذه البيئة.');
            return null;
        }

        // جلب التوكن الفريد للجهاز من خوادم جوجل
        const token = await getToken(messaging, {
            vapidKey: 'YOUR_VAPID_KEY_HERE' // ⚠️ استبدل هذا التوكن بمفتاح الـ VAPID الخاص بك من لوحة تحكم فايربيس لاحقاً لتفعيل الميزة
        });

        if (token) {
            // ربط التوكن وتحديثه بملف المستخدم داخل كولكشن users المركزي مجاناً ولحظياً
            const q = query(collection(db, 'users'), where('userId', '==', userId), where('schoolId', '==', schoolId));
            const snap = await getDocs(q);

            if (!snap.empty) {
                await updateDoc(snap.docs[0].ref, { fcmToken: token });
                console.log('[FCM] تم تحديث وربط توكن الدفع اللحظي بنجاح مع السيرفر الرئيسي.');
            } else {
                console.warn('[FCM] تعذر العثور على وثيقة المعلم/المستخدم لتسجيل التوكن.');
            }
        }
        return token;
    } catch (error) {
        console.error('[FCM Error] فشل إتمام تهيئة توكن الإشعارات المركزية:', error);
        return null;
    }
}