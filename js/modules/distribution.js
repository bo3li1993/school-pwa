import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, addDoc, getDocs, query, where, onSnapshot, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const ALL_CLASSES = ['6/1','6/2','6/3','6/4','7/1','7/2','7/3','7/4','8/1','8/2','8/3','8/4','9/1','9/2','9/3','9/4'];

export async function initDistributionModule() {
    const container = document.getElementById('tab-coverage');
    if (!container) return;

    container.innerHTML = `
    <div class="card" style="border-top:5px solid var(--success-color);">
        <h2><i class="bi bi-shuffle" style="color:var(--success-color);"></i> محرك تنظيم وتوزيع فصول غرف المنشأة وجدول الاحتياط</h2>
        <p style="font-size:12px; color:#666; font-weight:bold; margin-bottom:15px;">نظام الجدولة الإلكتروني الفوري؛ لربط الفصول وتثبيت معلمات الاحتياط وتوزيع المهام اليومية بغرف المدرسة.</p>
        
        <form id="class-dist-reg-form" onsubmit="window.handleRegisterDistributionLive(event)">
            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:12px;">
                <div>
                    <label style="font-weight:700; font-size:13px;">الفصل المستهدف</label>
                    <select id="dist-class-id" required>
                        <option value="">-- اختر الفصل --</option>
                        ${ALL_CLASSES.map(c => `<option value="${c}">${c}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label style="font-weight:700; font-size:13px;">المعلم الموكل إليه الاحتياط / المهمة</label>
                    <select id="dist-teacher-assign" required>
                        <option value="">⏳ جاري تحميل دليل المعلمين...</option>
                    </select>
                </div>
                <div><label style="font-weight:700; font-size:13px;">الموقع / الغرفة المخصصة</label><input type="text" id="dist-room-id" placeholder="مثال: مختبر الحاسوب 1" required style="width:100%; padding:8px;"></div>
            </div>
            <button type="submit" style="background:var(--success-color); width:100%; font-weight:bold; margin-top:15px; border:none; padding:12px; color:#fff; cursor:pointer; border-radius:8px;"><i class="bi bi-cpu-fill"></i> بث وجدولة أمر التوزيع فورا للمنظومة</button>
        </form>
    </div>

    <div class="card" style="margin-top:14px;">
        <h3 style="font-size:15px;"><i class="bi bi-clock-history"></i> سجل توزيع الاحتياط اليوم</h3>
        <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; font-size:13px; margin-top:8px;">
                <thead><tr style="background:#f4f6f9;">
                    <th style="padding:8px; text-align:right;">الفصل</th>
                    <th style="padding:8px; text-align:right;">المعلم المكلّف</th>
                    <th style="padding:8px; text-align:right;">الموقع/الغرفة</th>
                </tr></thead>
                <tbody id="dist-logs-tbody">
                    <tr><td colspan="3" style="text-align:center; padding:15px; color:#999;">⏳ جاري التحميل...</td></tr>
                </tbody>
            </table>
        </div>
    </div>`;

    loadTeacherDirectoryForDistribution();
    listenToDistributionLogs();
}

async function loadTeacherDirectoryForDistribution() {
    const sel = document.getElementById('dist-teacher-assign');
    try {
        const schoolId = getActiveSchoolId();
        const q = query(collection(db,'users'), where('schoolId','==',schoolId), where('role','==','teacher'));
        const snap = await getDocs(q);
        const names = [];
        snap.forEach(d => { if(d.data().name) names.push(d.data().name.trim()); });
        names.sort((a,b)=>a.localeCompare(b,'ar'));
        if(!names.length) { sel.innerHTML = '<option value="">⚠️ لا يوجد معلمين مسجّلين</option>'; return; }
        sel.innerHTML = '<option value="">-- اختر المعلم --</option>' + names.map(n=>`<option value="${n}">${n}</option>`).join('');
    } catch(e) { sel.innerHTML = '<option value="">❌ خطأ بالتحميل</option>'; }
}

function listenToDistributionLogs() {
    const schoolId = getActiveSchoolId();
    const q = query(collection(db, 'class_distribution'), where('schoolId', '==', schoolId));
    onSnapshot(q, (snap) => {
        const tbody = document.getElementById('dist-logs-tbody');
        if (!tbody) return;
        let html = '';
        const docs = snap.docs.sort((a,b) => (b.data().createdAt?.seconds||0) - (a.data().createdAt?.seconds||0));
        docs.forEach(d => {
            const r = d.data();
            html += `<tr style="border-bottom:1px solid #eee;">
                <td style="padding:8px;"><b>${r.classId || '-'}</b></td>
                <td style="padding:8px;">أ. ${r.teacherName || '-'}</td>
                <td style="padding:8px; color:#666;">${r.roomLocation || '-'}</td>
            </tr>`;
        });
        tbody.innerHTML = html || '<tr><td colspan="3" style="text-align:center; padding:15px; color:#999;">💡 لا يوجد توزيع مسجّل حتى الآن.</td></tr>';
    });
}

window.handleRegisterDistributionLive = async function(e) {
    e.preventDefault();
    const cId = document.getElementById('dist-class-id').value.trim();
    const tName = document.getElementById('dist-teacher-assign').value.trim();
    const room = document.getElementById('dist-room-id').value.trim();
    const schoolId = getActiveSchoolId(); // 🏢 البصمة المدرسية للـ SaaS

    if(!cId || !tName) { window.showToast('⚠️ يرجى اختيار الفصل والمعلم'); return; }
    
    try {
        await addDoc(collection(db, 'class_distribution'), { 
            schoolId: schoolId, // 🔑 عزل البيانات للمدرسة الحالية
            classId: cId, 
            teacherName: tName, 
            roomLocation: room, 
            createdAt: serverTimestamp() 
        });
        window.showToast(`✓ تم بنجاح بث ونشر خطة توزيع الفصل: ${cId}\nالمعلم المكلف بالاحتياط: أ. ${tName}`);
        document.getElementById('class-dist-reg-form').reset();
    } catch(err) { 
        window.showToast('خطأ سحابي: ' + err.message, 'error'); 
    }
};
