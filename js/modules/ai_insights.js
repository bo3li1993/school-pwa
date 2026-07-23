import { db, getActiveSchoolId, getTodayISO } from '../firebase-config.js';
import { collection, query, where, getDocs }
  from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// ══════════════════════════════════════════════════════
// موديل التقارير الذكية — المنظومة الرقمية
// يستخدم Anthropic Claude API لتحليل بيانات الغياب
// ══════════════════════════════════════════════════════

export async function initAiInsightsModule() {
    const container = document.getElementById('tab-ai-insights');
    if (!container) return;

    container.innerHTML = `
    <style>
        .ai-card{background:var(--white);border:1px solid var(--line);border-radius:14px;padding:22px;margin-bottom:16px}
        .ai-title{font-size:15px;font-weight:900;color:var(--navy);margin-bottom:14px;display:flex;align-items:center;gap:10px;border-bottom:2px solid var(--off);padding-bottom:10px}
        .ai-btn{background:linear-gradient(135deg,var(--navy),#1a4a8a);color:#fff;border:none;padding:11px 24px;border-radius:10px;font-family:'Cairo',sans-serif;font-size:14px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:8px;transition:all .2s}
        .ai-btn:hover{opacity:.9;transform:translateY(-1px)}
        .ai-btn:disabled{opacity:.6;cursor:not-allowed;transform:none}
        .ai-btn.secondary{background:var(--ice);color:var(--navy);border:1px solid var(--line)}
        .ai-result{background:var(--off);border-radius:10px;padding:18px;margin-top:14px;font-size:14px;line-height:1.8;color:var(--text);white-space:pre-line;display:none;border-right:4px solid var(--sky)}
        .ai-result.show{display:block}
        .ai-loading{display:none;text-align:center;padding:24px;color:var(--mid);font-weight:700}
        .ai-loading.show{display:block}
        .ai-dots{display:inline-block;animation:dotAnim 1.4s infinite}
        @keyframes dotAnim{0%,80%,100%{opacity:0}40%{opacity:1}}
        .period-grid{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
        .period-btn{padding:7px 16px;border-radius:20px;border:1.5px solid var(--line);background:var(--white);color:var(--mid);font-family:'Cairo',sans-serif;font-size:12px;font-weight:700;cursor:pointer;transition:all .2s}
        .period-btn.active{background:var(--navy);color:#fff;border-color:var(--navy)}
        .stat-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:10px;margin-bottom:14px}
        .stat-mini{background:var(--off);border-radius:8px;padding:12px;text-align:center}
        .stat-mini .n{font-size:22px;font-weight:900;color:var(--navy)}
        .stat-mini .l{font-size:10px;color:var(--mid);font-weight:700;margin-top:2px}
        .insight-chip{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700;margin:4px;cursor:pointer;border:1.5px solid;transition:all .2s}
        .chip-danger{background:#fef2f2;color:var(--red);border-color:#fecaca}
        .chip-warn{background:#fffbeb;color:#d97706;border-color:#fde68a}
        .chip-info{background:var(--ice);color:var(--sky);border-color:#bae6fd}
        .chip-success{background:#f0fdf4;color:var(--green);border-color:#bbf7d0}
        .insight-chip:hover{opacity:.8}
    </style>

    <!-- هيدر -->
    <div class="ai-card" style="border-top:4px solid var(--sky);background:linear-gradient(135deg,var(--off),var(--white))">
        <div class="ai-title">
            <i class="bi bi-robot" style="color:var(--sky);font-size:18px"></i>
            التقارير الذكية — تحليل بالذكاء الاصطناعي
        </div>
        <p style="font-size:13px;color:var(--mid);margin-bottom:14px;font-weight:600">
            يقوم الذكاء الاصطناعي بتحليل بيانات الغياب والسلوك واستخلاص التوصيات والأنماط المخفية
        </p>

        <!-- اختيار الفترة -->
        <div style="margin-bottom:14px">
            <label style="font-weight:800;font-size:12px;color:var(--mid);display:block;margin-bottom:8px">اختر فترة التحليل:</label>
            <div class="period-grid">
                <button class="period-btn active" onclick="selectPeriod(this,'week')">آخر أسبوع</button>
                <button class="period-btn" onclick="selectPeriod(this,'month')">آخر شهر</button>
                <button class="period-btn" onclick="selectPeriod(this,'semester')">الفصل كاملاً</button>
                <button class="period-btn" onclick="selectPeriod(this,'today')">اليوم فقط</button>
            </div>
        </div>

        <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="ai-btn" id="btn-analyze" onclick="window.runAiAnalysis('general')">
                <i class="bi bi-graph-up-arrow"></i> تحليل شامل للغياب
            </button>
            <button class="ai-btn secondary" id="btn-risks" onclick="window.runAiAnalysis('risks')">
                <i class="bi bi-shield-exclamation"></i> طلاب في خطر
            </button>
            <button class="ai-btn secondary" id="btn-recommendations" onclick="window.runAiAnalysis('recommendations')">
                <i class="bi bi-lightbulb"></i> توصيات للإدارة
            </button>
            <button class="ai-btn secondary" id="btn-patterns" onclick="window.runAiAnalysis('patterns')">
                <i class="bi bi-bezier2"></i> أنماط الغياب
            </button>
        </div>

        <div class="ai-loading" id="ai-loading">
            <div style="font-size:32px;margin-bottom:10px">🤖</div>
            <div>الذكاء الاصطناعي يحلل البيانات<span class="ai-dots">...</span></div>
            <div style="font-size:12px;margin-top:6px;color:#aaa">قد يستغرق بضع ثوانٍ</div>
        </div>

        <div class="ai-result" id="ai-result"></div>
    </div>

    <!-- ملخص سريع -->
    <div class="ai-card">
        <div class="ai-title"><i class="bi bi-lightning-fill" style="color:var(--gold)"></i> ملخص سريع — بدون ذكاء اصطناعي</div>
        <div class="stat-summary" id="quick-stats">⏳ جاري التحميل...</div>
        <div id="quick-chips" style="margin-top:12px"></div>
    </div>

    <!-- جدول الطلاب الأكثر غياباً -->
    <div class="ai-card">
        <div class="ai-title"><i class="bi bi-person-x-fill" style="color:var(--red)"></i> الطلاب الأكثر غياباً</div>
        <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:13px" id="top-absent-table">
                <thead>
                    <tr style="background:var(--off)">
                        <th style="padding:9px 12px;text-align:right;font-weight:800;font-size:12px;color:var(--mid)">#</th>
                        <th style="padding:9px 12px;text-align:right;font-weight:800;font-size:12px;color:var(--mid)">الطالب</th>
                        <th style="padding:9px 12px;text-align:right;font-weight:800;font-size:12px;color:var(--mid)">الفصل</th>
                        <th style="padding:9px 12px;text-align:center;font-weight:800;font-size:12px;color:var(--mid)">أيام الغياب</th>
                        <th style="padding:9px 12px;text-align:center;font-weight:800;font-size:12px;color:var(--mid)">المستوى</th>
                        <th style="padding:9px 12px;text-align:center;font-weight:800;font-size:12px;color:var(--mid)">إجراء</th>
                    </tr>
                </thead>
                <tbody id="top-absent-tbody">
                    <tr><td colspan="6" style="text-align:center;padding:20px;color:var(--mid)">⏳ جاري التحميل...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
    `;

    // تحميل البيانات الأولية
    await loadQuickStats();
    await loadTopAbsentStudents();
}

