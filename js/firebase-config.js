import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getAuth, signInWithCustomToken, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

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
export { onAuthStateChanged };

// 🔐 استعادة جلسة Custom Token تلقائياً عند تحميل أي صفحة
// (لا نستخدم signInAnonymously لأنه كان يُلغي صلاحيات Custom Token)
const savedToken = localStorage.getItem('hs_custom_token');
if (savedToken && !auth.currentUser) {
    signInWithCustomToken(auth, savedToken).catch(() => {
        localStorage.removeItem('hs_custom_token');
    });
}

export function getActiveSchoolId() {
    try {
        const user = JSON.parse(localStorage.getItem('hs_user'));
        return user?.schoolId || null;
    } catch { return null; }
}

export function getTodayISO() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
}

// ===== Step 4: جلب الفصول الديناميكية (من classes أولاً، fallback لـ students) =====
export async function getSchoolClasses(db, schoolId) {
    try {
        // أولاً: جرّب كولكشن classes (خفيف جداً)
        const { getDocs, query, collection, where } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        const classesSnap = await getDocs(query(collection(db, 'classes'), where('schoolId', '==', schoolId)));
        if (!classesSnap.empty) {
            return classesSnap.docs.map(d => d.data().classId).filter(Boolean).sort((a,b)=>a.localeCompare(b));
        }
        // Fallback: مسح students (أثقل لكن يعمل دائماً)
        const studentsSnap = await getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId)));
        return [...new Set(studentsSnap.docs.map(d => d.data().classId).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
    } catch(e) {
        return [];
    }
}
