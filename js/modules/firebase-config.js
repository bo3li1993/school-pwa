// 🔐 المحرك المركزي الموحد والشامل لقاعدة البيانات ونظام الحماية العالمي لقوقل
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

export const firebaseConfig = {
    apiKey: "AIzaSyDEA77qGfSK7w5rYynyzP9-mvD13rRT0tU",
    authDomain: "hosainan-school.firebaseapp.com",
    projectId: "hosainan-school",
    storageBucket: "hosainan-school.firebasestorage.app",
    messagingSenderId: "264264994076",
    appId: "1:264264994076:web:1a87730b7d3c684bdf3ed9"
};

// تشغيل وتأمين الاتصال بدون تكرار
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
export const auth = getAuth(app); // تصدير محرك الأمان الرسمي للمنظومة