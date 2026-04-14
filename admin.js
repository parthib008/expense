// Admin authentication check
function checkAdminAuth() {
  const isAuth = sessionStorage.getItem("adminAuth");
  if (!isAuth || isAuth !== "true") {
    window.location.href = "login.html";
  }
}

// Storage keys (same as user)
const STORAGE_TRANSACTIONS = "expense_tracker_transactions";
let transactions = [];
let adminChart = null;
let adminView = "overview";

function loadTransactions() {
  const stored = localStorage.getItem(STORAGE_TRANSACTIONS);
  if (stored) {
    transactions = JSON.parse(stored);
  } else {
    transactions = [];
  }
}

function saveToLocal() {
  localStorage.setItem(STORAGE_TRANSACTIONS, JSON.stringify(transactions));
}

function getSystemTotals() {
  let totalIncome = 0, totalExpense = 0;
  transactions.forEach(t => {
    if (t.type === "income") totalIncome += t.amount;
    else totalExpense += t.amount;
  });
  return { totalIncome, totalExpense, balance: totalIncome - totalExpense };
}

function getMonthlySummary() {
  const monthlyMap = new Map();
  transactions.forEach(t => {
    const month = t.date.slice(0, 7);
    if (!monthlyMap.has(month)) monthlyMap.set(month, { income: 0, expense: 0 });
    const data = monthlyMap.get(month);
    if (t.type === "income") data.income += t.amount;
    else data.expense += t.amount;
  });
  return monthlyMap;
}

function renderAdminApp() {
  const container = document.getElementById("adminMainContent");
  if (adminView === "overview") renderOverview(container);
  else if (adminView === "alltransactions") renderAllTransactions(container);
  else if (adminView === "analytics") renderAdminAnalytics(container);
}

