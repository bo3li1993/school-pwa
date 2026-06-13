// 1. جلب عناصر نموذج الدخول بالمنظومة
const loginForm = document.getElementById('global-login-form') || document.getElementById('login-form');
const usernameInput = document.getElementById('txt-login-id') || document.getElementById('user-id');
const passwordInput = document.getElementById('txt-login-pass') || document.getElementById('user-pass');
const submitBtn = document.getElementById('btn-submit-action') || document.getElementById('submit-btn');

if (loginForm && usernameInput && passwordInput) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    // 🔒 خط الدفاع الأول: الفحص المبدئي لمنع الخانات الفارغة
    if (username === '' || password === '') {
      alert('⚠️ يرجى إدخال اسم المستخدم وكلمة المرور أولاً.');
      return;
    }

    // 🚀 خط الدفاع الثاني: تشغيل دالة الفحص السحابي والتحقق من ترخيص المدرسة
    if (typeof window.handleGlobalLoginLive === 'function') {
        window.handleGlobalLoginLive(e);
    } else if (typeof window.handleLogin === 'function') {
        window.handleLogin(e);
    } else {
        console.log('تم التحقق المبدئي، بانتظار ربط دالة Firebase لايف.');
    }
  });
}

// 📱 2. محرك تشغيل وتثبيت التطبيق على هواتف الموظفين (PWA Engine)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('🚀 تم تسجيل الـ Service Worker بنجاح بالمنظومة!', reg))
      .catch(err => console.error('❌ فشل تسجيل الـ Service Worker بالسيرفر محلياً:', err));
  });
}