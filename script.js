// Login Form Validation
const loginForm = document.querySelector('form');
const usernameInput = document.querySelector('input[type="text"]');
const passwordInput = document.querySelector('input[type="password"]');

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (username === '' || password === '') {
    alert('يرجى إدخال اسم المستخدم وكلمة المرور');
    return;
  }

  // Perform login authentication here (e.g., send data to server)
  console.log('تم تسجيل الدخول بنجاح');
  loginForm.reset();
});
