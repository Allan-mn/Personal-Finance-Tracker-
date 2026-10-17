// ===== 1. VARIABLES AND DATA TYPES =====
const STORAGE_KEY = "pesatrack-transactions-v2";

const form = document.getElementById("transaction-form");
const descriptionInput = document.getElementById("description");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");
const typeInput = document.getElementById("transaction-type");
const message = document.getElementById("form-message");
const transactionList = document.getElementById("transaction-list");
const recentList = document.getElementById("recent-list");

let activeFilter = "all";
let transactions = loadTransactions();

// Format money in Kenyan shillings.
const moneyFormatter = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function formatMoney(amount) {
  return moneyFormatter.format(amount);
}

function getLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Set today's date.
dateInput.value = getLocalDate();
dateInput.max = getLocalDate();

document.getElementById("today-label").textContent =
  new Intl.DateTimeFormat("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date());

document.getElementById("year").textContent =
  new Date().getFullYear();


// ===== 2. LOCAL STORAGE =====
// No sample transactions. New users start with an empty array.

function loadTransactions() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved === null) {
      return [];
    }

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(transaction =>
      transaction &&
      typeof transaction.id === "string" &&
      ["income", "expense"].includes(transaction.type) &&
      typeof transaction.description === "string" &&
      transaction.description.trim().length > 0 &&
      Number.isFinite(Number(transaction.amount)) &&
      Number(transaction.amount) > 0 &&
      typeof transaction.category === "string" &&
      typeof transaction.date === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(transaction.date)
    ).map(transaction => ({
      ...transaction,
      amount: Number(transaction.amount)
    }));

  } catch (error) {
    console.error("Could not load transactions:", error);
    return [];
  }
}

function saveTransactions() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(transactions)
    );
    return true;
  } catch (error) {
    console.error("Could not save transactions:", error);
    return false;
  }
}


// ===== 3. CALCULATE TOTALS =====

function calculateTotals() {
  let income = 0;
  let expenses = 0;

  for (const transaction of transactions) {
    if (transaction.type === "income") {
      income += transaction.amount;
    } else {
      expenses += transaction.amount;
    }
  }

  return {
    income,
    expenses,
    balance: income - expenses
  };
}


// ===== 4. FORMAT TRANSACTION DETAILS =====

function formatDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);

  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(year, month - 1, day));
}

function categoryIcon(category, type) {
  const icons = {
    Salary: "💼",
    Freelance: "💻",
    Business: "🏪",
    Food: "🍲",
    Transport: "🚌",
    Bills: "🧾",
    Shopping: "🛍️",
    Education: "📚",
    Health: "💊",
    Other: "💰"
  };

  return icons[category] ||
    (type === "income" ? "↗️" : "↘️");
}

function createTransactionItem(transaction, showDelete) {
  const item = document.createElement("li");
  item.className = "transaction-item";

  const icon = document.createElement("span");
  icon.className = "transaction-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = categoryIcon(
    transaction.category,
    transaction.type
  );

  const info = document.createElement("div");
  info.className = "transaction-info";

  const title = document.createElement("h3");
  title.textContent = transaction.description;

  const details = document.createElement("p");
  details.textContent =
    `${transaction.category} · ${formatDate(transaction.date)}`;

  info.append(title, details);

  const right = document.createElement("div");
  right.className = "transaction-right";

  const amount = document.createElement("span");
  amount.className =
    "transaction-amount " +
    (transaction.type === "income" ? "positive" : "negative");

  const sign = transaction.type === "income" ? "+" : "−";
  amount.textContent =
    `${sign} ${formatMoney(transaction.amount)}`;

  right.appendChild(amount);

  if (showDelete) {
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute(
      "aria-label",
      `Delete ${transaction.description}`
    );

    deleteButton.addEventListener("click", () => {
      deleteTransaction(transaction.id);
    });

    right.appendChild(deleteButton);
  }

  item.append(icon, info, right);
  return item;
}


// ===== 5. RENDER DASHBOARD =====

function renderDashboard() {
  const totals = calculateTotals();

  document.getElementById("total-balance").textContent =
    formatMoney(totals.balance);

  document.getElementById("total-income").textContent =
    formatMoney(totals.income);

  document.getElementById("total-expenses").textContent =
    formatMoney(totals.expenses);

  document.getElementById("transaction-count").textContent =
    `${transactions.length} transaction` +
    (transactions.length === 1 ? "" : "s") +
    " recorded";

  renderTransactions();
  renderRecentTransactions();
}

