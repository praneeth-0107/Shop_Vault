/**
 * admin/dashboard.js — Admin dashboard with summary statistics
 */
document.addEventListener('DOMContentLoaded', () => {
  if (!requireAdmin()) return;
  const user = getUser();
  document.getElementById('adminGreeting').textContent = `Welcome, ${user.name}`;
  loadDashboard();
});

async function loadDashboard() {
  const { ok, data } = await apiGet('/api/admin/dashboard');

  if (!ok) {
    document.getElementById('statsGrid').innerHTML = '<p class="text-danger">Failed to load dashboard data.</p>';
    return;
  }

  const s = data.summary;

  document.getElementById('statsGrid').innerHTML = `
    <div class="stat-card">
      <div class="stat-icon purple">📦</div>
      <div class="stat-info">
        <div class="stat-value">${s.totalProducts}</div>
        <div class="stat-label">Total Products</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon blue">👥</div>
      <div class="stat-info">
        <div class="stat-value">${s.totalCustomers}</div>
        <div class="stat-label">Registered Customers</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon green">🛍️</div>
      <div class="stat-info">
        <div class="stat-value">${s.totalOrders}</div>
        <div class="stat-label">Total Orders</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon pink">💰</div>
      <div class="stat-info">
        <div class="stat-value">${formatCurrency(s.totalRevenue)}</div>
        <div class="stat-label">Total Revenue</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon orange">⏳</div>
      <div class="stat-info">
        <div class="stat-value">${s.pendingOrders}</div>
        <div class="stat-label">Pending Orders</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon red">📉</div>
      <div class="stat-info">
        <div class="stat-value">${s.lowStock}</div>
        <div class="stat-label">Low Stock Items</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon orange">⚠️</div>
      <div class="stat-info">
        <div class="stat-value">${s.expiringProducts}</div>
        <div class="stat-label">Expiring Soon (≤15d)</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon red">❌</div>
      <div class="stat-info">
        <div class="stat-value">${s.expiredProducts}</div>
        <div class="stat-label">Expired Products</div>
      </div>
    </div>
  `;

  // Expiry discount info
  document.getElementById('dashboardExtra').innerHTML = `
    <div class="card" style="grid-column:1/-1;">
      <div class="card-body" style="padding:16px;">
        <h3 class="card-title" style="font-size:14px; margin-bottom:10px;">Auto Expiry Discount</h3>
        <div style="font-size:12px; color:var(--text-secondary); display:flex; flex-direction:column; gap:4px;">
          <div>≤15 & >10 days → <strong style="color:var(--accent-warning)">50% OFF</strong></div>
          <div>≤10 & >5 days → <strong style="color:var(--accent-warm)">70% OFF</strong></div>
          <div>≤5 & >2 days → <strong style="color:var(--accent-danger)">80% OFF</strong></div>
          <div>2 days → <strong style="color:var(--accent-danger)">85% OFF</strong></div>
          <div>1 day → <strong style="color:var(--accent-danger)">90% OFF</strong></div>
        </div>
      </div>
    </div>
  `;
}