let selectedPeriod = 'week';

window.selectPeriod = function(btn, period) {
    document.querySelectorAll('.period-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    selectedPeriod = period;
};

// ══ حساب نطاق التاريخ ══
function getDateRange(period) {
    const to   = getTodayISO();
    const from = new Date();
    if(period==='week')     from.setDate(from.getDate()-7);
    else if(period==='month')    from.setMonth(from.getMonth()-1);
    else if(period==='semester') from.setMonth(from.getMonth()-5);
    else { return { from: to, to }; } // today
    return { from: from.toISOString().slice(0,10), to };
}

// ══ جلب بيانات التحليل ══
async function fetchAnalysisData(period) {
    const schoolId = getActiveSchoolId();
    const { from, to } = getDateRange(period);

    const [attSnap, behSnap, clinicSnap] = await Promise.all([
        getDocs(query(collection(db,'attendance'),
            where('schoolId','==',schoolId), where('date','>=',from), where('date','<=',to))),
        getDocs(query(collection(db,'behavior'),
            where('schoolId','==',schoolId), where('date','>=',from), where('date','<=',to))),
        getDocs(query(collection(db,'clinic'),
            where('schoolId','==',schoolId), where('date','>=',from), where('date','<=',to))),
    ]);

    const byStudent = {}, byClass = {}, byDate = {}, byDay = {0:0,1:0,2:0,3:0,4:0};
    let absentCount = 0, lateCount = 0;

    attSnap.forEach(d => {
        const data = d.data();
        if(data.status==='absent') absentCount++;
        else if(data.status==='late') lateCount++;

        const name = data.studentName||data.name||'—';
        const cls  = data.classId||'—';
        if(!byStudent[name]) byStudent[name] = { name, cls, absent:0, late:0 };
        if(data.status==='absent') byStudent[name].absent++;
        else if(data.status==='late') byStudent[name].late++;

        if(!byClass[cls]) byClass[cls] = 0;
        if(data.status==='absent') byClass[cls]++;

        if(data.date) {
            if(!byDate[data.date]) byDate[data.date] = 0;
            if(data.status==='absent') byDate[data.date]++;
            const day = new Date(data.date+'T00:00:00').getDay();
            if(data.status==='absent') byDay[day] = (byDay[day]||0)+1;
        }
    });

    const topStudents = Object.values(byStudent).sort((a,b)=>b.absent-a.absent).slice(0,20);
    const topClasses  = Object.entries(byClass).sort((a,b)=>b[1]-a[1]).slice(0,10);
    const days = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس'];
    const worstDay = Object.entries(byDay).sort((a,b)=>b[1]-a[1])[0];
    const atRisk = topStudents.filter(s=>s.absent>=5).length;
    const studentsNeedWarning = topStudents.filter(s=>s.absent>=3).length;

    return {
        period, from, to, absentCount, lateCount,
        totalDays: Object.keys(byDate).length,
        behaviorCount: behSnap.size,
        clinicCount: clinicSnap.size,
        topStudents,
        topClasses,
        worstDay: worstDay ? `${days[worstDay[0]]} (${worstDay[1]} غياب)` : '—',
        atRisk, studentsNeedWarning,
        avgPerDay: Object.keys(byDate).length > 0
            ? Math.round(absentCount / Object.keys(byDate).length) : 0
    };
}

// ══ تشغيل التحليل الذكي ══
window.runAiAnalysis = async function(type) {
    const resultEl  = document.getElementById('ai-result');
    const loadingEl = document.getElementById('ai-loading');

    resultEl.classList.remove('show');
    loadingEl.classList.add('show');

    // تعطيل الأزرار
    document.querySelectorAll('.ai-btn').forEach(b=>b.disabled=true);

    try {
        const data = await fetchAnalysisData(selectedPeriod);
        const periodLabel = {week:'آخر أسبوع',month:'آخر شهر',semester:'الفصل الدراسي',today:'اليوم'}[selectedPeriod];

        // بناء الـ prompt حسب نوع التحليل
        let prompt = '';

        if(type==='general') {
            prompt = `أنت مستشار تربوي متخصص للمدارس الكويتية. حلّل هذه البيانات وقدّم تقريراً شاملاً باللغة العربية:

**بيانات الغياب — ${periodLabel}:**
- إجمالي حالات الغياب: ${data.absentCount}
- إجمالي حالات التأخير: ${data.lateCount}
- متوسط الغياب اليومي: ${data.avgPerDay} طالب
- أيام العمل في الفترة: ${data.totalDays} يوم
- حوادث سلوكية: ${data.behaviorCount}
- مراجعات العيادة: ${data.clinicCount}
- طلاب في خطر (5+ أيام): ${data.atRisk}
- اليوم الأسوأ غياباً: ${data.worstDay}

**أكثر الفصول غياباً:**
${data.topClasses.map(([c,n],i)=>`${i+1}. ${c}: ${n} غياب`).join('\n')}

**أكثر الطلاب غياباً:**
${data.topStudents.slice(0,10).map((s,i)=>`${i+1}. ${s.name} (${s.cls}): ${s.absent} غياب`).join('\n')}

قدّم: ١) ملخص تنفيذي ٢) أبرز الملاحظات ٣) نقاط القلق ٤) توصيات عملية للإدارة`;

        } else if(type==='risks') {
            prompt = `أنت مستشار تربوي. حدّد الطلاب في خطر وصنّفهم حسب الأولوية:

**الطلاب الأكثر غياباً — ${periodLabel}:**
${data.topStudents.slice(0,15).map((s,i)=>`${i+1}. ${s.name} (${s.cls}): ${s.absent} يوم غياب، ${s.late} تأخير`).join('\n')}

**المعايير الكويتية للإنذار:**
- 3 غيابات: تنبيه
- 5 غيابات: استدعاء ولي الأمر
- 8 غيابات: إنذار رسمي
- 10 غيابات: حرمان من الاختبارات

قدّم: ١) قائمة الطلاب مصنّفة حسب مستوى الخطر ٢) الإجراء المطلوب لكل مستوى ٣) أولويات المتابعة`;

        } else if(type==='recommendations') {
            prompt = `أنت مستشار تربوي متخصص. بناءً على هذه البيانات قدّم توصيات عملية:

**ملخص البيانات — ${periodLabel}:**
- غياب: ${data.absentCount} | تأخير: ${data.lateCount} | متوسط يومي: ${data.avgPerDay}
- أسوأ يوم: ${data.worstDay}
- طلاب يحتاجون تدخلاً: ${data.studentsNeedWarning}
- حوادث سلوكية: ${data.behaviorCount}
- الفصل الأكثر غياباً: ${data.topClasses[0]?.[0]||'—'} (${data.topClasses[0]?.[1]||0} غياب)

قدّم توصيات عملية في: ١) التواصل مع أولياء الأمور ٢) الإجراءات الوقائية ٣) الدعم النفسي والاجتماعي ٤) تحسين بيئة المدرسة ٥) خطة متابعة أسبوعية`;

        } else if(type==='patterns') {
            prompt = `أنت محلل بيانات تربوية. اكتشف الأنماط المخفية في هذه البيانات:

**بيانات الغياب — ${periodLabel}:**
- إجمالي: ${data.absentCount} غياب خلال ${data.totalDays} يوم عمل
- اليوم الأسوأ: ${data.worstDay}
- الفصول المتكررة في الغياب: ${data.topClasses.slice(0,5).map(([c,n])=>`${c}(${n})`).join('، ')}
- الطلاب المتكررون: ${data.topStudents.filter(s=>s.absent>=3).length} طالب بـ 3+ أيام

اكتشف: ١) الأنماط الزمنية (أيام/فترات) ٢) الأنماط الجغرافية (فصول/مراحل) ٣) أنماط الطلاب المتكررين ٤) علاقة الغياب بالسلوك والعيادة ٥) توقعات للأسبوع القادم`;
        }

        // استدعاء Claude API
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'claude-sonnet-4-6',
                max_tokens: 1000,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        const result = await response.json();
        const text = result.content?.[0]?.text || 'لم يتم الحصول على نتيجة';

        loadingEl.classList.remove('show');
        resultEl.textContent = text;
        resultEl.classList.add('show');
        resultEl.scrollIntoView({ behavior:'smooth', block:'nearest' });

    } catch(e) {
        loadingEl.classList.remove('show');
        resultEl.textContent = '❌ تعذر التحليل: ' + e.message;
        resultEl.classList.add('show');
    } finally {
        document.querySelectorAll('.ai-btn').forEach(b=>b.disabled=false);
    }
};

// ══ ملخص سريع ══
async function loadQuickStats() {
    const el = document.getElementById('quick-stats');
    const chips = document.getElementById('quick-chips');
    const schoolId = getActiveSchoolId();
    const todayISO = getTodayISO();

    try {
        const [todayAbs, weekAbs, stuTotal] = await Promise.all([
            getDocs(query(collection(db,'attendance'),
                where('schoolId','==',schoolId), where('date','==',todayISO), where('status','==','absent'))),
            getDocs(query(collection(db,'attendance'),
                where('schoolId','==',schoolId),
                where('date','>=', (() => { const d=new Date(); d.setDate(d.getDate()-7); return d.toISOString().slice(0,10); })()),
                where('status','==','absent'))),
            getDocs(query(collection(db,'students'), where('schoolId','==',schoolId)))
        ]);

        const attendRate = stuTotal.size > 0
            ? Math.round(((stuTotal.size - todayAbs.size) / stuTotal.size) * 100) : 100;

        el.innerHTML = `
            <div class="stat-mini"><div class="n" style="color:var(--red)">${todayAbs.size}</div><div class="l">غياب اليوم</div></div>
            <div class="stat-mini"><div class="n" style="color:var(--sky)">${weekAbs.size}</div><div class="l">غياب الأسبوع</div></div>
            <div class="stat-mini"><div class="n" style="color:var(--green)">${attendRate}%</div><div class="l">نسبة الحضور</div></div>
            <div class="stat-mini"><div class="n" style="color:var(--navy)">${stuTotal.size}</div><div class="l">إجمالي الطلاب</div></div>`;

        // chips ذكية
        const insightChips = [];
        if(todayAbs.size > 20) insightChips.push(`<span class="insight-chip chip-danger">⚠️ غياب مرتفع اليوم: ${todayAbs.size}</span>`);
        if(attendRate >= 95) insightChips.push(`<span class="insight-chip chip-success">🎉 نسبة حضور ممتازة ${attendRate}%</span>`);
        if(attendRate < 85) insightChips.push(`<span class="insight-chip chip-warn">📉 نسبة الحضور أقل من 85%</span>`);
        if(weekAbs.size > todayAbs.size * 5) insightChips.push(`<span class="insight-chip chip-info">📊 الأسبوع أعلى من المتوسط</span>`);

        chips.innerHTML = insightChips.join('') || '<span style="color:var(--mid);font-size:13px;font-weight:700">لا توجد تنبيهات خاصة اليوم ✅</span>';

    } catch(e) { el.innerHTML = '❌ تعذر التحميل'; }
}

// ══ أكثر الطلاب غياباً ══
async function loadTopAbsentStudents() {
    const tbody = document.getElementById('top-absent-tbody');
    const schoolId = getActiveSchoolId();

    try {
        const snap = await getDocs(query(collection(db,'attendance'),
            where('schoolId','==',schoolId), where('status','==','absent')));

        const byStudent = {};
        snap.forEach(d => {
            const data = d.data();
            const name = data.studentName||data.name||'—';
            const cls  = data.classId||'—';
            const phone= data.parentPhone||'';
            const key  = `${name}__${cls}`;
            if(!byStudent[key]) byStudent[key] = { name, cls, phone, count:0 };
            byStudent[key].count++;
        });

        const sorted = Object.values(byStudent).sort((a,b)=>b.count-a.count).slice(0,20);
        if(!sorted.length) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--mid)">لا توجد سجلات غياب</td></tr>';
            return;
        }

        tbody.innerHTML = sorted.map((s,i) => {
            const level = s.count >= 10 ? ['🔴 حرمان','#dc2626']
                : s.count >= 8 ? ['🟠 إنذار رسمي','#ea580c']
                : s.count >= 5 ? ['🟡 استدعاء','#d97706']
                : s.count >= 3 ? ['📢 تنبيه','#6b7280']
                : ['✅ طبيعي','#16a34a'];

            const phone = (s.phone||'').replace(/\D/g,'');
            return `<tr style="border-bottom:1px solid var(--line)">
                <td style="padding:9px 12px;font-weight:800;color:var(--mid)">${i+1}</td>
                <td style="padding:9px 12px;font-weight:700">${s.name}</td>
                <td style="padding:9px 12px">${s.cls}</td>
                <td style="padding:9px 12px;text-align:center;font-weight:900;font-size:16px;color:${s.count>=5?'var(--red)':'var(--navy)'}">${s.count}</td>
                <td style="padding:9px 12px;text-align:center">
                    <span style="color:${level[1]};font-weight:800;font-size:12px">${level[0]}</span>
                </td>
                <td style="padding:9px 12px;text-align:center">
                    ${phone ? `<button onclick="window.sendAbsenceAlert('${s.name}','${s.cls}','${s.count}','${phone}')"
                        style="background:#25d366;color:#fff;border:none;padding:5px 10px;border-radius:6px;
                        font-family:'Cairo',sans-serif;font-size:11px;font-weight:700;cursor:pointer">
                        <i class="bi bi-whatsapp"></i> واتساب
                    </button>` : '<span style="color:#ccc;font-size:11px">لا رقم</span>'}
                </td>
            </tr>`;
        }).join('');

    } catch(e) { tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:red;padding:20px">❌ ${e.message}</td></tr>`; }
}

window.sendAbsenceAlert = function(name, cls, count, phone) {
    const today = new Date().toLocaleDateString('ar-KW',{year:'numeric',month:'long',day:'numeric'});
    const level = count >= 10 ? 'حرمان من الاختبارات' : count >= 8 ? 'إنذار رسمي' : count >= 5 ? 'استدعاء ولي الأمر' : 'تنبيه';
    const msg = encodeURIComponent(
        `السلام عليكم ولي أمر الطالب ${name} — فصل ${cls}،\n` +
        `نُعلمكم بأن ابنكم بلغ عدد غياباته ${count} يوماً حتى تاريخ ${today}.\n` +
        `الإجراء المترتب: ${level}.\n` +
        `يرجى مراجعة إدارة المدرسة.`
    );
    window.open(`https://wa.me/965${phone}?text=${msg}`, '_blank');
};
