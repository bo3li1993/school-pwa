import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

export const firebaseConfig = {
    apiKey: "AIzaSyDEA77qGfSK7w5rYynyzP9-mvD13rRT0tU",
    authDomain: "hosainan-school.firebaseapp.com",
    projectId: "hosainan-school",
    storageBucket: "hosainan-school.firebasestorage.app",
    messagingSenderId: "264264994076",
    appId: "1:264264994076:web:1a87730b7d3c684bdf3ed9"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
export const auth = getAuth(app);

// تفعيل المصادقة المجهولة فور تحميل الملف (لضمان عمل الـ Rules)
signInAnonymously(auth).catch(e => console.error('Anon auth failed:', e));

// جلب schoolId من الجلسة
export function getActiveSchoolId() {
    try {
        const user = JSON.parse(localStorage.getItem('hs_user'));
        return user?.schoolId || null;
    } catch (e) {
        return null;
    }
}

// صيغة التاريخ الموحدة ISO (نعتمد التاريخ المحلي لتجنب أخطاء التوقيت)
export function getTodayISO() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
}
