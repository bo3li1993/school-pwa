import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getFunctions } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js';
import { getAuth, onAuthStateChanged, signInWithCustomToken } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
export var firebaseConfig = {
    apiKey: "AIzaSyDEA77qGfSK7w5rYynyzP9-mvD13rRT0tU",
    authDomain: "hosainan-school.firebaseapp.com",
    projectId: "hosainan-school",
    storageBucket: "hosainan-school.firebasestorage.app",
    messagingSenderId: "264264994076",
    appId: "1:264264994076:web:1a87730b7d3c684bdf3ed9"
};
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export var db = getFirestore(app);
export var auth = getAuth(app);
export var functions = getFunctions(app, 'me-central1');
export { onAuthStateChanged, signInWithCustomToken };
export var messaging = null;
export function getActiveSchoolId() {
    try {
        var user = JSON.parse(localStorage.getItem('hs_user'));
        return user && user.schoolId ? user.schoolId : null;
    } catch(e) { return null; }
}
export function getTodayISO() {
    var d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
}
export async function getSchoolClasses(db, schoolId) {
    try {
        var classesSnap = await getDocs(query(collection(db, 'classes'), where('schoolId', '==', schoolId)));
        if (!classesSnap.empty) {
            return classesSnap.docs.map(function(d) { return d.data().classId; }).filter(Boolean).sort();
        }
        var studentsSnap = await getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId)));
        var ids = {};
        studentsSnap.docs.forEach(function(d) { var c = d.data().classId; if(c) ids[c] = 1; });
        return Object.keys(ids).sort();
    } catch(e) { return []; }
}
export var safeStorage = {
    get: function(key) { try { return localStorage.getItem(key); } catch(e) { return null; } },
    set: function(key, val) { try { localStorage.setItem(key, val); } catch(e) {} },
    remove: function(key) { try { localStorage.removeItem(key); } catch(e) {} },
    getJson: function(key, def) { try { return JSON.parse(this.get(key) || 'null') || def || null; } catch(e) { return def || null; } },
    setJson: function(key, val) { this.set(key, JSON.stringify(val)); }
};