// STORAGE KEYS
const STORAGE_TRANSACTIONS = "expense_tracker_transactions";
const STORAGE_BUDGET_LIMITS = "expense_tracker_budgets";

// Default categories
const categories = ["Food", "Transport", "Bills", "Shopping", "Entertainment", "Health", "Other"];

// Global State
let transactions = [];
let categoryBudgets = { Food: 500, Transport: 200, Bills: 300, Shopping: 400, Entertainment: 200, Health: 250, Other: 300 };
let currentChart = null;
let activeView = "dashboard";

// Load data from localStorage
function loadData() {
  const stored = localStorage.getItem(STORAGE_TRANSACTIONS);
  if (stored) {
    transactions = JSON.parse(stored);
  } else {
    // Demo data
    transactions = [
      { id: Date.now() + 1, date: "2026-04-01", category: "Food", amount: 45.5, type: "expense", description: "Groceries" },
      { id: Date.now() + 2, date: "2026-04-02", category: "Salary", amount: 2500, type: "income", description: "Freelance" },
      { id: Date.now() + 3, date: "2026-04-03", category: "Bills", amount: 120, type: "expense", description: "Electricity" },
      { id: Date.now() + 4, date: "2026-04-04", category: "Transport", amount: 15, type: "expense", description: "Bus" }
    ];
    saveToLocal();
  }
  
  const storedBudgets = localStorage.getItem(STORAGE_BUDGET_LIMITS);
  if (storedBudgets) {
    categoryBudgets = JSON.parse(storedBudgets);
  } else {
    saveBudgets();
  }
}

function saveToLocal() {
  localStorage.setItem(STORAGE_TRANSACTIONS, JSON.stringify(transactions));
}

function saveBudgets() {
  localStorage.setItem(STORAGE_BUDGET_LIMITS, JSON.stringify(categoryBudgets));
}

// Toast notification
function showToast(msg, isError = false) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.style.background = isError ? "#ef4444" : "#10b981";
  toast.innerText = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

// Calculate totals
function getTotals() {
  let totalIncome = 0, totalExpense = 0;
  transactions.forEach(t => {
    if (t.type === "income") totalIncome += t.amount;
    else totalExpense += t.amount;
  });
  return { totalIncome, totalExpense, balance: totalIncome - totalExpense };
}

// Monthly expense by category
function getMonthlyExpenseByCategory(monthYear = null) {
  if (!monthYear) {
    const now = new Date();
    monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  const map = new Map();
  categories.forEach(c => map.set(c, 0));
  transactions.filter(t => t.type === "expense" && t.date.startsWith(monthYear)).forEach(t => {
    map.set(t.category, (map.get(t.category) || 0) + t.amount);
  });
  return map;
}

// Check budget warnings
function checkBudgetWarnings() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyExp = getMonthlyExpenseByCategory(currentMonth);
  let warnings = [];
  for (let [cat, spent] of monthlyExp.entries()) {
    let limit = categoryBudgets[cat] || 999999;
    if (spent > limit) {
      warnings.push(`⚠️ ${cat} exceeded budget: $${spent.toFixed(2)} > $${limit}`);
    } else if (spent > limit * 0.8) {
      warnings.push(`⚠️ ${cat} near limit (80%): $${spent.toFixed(2)} / $${limit}`);
    }
  }
  return warnings;
}

