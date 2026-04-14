/**
 * app.js — Shared Utilities, Auth Helpers, Header/Nav Component
 * Loaded on every page
 */

const API_BASE = '';

// ==========================================
// AUTH HELPERS
// ==========================================
function getToken() {
  return localStorage.getItem('ecom_token');
}

function getUser() {
  const user = localStorage.getItem('ecom_user');
  return user ? JSON.parse(user) : null;
}

function setAuth(token, user) {
  localStorage.setItem('ecom_token', token);
  localStorage.setItem('ecom_user', JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem('ecom_token');
  localStorage.removeItem('ecom_user');
}

function isLoggedIn() {
  return !!getToken();
}

function isAdmin() {
  const user = getUser();
  return user && user.role === 'admin';
}

function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = '/login';
    return false;
  }
  return true;
}

function requireAdmin() {
  if (!isAdmin()) {
    window.location.href = '/';
    return false;
  }
  return true;
}

// ==========================================
// API HELPERS
// ==========================================
async function apiRequest(url, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };

  try {
    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers
    });

    const data = await response.json();

    if (response.status === 401 || response.status === 403) {
      // Token expired or invalid
      if (url !== '/api/auth/login') {
        clearAuth();
        showToast('Session expired. Please login again.', 'warning');
        setTimeout(() => window.location.href = '/login', 1500);
      }
    }

    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    console.error('API Error:', error);
    return { ok: false, status: 0, data: { success: false, message: 'Network error. Please try again.' } };
  }
}

async function apiGet(url) {
  return apiRequest(url);
}

async function apiPost(url, body) {
  return apiRequest(url, { method: 'POST', body: JSON.stringify(body) });
}

async function apiPut(url, body) {
  return apiRequest(url, { method: 'PUT', body: JSON.stringify(body) });
}

