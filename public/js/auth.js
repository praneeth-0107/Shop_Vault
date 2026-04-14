/**
 * auth.js — Login, Registration, and OTP-based Forgot Password handling
 */

// Store email and reset token across steps
let forgotEmail = '';
let resetToken = '';

document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, redirect
  if (isLoggedIn()) {
    const user = getUser();
    if (user && user.role === 'admin') {
      window.location.href = '/admin';
    } else {
      window.location.href = '/products';
    }
    return;
  }

  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const forgotEmailForm = document.getElementById('forgotEmailForm');
  const otpForm = document.getElementById('otpForm');
  const newPasswordForm = document.getElementById('newPasswordForm');

  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }

  if (forgotEmailForm) {
    forgotEmailForm.addEventListener('submit', handleSendOTP);
  }

  if (otpForm) {
    otpForm.addEventListener('submit', handleVerifyOTP);
  }

  if (newPasswordForm) {
    newPasswordForm.addEventListener('submit', handleResetPassword);
  }
});

// ==========================================
// VIEW TOGGLING
// ==========================================
function hideAll() {
  ['loginView', 'forgotStep1', 'forgotStep2', 'forgotStep3'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
}

function showLoginView() {
  hideAll();
  document.getElementById('loginView').classList.remove('hidden');
}

function showForgotPasswordView() {
  hideAll();
  document.getElementById('forgotStep1').classList.remove('hidden');
}

function showForgotStep1() {
  hideAll();
  document.getElementById('forgotStep1').classList.remove('hidden');
}

function showForgotStep2() {
  hideAll();
  document.getElementById('forgotStep2').classList.remove('hidden');
  document.getElementById('otpEmailDisplay').textContent = forgotEmail;
  document.getElementById('otpInput').value = '';
  document.getElementById('otpInput').focus();
}

function showForgotStep3() {
  hideAll();
  document.getElementById('forgotStep3').classList.remove('hidden');
  document.getElementById('newPassword').value = '';
  document.getElementById('confirmPassword').value = '';
  document.getElementById('newPassword').focus();
}

// ==========================================
// LOGIN
// ==========================================
async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.textContent = 'Signing in...';

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  const { ok, data } = await apiPost('/api/auth/login', { email, password });

  if (ok && data.success) {
    setAuth(data.token, data.user);
    showToast(`Welcome back, ${data.user.name}!`, 'success');
    setTimeout(() => {
      if (data.user.role === 'admin') {
        window.location.href = '/admin';
      } else {
        window.location.href = '/products';
      }
    }, 800);
  } else {
    showToast(data.message || 'Login failed.', 'error');
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

// ==========================================
// REGISTER
// ==========================================
async function handleRegister(e) {
  e.preventDefault();
  const btn = document.getElementById('registerBtn');
  btn.disabled = true;
  btn.textContent = 'Creating account...';

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const mobile = document.getElementById('mobile').value.trim();
  const address = document.getElementById('address').value.trim();

  const { ok, data } = await apiPost('/api/auth/register', { name, email, password, mobile, address });

  if (ok && data.success) {
    setAuth(data.token, data.user);
    showToast('Account created successfully! 🎉', 'success');
    setTimeout(() => window.location.href = '/products', 1000);
  } else {
    showToast(data.message || 'Registration failed.', 'error');
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
}

// ==========================================
// FORGOT PASSWORD — Step 1: Send OTP
// ==========================================
async function handleSendOTP(e) {
  e.preventDefault();
  const btn = document.getElementById('sendOtpBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner"></span> Sending OTP...';

  forgotEmail = document.getElementById('forgotEmail').value.trim();

  const { ok, data } = await apiPost('/api/auth/forgot-password', { email: forgotEmail });

  if (ok && data.success) {
    showToast('📧 OTP sent! Check your email.', 'success');
    showForgotStep2();
  } else {
    showToast(data.message || 'Failed to send OTP.', 'error');
  }

  btn.disabled = false;
  btn.innerHTML = '🔐 Send OTP';
}

// Resend OTP
async function resendOTP() {
  showToast('Resending OTP...', 'info');
  const { ok, data } = await apiPost('/api/auth/forgot-password', { email: forgotEmail });
  if (ok && data.success) {
    showToast('📧 New OTP sent! Check your email.', 'success');
  } else {
    showToast(data.message || 'Failed to resend OTP.', 'error');
  }
}

// ==========================================
// FORGOT PASSWORD — Step 2: Verify OTP
// ==========================================
async function handleVerifyOTP(e) {
  e.preventDefault();
  const btn = document.getElementById('verifyOtpBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner"></span> Verifying...';

  const otp = document.getElementById('otpInput').value.trim();

  const { ok, data } = await apiPost('/api/auth/verify-otp', { email: forgotEmail, otp });

  if (ok && data.success) {
    resetToken = data.resetToken;
    showToast('✅ OTP verified!', 'success');
    showForgotStep3();
  } else {
    showToast(data.message || 'Invalid OTP.', 'error');
  }

  btn.disabled = false;
  btn.innerHTML = '✅ Verify OTP';
}

// ==========================================
// FORGOT PASSWORD — Step 3: Reset Password
// ==========================================
async function handleResetPassword(e) {
  e.preventDefault();
  const btn = document.getElementById('resetPasswordBtn');

  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (newPassword !== confirmPassword) {
    showToast('Passwords do not match.', 'error');
    return;
  }

  if (newPassword.length < 6) {
    showToast('Password must be at least 6 characters.', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner"></span> Resetting...';

  const { ok, data } = await apiPost('/api/auth/reset-password', { resetToken, newPassword });

  if (ok && data.success) {
    showToast('🎉 Password reset successfully!', 'success');
    setTimeout(() => {
      showLoginView();
    }, 1500);
  } else {
    showToast(data.message || 'Failed to reset password.', 'error');
  }

  btn.disabled = false;
  btn.innerHTML = '🔑 Reset Password';
}
