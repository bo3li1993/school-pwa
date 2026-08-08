import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, addDoc, query, where, serverTimestamp, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

let _roundsUnsubs = [];
window._cleanupRounds = function() {
    _roundsUnsubs.forEach(fn => { try { fn(); } catch(e) {} });
    _roundsUnsubs = [];
};

export async function initRoundsModule() {
    const container = document.getElementById('tab-rounds');
    if (!container) return;

    const currentUser = JSON.parse(localStorage.getItem('hs_user') || '{}');

    container.innerHTML = `
    <div style="max-width:600px;margin:0 auto;padding:16px">
        <div class="card" style="border-top:5px solid var(--gold)">
            <h2><i class="bi bi-clipboard-check-fill" style="color:var(--gold)"></i> توثيق جولة تفقد الجناح</h2>
            <p style="font-size:12px;color:var(--mid);font-weight:700;margin-bottom:14px">سجّل ملاحظاتك أثناء الجولة التفقدية</p>
            
            <label style="font-weight:700;font-size:12px;display:block;margin-bottom:4px">المشرف</label>
            <input type="text" id="round-officer-name" value="${currentUser.name||''}" readonly style="width:100%;padding:10px;border:1.5px solid var(--line);border-radius:8px;font-size:14px;background:#f8f9fc;margin-bottom:10px">
            
            <label style="font-weight:700;font-size:12px;display:block;margin-bottom:4px">الملاحظة الإدارية</label>
            <textarea id="round-wing-notes" rows="3" placeholder="مثال: الجناح منظم، الحصص منتظمة..." style="width:100%;padding:10px;border:1.5px solid var(--line);border-radius:8px;font-family:'Cairo',sans-serif;font-size:14px;resize:none;margin-bottom:10px"></textarea>
            
            <label style="font-weight:700;font-size:12px;display:block;margin-bottom:4px">إرفاق صورة (اختياري)</label>
            <input type="file" id="round-image" accept="image/*" style="width:100%;padding:8px;border:1.5px dashed var(--line);border-radius:8px;font-family:'Cairo',sans-serif;font-size:13px;margin-bottom:12px">
            
            <button onclick="window.saveWingRound()" style="width:100%;padding:12px;background:var(--navy);color:#fff;border:none;border-radius:10px;font-family:'Cairo',sans-serif;font-weight:800;font-size:14px;cursor:pointer">
                <i class="bi bi-check-circle-fill"></i> حفظ الجولة
            </button>
        </div>

        <div class="card">
            <h2><i class="bi bi-list-columns-reverse" style="color:var(--sky)"></i> سجل الجولات</h2>
            <div id="wing-rounds-list"><div style="text-align:center;padding:20px;color:#aaa;font-weight:700">⏳ جاري التحميل...</div></div>
        </div>
    </div>`;

    loadWingRoundsLive();
}

window.saveWingRound = async function() {
    const name = document.getElementById('round-officer-name').value.trim();
    const notes = document.getElementById('round-wing-notes').value.trim();
    if(!notes) { window.showToast?.('اكتب الملاحظة','warning'); return; }

    const schoolId = getActiveSchoolId();

    try {
        const data = {
            schoolId,
            officerName: name,
            notes: notes,
            createdAt: serverTimestamp()
        };

        // إرفاق صورة
        const fileInput = document.getElementById('round-image');
        if(fileInput && fileInput.files[0]) {
            const file = fileInput.files[0];
            if(file.size > 500000) { window.showToast?.('الصورة كبيرة — أقل من 500KB','warning'); return; }
            const base64 = await new Promise(res => {
                const reader = new FileReader();
                reader.onload = e => res(e.target.result);
                reader.readAsDataURL(file);
            });
            data.imageBase64 = base64;
        }

        await addDoc(collection(db, 'wing_rounds'), data);
        window.showToast?.('✅ تم حفظ الجولة');
        document.getElementById('round-wing-notes').value = '';
        if(fileInput) fileInput.value = '';
    } catch(err) { window.showToast?.('❌ ' + err.message, 'error'); }
};

function loadWingRoundsLive() {
    const list = document.getElementById('wing-rounds-list');
    if (!list) return;

    const schoolId = getActiveSchoolId();
    const q = query(collection(db, 'wing_rounds'), where('schoolId', '==', schoolId));

    const unsub = onSnapshot(q, snap => {
        if(snap.empty) { list.innerHTML = '<div style="text-align:center;padding:20px;color:#aaa;font-weight:700">📭 لا توجد جولات مسجّلة</div>'; return; }

        const rounds = snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0));

        list.innerHTML = rounds.map(r => {
            const time = r.createdAt?.toDate?.();
            const timeStr = time ? time.toLocaleDateString('ar-KW') + ' ' + time.toLocaleTimeString('ar-KW',{hour:'2-digit',minute:'2-digit'}) : '';
            return `<div style="padding:12px;border-bottom:1px solid var(--line)">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                    <span style="font-weight:800;font-size:13px">👤 ${r.officerName||''}</span>
                    <span style="font-size:10px;color:var(--mid)">${timeStr}</span>
                </div>
                <div style="font-size:13px;color:#555;line-height:1.5">${r.notes||''}</div>
                ${r.imageBase64 ? '<img src="'+r.imageBase64+'" style="max-width:100%;max-height:200px;border-radius:8px;margin-top:8px" />' : ''}
            </div>`;
        }).join('');
    });

    _roundsUnsubs.push(unsub);
}