// Render functions
function renderApp() {
  const container = document.getElementById("mainContent");
  if (activeView === "dashboard") renderDashboard(container);
  else if (activeView === "transactions") renderTransactionsView(container);
  else if (activeView === "analytics") renderAnalyticsView(container);
}
function renderDashboard(container) {
  const { totalIncome, totalExpense, balance } = getTotals();
  const warnings = checkBudgetWarnings();
  
  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-title">💰 Total Balance</div><div class="stat-amount">$${balance.toFixed(2)}</div></div>
      <div class="stat-card"><div class="stat-title">📈 Total Income</div><div class="stat-amount income-color">$${totalIncome.toFixed(2)}</div></div>
      <div class="stat-card"><div class="stat-title">📉 Total Expenses</div><div class="stat-amount expense-color">$${totalExpense.toFixed(2)}</div></div>
    </div>
    <div class="add-transaction">
      <h3><i class="fas fa-plus-circle"></i> Add Transaction</h3>
      <div class="form-row">
        <input type="date" id="txDate" value="${new Date().toISOString().slice(0, 10)}">
        <select id="txType"><option value="expense">Expense</option><option value="income">Income</option></select>
        <select id="txCategory">${categories.map(c => `<option>${c}</option>`).join('')}<option>Salary</option></select>
        <input type="number" id="txAmount" placeholder="Amount" step="0.01">
        <input type="text" id="txDesc" placeholder="Description (optional)">
        <button id="addBtn"><i class="fas fa-save"></i> Add</button>
      </div>
      ${warnings.length ? `<div class="budget-warning"><i class="fas fa-exclamation-triangle"></i> ${warnings.join(' | ')}</div>` : ''}
    </div>
    <div class="transactions-list"><h3>📋 Recent Transactions</h3><div id="recentList"></div></div>
    <div class="export-buttons">
      <button id="exportCSV"><i class="fas fa-file-csv"></i> Export CSV</button>
      <button id="exportJSON"><i class="fas fa-download"></i> Export JSON</button>
      <button id="resetAllData" style="background: #ef4444;"><i class="fas fa-trash-alt"></i> Reset All Data</button>
    </div>
  `;
  
  const recent = [...transactions].reverse().slice(0, 5);
  document.getElementById("recentList").innerHTML = recent.map(t => renderTransactionRow(t)).join("");
  document.getElementById("addBtn").addEventListener("click", () => addTransactionFromForm());
  document.getElementById("exportCSV").addEventListener("click", exportCSV);
  document.getElementById("exportJSON").addEventListener("click", exportJSON);
  
  // Add reset button listener
  const resetBtn = document.getElementById("resetAllData");
  if (resetBtn) {
    resetBtn.addEventListener("click", resetAllTransactions);
  }
  
  attachDeleteEditEvents();
}

function renderTransactionsView(container) {
  container.innerHTML = `
    <div class="add-transaction"><h3>➕ New Transaction</h3><div class="form-row">
      <input type="date" id="txDate" value="${new Date().toISOString().slice(0, 10)}">
      <select id="txType"><option value="expense">Expense</option><option value="income">Income</option></select>
      <select id="txCategory">${categories.map(c => `<option>${c}</option>`).join('')}<option>Salary</option></select>
      <input type="number" id="txAmount" placeholder="Amount">
      <input type="text" id="txDesc" placeholder="Description">
      <button id="addBtn">Add</button>
    </div></div>
    <div class="filter-bar"><input type="text" id="searchInput" placeholder="🔍 Search description..."><select id="filterCategory"><option value="">All Categories</option>${categories.map(c => `<option>${c}</option>`).join('')}<option>Salary</option></select><input type="month" id="filterMonth"></div>
    <div class="transactions-list" id="fullTransactionList"></div>
  `;
  
  document.getElementById("addBtn").addEventListener("click", addTransactionFromForm);
  const filterInputs = () => renderFullTransactionList();
  document.getElementById("searchInput").addEventListener("input", filterInputs);
  document.getElementById("filterCategory").addEventListener("change", filterInputs);
  document.getElementById("filterMonth").addEventListener("change", filterInputs);
  renderFullTransactionList();
}

function renderFullTransactionList() {
  const search = document.getElementById("searchInput")?.value.toLowerCase() || "";
  const category = document.getElementById("filterCategory")?.value || "";
  const month = document.getElementById("filterMonth")?.value || "";
  
  let filtered = transactions.filter(t => {
    let match = true;
    if (search && !t.description.toLowerCase().includes(search) && !t.category.toLowerCase().includes(search)) match = false;
    if (category && t.category !== category) match = false;
    if (month && !t.date.startsWith(month)) match = false;
    return match;
  });
  
  const container = document.getElementById("fullTransactionList");
  if (container) {
    container.innerHTML = `<h3>📋 All Transactions (${filtered.length})</h3><div id="listItems">${filtered.map(t => renderTransactionRow(t)).join('')}</div>`;
  }
  attachDeleteEditEvents();
}

function renderTransactionRow(t) {
  const amountClass = t.type === "income" ? "amount-income" : "amount-expense";
  const sign = t.type === "income" ? "+" : "-";
  return `<div class="transaction-item" data-id="${t.id}">
    <div class="transaction-info"><span>${t.date}</span><span class="category-badge">${t.category}</span><span>${t.description || ''}</span></div>
    <div><span class="${amountClass}">${sign}$${t.amount.toFixed(2)}</span>
    <div class="actions"><button class="editTx"><i class="fas fa-edit"></i></button><button class="deleteTx"><i class="fas fa-trash"></i></button></div></div>
  </div>`;
}

function attachDeleteEditEvents() {
  document.querySelectorAll(".deleteTx").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const item = btn.closest(".transaction-item");
      const id = parseInt(item.dataset.id);
      deleteTransaction(id);
    });
  });
  document.querySelectorAll(".editTx").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const item = btn.closest(".transaction-item");
      const id = parseInt(item.dataset.id);
      editTransactionById(id);
    });
  });
}

function addTransactionFromForm() {
  const date = document.getElementById("txDate").value;
  let type = document.getElementById("txType").value;
  let category = document.getElementById("txCategory").value;
  const amount = parseFloat(document.getElementById("txAmount").value);
  const description = document.getElementById("txDesc").value || "";
  
  if (!date || isNaN(amount) || amount <= 0) {
    showToast("Invalid amount or date", true);
    return;
  }
  if (type === "expense" && !categories.includes(category) && category !== "Salary") category = "Other";
  
  const newTx = { id: Date.now(), date, category, amount, type, description };
  transactions.push(newTx);
  saveToLocal();
  showToast(`${type === "income" ? "Income" : "Expense"} added successfully`);
  renderApp();
}

function deleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  saveToLocal();
  showToast("Transaction deleted");
  renderApp();
}

function editTransactionById(id) {
  const tx = transactions.find(t => t.id === id);
  if (!tx) return;
  const newAmount = prompt("Edit amount", tx.amount);
  if (newAmount && !isNaN(parseFloat(newAmount))) tx.amount = parseFloat(newAmount);
  const newDesc = prompt("Edit description", tx.description);
  if (newDesc !== null) tx.description = newDesc;
  saveToLocal();
  showToast("Transaction updated");
  renderApp();
}

function renderAnalyticsView(container) {
  const monthlyData = getMonthlyExpenseByCategory();
  const labels = Array.from(monthlyData.keys());
  const values = labels.map(l => monthlyData.get(l));
  const { totalIncome, totalExpense } = getTotals();
  
  container.innerHTML = `
    <div class="chart-container"><h3>📊 Expense by Category (Current Month)</h3><canvas id="categoryChart" width="400" height="250"></canvas></div>
    <div class="transactions-list"><h3>Monthly Summary</h3><div id="monthlySummary"></div></div>
  `;
  
  if (currentChart) currentChart.destroy();
  const ctx = document.getElementById("categoryChart").getContext("2d");
  currentChart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: values, backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec489a', '#06b6d4'] }] }
  });
  
  const summaryDiv = document.getElementById("monthlySummary");
  summaryDiv.innerHTML = `<p>💰 Total Income this month: $${totalIncome.toFixed(2)}</p><p>💸 Expenses: $${totalExpense.toFixed(2)}</p><p>💎 Savings: $${(totalIncome - totalExpense).toFixed(2)}</p>`;
}

function exportCSV() {
  let csvRows = [["ID", "Date", "Category", "Type", "Amount", "Description"]];
  transactions.forEach(t => {
    csvRows.push([t.id, t.date, t.category, t.type, t.amount, t.description]);
  });
  const csv = csvRows.map(row => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "transactions.csv";
  a.click();
  showToast("CSV exported");
}

function exportJSON() {
  const dataStr = JSON.stringify(transactions, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "transactions.json";
  a.click();
  showToast("JSON exported");
}

// Navigation
function initNav() {
  document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", (e) => {
      const nav = item.dataset.nav;
      if (nav === "dashboard") activeView = "dashboard";
      else if (nav === "transactions") activeView = "transactions";
      else if (nav === "analytics") activeView = "analytics";
      else if (item.id === "adminPanelBtn") {
        const pwd = prompt("Admin Login: Enter password");
        if (pwd === "admin123") {
          sessionStorage.setItem("adminAuth", "true");
          window.location.href = "admin.html";
        } else {
          showToast("Invalid credentials", true);
        }
        return;
      }
      renderApp();
      document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
      item.classList.add("active");
    });
  });
}

// Theme
function initTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "dark") document.body.classList.add("dark");
  document.getElementById("themeToggle").addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
  });
}
// Add this function to clear all transactions
function resetAllTransactions() {
  if (confirm("⚠️ WARNING: This will delete ALL your transactions permanently! Are you sure?")) {
    const doubleConfirm = confirm("This action cannot be undone. Type 'RESET' to confirm:");
    if (doubleConfirm === "RESET") {
      transactions = [];
      saveToLocal();
      showToast("All transactions have been removed. Starting fresh!");
      renderApp(); // Refresh the UI
    } else {
      showToast("Reset cancelled - you need to type RESET to confirm", true);
    }
  }
}

// Add this inside your renderDashboard function (after adding export buttons)
// Look for the export-buttons div and add the reset button there
// Or add this event listener in your init function:

// Add this to your initialization code (at the bottom of script.js)
function addResetButtonListener() {
  const resetBtn = document.getElementById("resetAllData");
  if (resetBtn) {
    resetBtn.addEventListener("click", resetAllTransactions);
  }
}

// Call this after renderApp() or in the main initialization
// Modify your renderDashboard function to include the reset button

// Initialize
loadData();
initNav();
initTheme();
renderApp();