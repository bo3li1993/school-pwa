import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, addDoc, query, where, serverTimestamp, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initRoundsModule() {
    const container = document.getElementById('tab-rounds');
    if (!container) return;

    const currentUser = JSON.parse(localStorage.getItem('hs_user') || '{}');

    container.innerHTML = `
    <div class="card" style="border-top:5px solid var(--accent-color); margin-bottom:20px;">
        <h2><i class="bi bi-clipboard-check-fill"></i> توثيق ورصد جولة تفقد الجناح المدرسي اليومية</h2>
        <p style="font-size:12px; color:#666; font-weight:bold; margin-bottom:15px;">نموذج المشرف الإداري لتوثيق استقرار الفصول وحصر النواقص الهندسية والتنظيمية بالأجنحة.</p>
        <form id="wing-round-form" onsubmit="window.handleRegisterWingRoundLive(event)">
            <label style="font-weight:700; font-size:12px;">المشرف المسجِّل للجولة</label>
            <input type="text" id="round-officer-name" value="${currentUser.name || ''}" readonly style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:5px; background:var(--off); color:var(--mid); font-weight:700;">
            <label style="font-weight:700; font-size:12px;">الملاحظة الإدارية (حالة النظافة والاستقرار)</label>
            <input type="text" id="round-wing-notes" placeholder="مثال: الجناح مستقر..." required style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:5px;">
            <button type="submit" style="background:var(--accent-color); width:100%; font-weight:bold; border:none; padding:12px; color:#fff; cursor:pointer; border-radius:5px;"><i class="bi bi-bookmark-plus-fill"></i> تقييد وحفظ الجولة الإدارية</button>
        </form>
    </div>

    <div class="card" style="border-top: 5px solid var(--primary-color);">
        <h2><i class="bi bi-list-columns-reverse"></i> سجل الجولات التفقدية (أرشيف لايف)</h2>
        <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; font-size:13px;">
                <thead><tr style="background:#f4f6f9;"><th style="padding:10px; text-align:right;">المشرف</th><th style="padding:10px; text-align:right;">الملاحظة المرصودة</th></tr></thead>
                <tbody id="wing-rounds-tbody"><tr><td colspan="2" style="text-align:center; padding:15px;">جاري تحميل سجلات الجولات...</td></tr></tbody>
            </table>
        </div>
    </div>`;

    loadWingRoundsLive();
}

window.handleRegisterWingRoundLive = async function(e) {
    e.preventDefault();
    const name = document.getElementById('round-officer-name').value.trim();
    const notes = document.getElementById('round-wing-notes').value.trim();
    const schoolId = getActiveSchoolId(); // 🏢 ربط مركزي سحابي
    
    try {
        await addDoc(collection(db, 'wing_rounds'), {
            schoolId: schoolId, // 🔑 الحماية الأمنية
            officerName: name,
            notes: notes,
            createdAt: serverTimestamp()
        });
        window.showToast('✓ تم التوثيق بنجاح.');
        document.getElementById('round-wing-notes').value = '';
    } catch(err) { window.showToast('خطأ: ' + err.message, 'error'); }
};

function loadWingRoundsLive() {
    const tbody = document.getElementById('wing-rounds-tbody');
    if (!tbody) return;

    const schoolId = getActiveSchoolId();
    const q = query(collection(db, 'wing_rounds'), where('schoolId', '==', schoolId));
    
    onSnapshot(q, (snap) => {
        let html = '';
        snap.forEach(d => {
            const data = d.data();
            html += `<tr><td style="padding:10px; font-weight:bold;">👤 ${data.officerName || '-'}</td><td style="padding:10px; color:#555;">${data.notes || '-'}</td></tr>`;
        });
        tbody.innerHTML = html || '<tr><td colspan="2" style="text-align:center; padding:15px; color:#999;">💡 لا توجد جولات مرصودة لهذا اليوم.</td></tr>';
    }, (err) => {
        console.error("خطأ في جلب الجولات:", err);
    });
}