async function apiDelete(url) {
  return apiRequest(url, { method: 'DELETE' });
}

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
function initToastContainer() {
  if (!document.querySelector('.toast-container')) {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
}

function showToast(message, type = 'info') {
  initToastContainer();
  const container = document.querySelector('.toast-container');
  
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type] || ''}</span> <span>${message}</span>`;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

// ==========================================
// FORMAT HELPERS
// ==========================================
function formatCurrency(amount) {
  return '₹' + parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getStatusClass(status) {
  const map = {
    'Pending': 'status-pending',
    'Confirmed': 'status-confirmed',
    'Shipped': 'status-shipped',
    'Delivered': 'status-delivered',
    'Cancelled': 'status-cancelled'
  };
  return map[status] || 'status-pending';
}

// ==========================================
// RENDER HEADER
// ==========================================
function renderHeader() {
  const user = getUser();
  const header = document.getElementById('main-header');
  if (!header) return;

  const isOnAdminPage = window.location.pathname.startsWith('/admin');
  if (isOnAdminPage) return; // Admin pages have their own sidebar

  header.innerHTML = `
    <div class="header-inner">
      <a href="/" class="logo">
        <div class="logo-icon">🛒</div>
        <span>ShopVault</span>
      </a>
      <nav class="nav">
        <div class="nav-links" id="navLinks">
          <a href="/" class="nav-link ${location.pathname === '/' ? 'active' : ''}">Home</a>
          <div class="nav-dropdown" id="categoryDropdown">
            <button class="nav-link nav-dropdown-toggle" id="categoryToggleBtn">
              Categories <span class="dropdown-arrow">▾</span>
            </button>
            <div class="nav-dropdown-menu" id="categoryMenu">
              <div class="dropdown-search">
                <input type="text" class="dropdown-search-input" id="categorySearchInput" placeholder="Search categories..." autocomplete="off">
              </div>
              <div class="dropdown-items" id="categoryItems">
                <div class="dropdown-loading">Loading...</div>
              </div>
            </div>
          </div>
          ${user && user.role === 'admin' ? `<a href="/admin" class="nav-link">Admin Panel</a>` : ''}
        </div>
        <div class="nav-actions">
          ${user ? `
            ${user.role !== 'admin' ? `
            <a href="/cart" class="cart-btn" title="Cart">
              🛒
              <span class="cart-badge" id="cartBadge" style="display:none">0</span>
            </a>
            ` : ''}
            <div class="nav-dropdown profile-dropdown" id="profileDropdown">
              <button class="profile-toggle" id="profileToggleBtn">
                <span class="profile-avatar">${user.name.charAt(0).toUpperCase()}</span>
                <span class="profile-name">${user.name.split(' ')[0]}</span>
                <span class="dropdown-arrow">▾</span>
              </button>
              <div class="nav-dropdown-menu profile-menu" id="profileMenu">
                <div class="profile-header">
                  <div class="profile-avatar-lg">${user.name.charAt(0).toUpperCase()}</div>
                  <div class="profile-info">
                    <div class="profile-info-name">${user.name}</div>
                    <div class="profile-info-email">${user.email || 'No email'}</div>
                    <div class="profile-info-phone">${user.mobile || user.phone || 'No phone'}</div>
                  </div>
                </div>
                <div class="profile-divider"></div>
                ${user.role !== 'admin' ? `<a href="/orders" class="dropdown-item profile-menu-item">📦 My Orders</a>
                <div class="profile-divider"></div>` : ''}
                <button class="dropdown-item profile-menu-item profile-logout" onclick="logout()">🚪 Logout</button>
              </div>
            </div>
          ` : `
            <a href="/login" class="btn btn-secondary btn-sm">Login</a>
            <a href="/register" class="btn btn-primary btn-sm">Register</a>
          `}
          <button class="mobile-menu-btn" onclick="toggleMobileMenu()">☰</button>
        </div>
      </nav>
    </div>
  `;

  // Initialize category dropdown
  initCategoryDropdown();
  // Initialize profile dropdown
  initProfileDropdown();

  // Update cart badge
  if (user && user.role === 'customer') {
    updateCartBadge();
  }

  // Fetch full profile to populate phone number
  if (user) {
    apiGet('/api/auth/profile').then(({ ok, data }) => {
      if (ok && data.user) {
        const phoneEl = document.querySelector('.profile-info-phone');
        if (phoneEl) {
          phoneEl.textContent = data.user.Mobile_No || 'No phone';
        }
        // Also update the profile name with student ID if present
        const nameEl = document.querySelector('.profile-info-name');
        if (nameEl) {
          nameEl.textContent = data.user.Name || user.name;
        }
      }
    });
  }
}

// ==========================================
// PROFILE DROPDOWN
// ==========================================
function initProfileDropdown() {
  const toggle = document.getElementById('profileToggleBtn');
  const dropdown = document.getElementById('profileDropdown');
  if (!toggle || !dropdown) return;

  toggle.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isOpen = dropdown.classList.contains('open');
    closeAllDropdowns();
    if (!isOpen) {
      dropdown.classList.add('open');
    }
  });

  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove('open');
    }
  });
}

// ==========================================
// CATEGORY DROPDOWN
// ==========================================
let categoriesCache = null;

async function fetchCategories() {
  if (categoriesCache) return categoriesCache;
  try {
    const { ok, data } = await apiGet('/api/products/categories');
    if (ok && data.categories) {
      categoriesCache = data.categories;
      return data.categories;
    }
  } catch (e) { /* silent */ }
  return [];
}

function initCategoryDropdown() {
  const toggle = document.getElementById('categoryToggleBtn');
  const menu = document.getElementById('categoryMenu');
  const dropdown = document.getElementById('categoryDropdown');
  if (!toggle || !menu || !dropdown) return;

  // Toggle dropdown on click
  toggle.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isOpen = dropdown.classList.contains('open');
    closeAllDropdowns();
    if (!isOpen) {
      dropdown.classList.add('open');
      const categories = await fetchCategories();
      renderCategoryItems(categories);
      const searchInput = document.getElementById('categorySearchInput');
      if (searchInput) searchInput.focus();
    }
  });

  // Search filter
  const searchInput = document.getElementById('categorySearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', async (e) => {
      const query = e.target.value.toLowerCase().trim();
      const categories = await fetchCategories();
      const filtered = categories.filter(c => c.toLowerCase().includes(query));
      renderCategoryItems(filtered, query);
    });

    // Prevent dropdown close on search click
    searchInput.addEventListener('click', (e) => e.stopPropagation());
  }

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target)) {
      closeAllDropdowns();
    }
  });
}

function renderCategoryItems(categories, searchQuery = '') {
  const container = document.getElementById('categoryItems');
  if (!container) return;

  if (categories.length === 0) {
    container.innerHTML = `<div class="dropdown-empty">No categories found</div>`;
    return;
  }

  container.innerHTML = `
    <a href="/products" class="dropdown-item">🛍️ All Products</a>
    ${categories.map(cat => `
      <a href="/products?category=${encodeURIComponent(cat)}" class="dropdown-item">${cat}</a>
    `).join('')}
  `;
}

function closeAllDropdowns() {
  document.querySelectorAll('.nav-dropdown.open').forEach(d => d.classList.remove('open'));
}

async function updateCartBadge() {
  try {
    const { ok, data } = await apiGet('/api/cart');
    if (ok && data.cart) {
      const badge = document.getElementById('cartBadge');
      if (badge) {
        const count = data.cart.length;
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
      }
    }
  } catch (e) { /* silent */ }
}

function toggleMobileMenu() {
  document.getElementById('navLinks').classList.toggle('open');
}

function logout() {
  clearAuth();
  showToast('Logged out successfully.', 'success');
  setTimeout(() => window.location.href = '/', 800);
}

// ==========================================
// LOADING STATES
// ==========================================
function showLoading(containerId) {
  const el = document.getElementById(containerId);
  if (el) {
    el.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
  }
}

function showEmpty(containerId, icon, title, message, actionHtml = '') {
  const el = document.getElementById(containerId);
  if (el) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="icon">${icon}</div>
        <h3>${title}</h3>
        <p>${message}</p>
        ${actionHtml}
      </div>
    `;
  }
}

// ==========================================
// INIT
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  renderHeader();
  initToastContainer();
});
