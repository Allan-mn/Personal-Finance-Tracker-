
    // ===== 1. VARIABLES AND DATA TYPES =====
    const STORAGE_KEY = "pesatrack-transactions-v1";

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

    // Format all money values in Kenyan shillings.
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

    // ===== 2. ARRAYS AND LOCAL STORAGE =====
    // Starter transactions make the dashboard easy to demonstrate.
    // Delete these examples and add your own transactions as needed.
    const sampleTransactions = [
      {
        id: "sample-1",
        type: "income",
        description: "Monthly Salary",
        amount: 80000,
        category: "Salary",
        date: "2026-10-01"
      },
      {
        id: "sample-2",
        type: "expense",
        description: "Food and Groceries",
        amount: 1500,
        category: "Food",
        date: "2026-10-05"
      },
      {
        id: "sample-3",
        type: "expense",
        description: "Transport",
        amount: 2000,
        category: "Transport",
        date: "2026-10-07"
      },
      {
        id: "sample-4",
        type: "income",
        description: "Freelance Project",
        amount: 5000,
        category: "Freelance",
        date: "2026-10-10"
      }
    ];

    function loadTransactions() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (saved === null) {
          return sampleTransactions;
        }

        const parsed = JSON.parse(saved);

        if (!Array.isArray(parsed)) {
          return [];
        }

        // Validate saved records before displaying them.
        return parsed.filter(transaction =>
          transaction &&
          typeof transaction.id === "string" &&
          ["income", "expense"].includes(transaction.type) &&
          typeof transaction.description === "string" &&
          transaction.description.trim().length > 0 &&
          Number.isFinite(transaction.amount) &&
          transaction.amount > 0 &&
          typeof transaction.category === "string" &&
          /^\d{4}-\d{2}-\d{2}$/.test(transaction.date)
        );
      } catch (error) {
        console.error("Could not load saved transactions:", error);
        return [];
      }
    }

    let transactions = loadTransactions();

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

    // ===== 3. CALCULATE FINANCIAL TOTALS =====
    function calculateTotals() {
      let income = 0;
      let expenses = 0;

      // Loop through the array and calculate each total.
      for (const transaction of transactions) {
        if (transaction.type === "income") {
          income += transaction.amount;
        } else if (transaction.type === "expense") {
          expenses += transaction.amount;
        }
      }

      return {
        income: income,
        expenses: expenses,
        balance: income - expenses
      };
    }

    // ===== 4. FORMAT AND CREATE TRANSACTION ITEMS =====
    function formatDate(dateString) {
      const parts = dateString.split("-");

      // Construct a local date to avoid timezone shifting.
      const date = new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2])
      );

      return new Intl.DateTimeFormat("en-KE", {
        day: "numeric",
        month: "short",
        year: "numeric"
      }).format(date);
    }

    function categoryIcon(category, type) {
      const icons = {
        Salary: "💼",
        Freelance: "💻",
        Food: "🍲",
        Transport: "🚌",
        Bills: "🧾",
        Shopping: "🛍️",
        Education: "📚",
        Health: "💊",
        Other: "💰"
      };

      return icons[category] || (type === "income" ? "↗️" : "↘️");
    }

    function createTransactionItem(transaction, showDelete) {
      // Build DOM elements rather than inserting user input as HTML.
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
      amount.textContent = `${sign} ${formatMoney(transaction.amount)}`;

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

        // The click event identifies the transaction to remove.
        deleteButton.addEventListener("click", () => {
          deleteTransaction(transaction.id);
        });

        right.appendChild(deleteButton);
      }

      item.append(icon, info, right);
      return item;
    }

    // ===== 5. RENDER THE DASHBOARD =====
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
        (transactions.length === 1 ? "" : "s") + " recorded";

      renderTransactions();
      renderRecentTransactions();
    }

    function renderTransactions() {
      transactionList.replaceChildren();

      // Conditions apply the selected filter.
      const filteredTransactions = transactions
        .filter(transaction =>
          activeFilter === "all" ||
          transaction.type === activeFilter
        )
        .slice()
        .sort((a, b) =>
          b.date.localeCompare(a.date) || b.id.localeCompare(a.id)
        );

      if (filteredTransactions.length === 0) {
        const emptyItem = document.createElement("li");
        emptyItem.className = "empty-state";

        const icon = document.createElement("div");
        icon.className = "empty-icon";
        icon.textContent = "📝";

        const title = document.createElement("h3");
        title.textContent = "No transactions found";

        const description = document.createElement("p");
        description.textContent = transactions.length === 0
          ? "Add your first transaction using the form."
          : "Try a different filter to see your transactions.";

        emptyItem.append(icon, title, description);
        transactionList.appendChild(emptyItem);
        return;
      }

      // DOM manipulation: add each transaction to the page.
      for (const transaction of filteredTransactions) {
        transactionList.appendChild(
          createTransactionItem(transaction, true)
        );
      }
    }

    function renderRecentTransactions() {
      recentList.replaceChildren();

      const recent = transactions
        .slice()
        .sort((a, b) =>
          b.date.localeCompare(a.date) || b.id.localeCompare(a.id)
        )
        .slice(0, 4);

      if (recent.length === 0) {
        const emptyItem = document.createElement("li");
        emptyItem.className = "empty-state";
        emptyItem.textContent = "Your recent activity will appear here.";
        recentList.appendChild(emptyItem);
        return;
      }

      for (const transaction of recent) {
        recentList.appendChild(
          createTransactionItem(transaction, false)
        );
      }
    }

    // ===== 6. CHOOSE INCOME OR EXPENSE =====
    const typeButtons = document.querySelectorAll(".type-option");

    typeButtons.forEach(button => {
      button.addEventListener("click", () => {
        const selectedType = button.dataset.type;
        typeInput.value = selectedType;

        typeButtons.forEach(option => {
          const selected = option === button;
          option.classList.toggle("active", selected);
          option.classList.toggle(
            "income",
            selected && selectedType === "income"
          );
          option.classList.toggle(
            "expense",
            selected && selectedType === "expense"
          );
          option.setAttribute("aria-pressed", String(selected));
        });

        // Suggest a relevant category for the selected type.
        categoryInput.value =
          selectedType === "income" ? "Salary" : "Food";

        message.textContent = "";
      });
    });

    // ===== 7. ADD A TRANSACTION =====
    form.addEventListener("submit", function(event) {
      // Prevent the browser from refreshing the page.
      event.preventDefault();

      const description = descriptionInput.value.trim();
      const amount = Number(amountInput.value);
      const category = categoryInput.value;
      const date = dateInput.value;
      const type = typeInput.value;

      // Form validation using conditions.
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
        message.textContent = "Choose a valid transaction type.";
        message.className = "form-message negative";
        return;
      }

      if (!date || date > getLocalDate()) {
        message.textContent = "Choose a valid date that is not in the future.";
        message.className = "form-message negative";
        dateInput.focus();
        return;
      }

      const transaction = {
        id: crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`,
        type: type,
        description: description,
        amount: amount,
        category: category,
        date: date
      };

      // Add the object to the transactions array.
      transactions.push(transaction);

      const saved = saveTransactions();

      // Recalculate totals and refresh the visible lists.
      activeFilter = "all";
      updateFilterButtons();
      renderDashboard();

      form.reset();
      typeInput.value = "income";
      dateInput.value = getLocalDate();
      categoryInput.value = "Salary";
      setSelectedType("income");

      message.textContent = saved
        ? "Transaction added successfully!"
        : "Added for this session, but browser storage failed.";
      message.className = saved
        ? "form-message positive"
        : "form-message negative";
    });

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

    // ===== 8. DELETE TRANSACTIONS =====
    function deleteTransaction(id) {
      const transaction = transactions.find(item => item.id === id);

      if (!transaction) {
        return;
      }

      const confirmed = window.confirm(
        `Delete "${transaction.description}"?`
      );

      if (!confirmed) {
        return;
      }

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

    // ===== 10. INITIALIZE THE APPLICATION =====
    // Save the starter examples on the first visit.
    if (localStorage.getItem(STORAGE_KEY) === null) {
      saveTransactions();
    }

    renderDashboard();
  