function renderTransactions() {
  transactionList.replaceChildren();

  const filteredTransactions = transactions
    .filter(transaction =>
      activeFilter === "all" ||
      transaction.type === activeFilter
    )
    .slice()
    .sort((a, b) =>
      b.date.localeCompare(a.date) ||
      b.id.localeCompare(a.id)
    );

  if (filteredTransactions.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "empty-state";

    const title = document.createElement("h3");
    title.textContent = transactions.length === 0
      ? "No transactions yet"
      : "No transactions found";

    const description = document.createElement("p");
    description.textContent = transactions.length === 0
      ? "Add your first transaction using the form."
      : "Try another filter to see your transactions.";

    emptyItem.append(title, description);
    transactionList.appendChild(emptyItem);
    return;
  }

  filteredTransactions.forEach(transaction => {
    transactionList.appendChild(
      createTransactionItem(transaction, true)
    );
  });
}

function renderRecentTransactions() {
  recentList.replaceChildren();

  const recent = transactions
    .slice()
    .sort((a, b) =>
      b.date.localeCompare(a.date) ||
      b.id.localeCompare(a.id)
    )
    .slice(0, 4);

  if (recent.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "empty-state";
    emptyItem.textContent =
      "Your recent activity will appear here.";

    recentList.appendChild(emptyItem);
    return;
  }

  recent.forEach(transaction => {
    recentList.appendChild(
      createTransactionItem(transaction, false)
    );
  });
}


// ===== 6. SELECT INCOME OR EXPENSE =====

const typeButtons = document.querySelectorAll(".type-option");

function setSelectedType(type) {
  typeInput.value = type;

  typeButtons.forEach(button => {
    const selected = button.dataset.type === type;

    button.classList.toggle("active", selected);
    button.classList.toggle(
      "income",
      selected && type === "income"
    );
    button.classList.toggle(
      "expense",
      selected && type === "expense"
    );

    button.setAttribute("aria-pressed", String(selected));
  });
}

typeButtons.forEach(button => {
  button.addEventListener("click", () => {
    const selectedType = button.dataset.type;

    setSelectedType(selectedType);

    categoryInput.value =
      selectedType === "income" ? "Salary" : "Food";

    message.textContent = "";
  });
});


// ===== 7. ADD A TRANSACTION =====

form.addEventListener("submit", function(event) {
  event.preventDefault();

  const description = descriptionInput.value.trim();
  const amount = Number(amountInput.value);
  const category = categoryInput.value;
  const date = dateInput.value;
  const type = typeInput.value;

  if (!description) {
    message.textContent = "Please enter a description.";
    message.className = "form-message negative";
    descriptionInput.focus();
    return;
  }

  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 1000000000000
  ) {
    message.textContent = "Enter a valid positive amount.";
    message.className = "form-message negative";
    amountInput.focus();
    return;
  }

  if (!["income", "expense"].includes(type)) {
    message.textContent = "Please select a transaction type.";
    message.className = "form-message negative";
    return;
  }

  if (!category) {
    message.textContent = "Please select a category.";
    message.className = "form-message negative";
    categoryInput.focus();
    return;
  }

  if (!date || date > getLocalDate()) {
    message.textContent =
      "Choose a valid date that is not in the future.";
    message.className = "form-message negative";
    dateInput.focus();
    return;
  }

  const transaction = {
    id: typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,
    type,
    description,
    amount: Math.round((amount + Number.EPSILON) * 100) / 100,
    category,
    date
  };

  transactions.push(transaction);

  const saved = saveTransactions();

  activeFilter = "all";
  updateFilterButtons();
  renderDashboard();

  form.reset();
  dateInput.value = getLocalDate();
  setSelectedType("income");
  categoryInput.value = "Salary";

  message.textContent = saved
    ? "Transaction added successfully!"
    : "Added for this session, but browser storage failed.";

  message.className = saved
    ? "form-message positive"
    : "form-message negative";
});


// ===== 8. DELETE A TRANSACTION =====

function deleteTransaction(id) {
  const transaction = transactions.find(item => item.id === id);

  if (!transaction) return;

  const confirmed = window.confirm(
    `Delete "${transaction.description}"?`
  );

  if (!confirmed) return;

  transactions = transactions.filter(item => item.id !== id);

  const saved = saveTransactions();
  renderDashboard();

  message.textContent = saved
    ? "Transaction deleted."
    : "Deleted for this session, but browser storage failed.";

  message.className = saved
    ? "form-message positive"
    : "form-message negative";
}


// ===== 9. FILTER TRANSACTIONS =====

const filterButtons = document.querySelectorAll(".filter-button");

function updateFilterButtons() {
  filterButtons.forEach(button => {
    const selected = button.dataset.filter === activeFilter;

    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

filterButtons.forEach(button => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;

    updateFilterButtons();
    renderTransactions();
  });
});


// ===== 10. START THE APPLICATION =====
// No sample transactions are added.
// New users start at KES 0.00.

renderDashboard();