function renderOverview(container) {
  const { totalIncome, totalExpense, balance } = getSystemTotals();
  const userCount = new Set(transactions.map(t => t.userId || "default")).size;
  
  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-title">🏦 System Balance</div><div class="stat-amount">$${balance.toFixed(2)}</div></div>
      <div class="stat-card"><div class="stat-title">📊 Total Income (All Users)</div><div class="stat-amount income-color">$${totalIncome.toFixed(2)}</div></div>
      <div class="stat-card"><div class="stat-title">💸 Total Expenses</div><div class="stat-amount expense-color">$${totalExpense.toFixed(2)}</div></div>
      <div class="stat-card"><div class="stat-title">👥 Active Users</div><div class="stat-amount">${userCount}</div></div>
    </div>
    <div class="transactions-list"><h3>📋 Recent System Transactions</h3><div id="adminRecentList"></div></div>
    <div class="chart-container"><h3>📈 Monthly Trend</h3><canvas id="trendChart"></canvas></div>
  `;
  
  const recent = [...transactions].reverse().slice(0, 8);
  document.getElementById("adminRecentList").innerHTML = recent.map(t => renderAdminTransactionRow(t)).join("");
  
  // Monthly trend chart
  const monthlyData = getMonthlySummary();
  const months = Array.from(monthlyData.keys()).sort();
  const incomeData = months.map(m => monthlyData.get(m).income);
  const expenseData = months.map(m => monthlyData.get(m).expense);
  
  if (adminChart) adminChart.destroy();
  const ctx = document.getElementById("trendChart").getContext("2d");
  adminChart = new Chart(ctx, {
    type: 'line',
    data: { labels: months, datasets: [{ label: 'Income', data: incomeData, borderColor: '#10b981', tension: 0.3 }, { label: 'Expense', data: expenseData, borderColor: '#ef4444', tension: 0.3 }] }
  });
  
  attachAdminDeleteEvents();
}

function renderAllTransactions(container) {
  container.innerHTML = `
    <div class="filter-bar"><input type="text" id="adminSearch" placeholder="🔍 Search by description/category"><select id="adminTypeFilter"><option value="">All Types</option><option value="income">Income</option><option value="expense">Expense</option></select></div>
    <div class="transactions-list" id="adminFullList"></div>
  `;
  
  const filterFn = () => renderAdminFullList();
  document.getElementById("adminSearch").addEventListener("input", filterFn);
  document.getElementById("adminTypeFilter").addEventListener("change", filterFn);
  renderAdminFullList();
}

function renderAdminFullList() {
  const search = document.getElementById("adminSearch")?.value.toLowerCase() || "";
  const typeFilter = document.getElementById("adminTypeFilter")?.value || "";
  let filtered = transactions.filter(t => {
    let match = true;
    if (search && !t.description.toLowerCase().includes(search) && !t.category.toLowerCase().includes(search)) match = false;
    if (typeFilter && t.type !== typeFilter) match = false;
    return match;
  });
  const container = document.getElementById("adminFullList");
  if (container) {
    container.innerHTML = `<h3>📋 All User Transactions (${filtered.length})</h3><div id="adminListItems">${filtered.map(t => renderAdminTransactionRow(t)).join('')}</div>`;
  }
  attachAdminDeleteEvents();
}

function renderAdminTransactionRow(t) {
  const amountClass = t.type === "income" ? "amount-income" : "amount-expense";
  const sign = t.type === "income" ? "+" : "-";
  return `<div class="transaction-item" data-id="${t.id}">
    <div class="transaction-info"><span>${t.date}</span><span class="category-badge">${t.category}</span><span>${t.description || ''}</span><span style="font-size:0.7rem; opacity:0.7;">User: default</span></div>
    <div><span class="${amountClass}">${sign}$${t.amount.toFixed(2)}</span>
    <div class="actions"><button class="adminDeleteTx"><i class="fas fa-trash-alt"></i> Delete</button></div></div>
  </div>`;
}

function attachAdminDeleteEvents() {
  document.querySelectorAll(".adminDeleteTx").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const item = btn.closest(".transaction-item");
      const id = parseInt(item.dataset.id);
      if (confirm("Delete this transaction permanently?")) {
        transactions = transactions.filter(t => t.id !== id);
        saveToLocal();
        showToast("Transaction deleted by admin", false);
        renderAdminApp();
      }
    });
  });
}

function renderAdminAnalytics(container) {
  const { totalIncome, totalExpense, balance } = getSystemTotals();
  const categoriesExpense = new Map();
  transactions.filter(t => t.type === "expense").forEach(t => {
    categoriesExpense.set(t.category, (categoriesExpense.get(t.category) || 0) + t.amount);
  });
  
  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-title">📊 System Total Income</div><div class="stat-amount income-color">$${totalIncome.toFixed(2)}</div></div>
      <div class="stat-card"><div class="stat-title">📉 System Total Expenses</div><div class="stat-amount expense-color">$${totalExpense.toFixed(2)}</div></div>
      <div class="stat-card"><div class="stat-title">⚖️ Net Balance</div><div class="stat-amount">$${balance.toFixed(2)}</div></div>
    </div>
    <div class="chart-container"><h3>🥧 Expense Distribution (All Time)</h3><canvas id="adminPieChart"></canvas></div>
    <div class="transactions-list"><h3>📊 Activity Summary</h3><div id="activitySummary">Total transactions: ${transactions.length} | Income tx: ${transactions.filter(t => t.type === "income").length} | Expense tx: ${transactions.filter(t => t.type === "expense").length}</div></div>
  `;
  
  const labels = Array.from(categoriesExpense.keys());
  const values = labels.map(l => categoriesExpense.get(l));
  const ctx = document.getElementById("adminPieChart").getContext("2d");
  if (adminChart) adminChart.destroy();
  adminChart = new Chart(ctx, {
    type: 'pie',
    data: { labels, datasets: [{ data: values, backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec489a', '#06b6d4'] }] }
  });
}

function showToast(msg, isError = false) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.style.background = isError ? "#ef4444" : "#10b981";
  toast.innerText = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

function initAdminNav() {
  document.querySelectorAll("[data-admin-nav]").forEach(item => {
    item.addEventListener("click", () => {
      adminView = item.dataset.adminNav;
      renderAdminApp();
      document.querySelectorAll("[data-admin-nav]").forEach(n => n.classList.remove("active"));
      item.classList.add("active");
    });
  });
  document.getElementById("logoutAdmin")?.addEventListener("click", () => {
    sessionStorage.removeItem("adminAuth");
    window.location.href = "login.html";
  });
}

function initTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "dark") document.body.classList.add("dark");
  document.getElementById("themeToggle").addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
  });
}
// Add this function to admin.js
function resetAllSystemData() {
  if (confirm("⚠️ ADMIN: This will delete ALL transactions for ALL users! This cannot be undone. Type 'SYSTEM RESET' to confirm:")) {
    const confirmation = prompt("Type 'SYSTEM RESET' to confirm:");
    if (confirmation === "SYSTEM RESET") {
      transactions = [];
      saveToLocal();
      showToast("SYSTEM RESET: All transactions have been removed!");
      renderAdminApp();
    } else {
      showToast("Reset cancelled - incorrect confirmation text", true);
    }
  }
}

// Add a reset button in renderOverview function
// Add this to the stats-grid area or as a separate button

// Initialize
checkAdminAuth();
loadTransactions();
initAdminNav();
initTheme();
renderAdminApp();