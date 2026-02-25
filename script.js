const MEALS = ["Breakfast", "Lunch", "Snack", "Dinner"];
const STORAGE_KEY = "dailyMealTracker";

function init() {
  const dateInput = document.getElementById("date");
  if (dateInput && !dateInput.value) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    dateInput.value = `${yyyy}-${mm}-${dd}`;
  }

  const addRowBtn = document.getElementById("add-row-btn");
  addRowBtn?.addEventListener("click", () => {
    addRow();
    recalcTotals();
  });

  const historyBtn = document.getElementById("history-btn");
  historyBtn?.addEventListener("click", () => {
    openHistory();
  });

  const closeHistoryBtn = document.getElementById("close-history-btn");
  closeHistoryBtn?.addEventListener("click", () => {
    closeHistory();
  });

  const historyBackdrop = document.getElementById("history-modal-backdrop");
  historyBackdrop?.addEventListener("click", () => {
    closeHistory();
  });

  // Save automatically when the user leaves or reloads the page
  window.addEventListener("beforeunload", () => {
    const entries = getEntriesFromDOM();
    saveCurrentDay(entries);
  });

  if (dateInput) {
    dateInput.addEventListener("change", () => {
      loadDay(dateInput.value);
    });
    loadDay(dateInput.value);
  } else {
    // Fallback: create default rows if no date input is found
    addRow("Breakfast");
    addRow("Breakfast");
    addRow("Lunch");
    addRow("Snack");
    addRow("Dinner");
    recalcTotals();
  }
}

function createMealSelect(initialMeal) {
  const select = document.createElement("select");
  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = "-- select --";
  select.appendChild(emptyOption);

  MEALS.forEach(meal => {
    const opt = document.createElement("option");
    opt.value = meal;
    opt.textContent = meal;
    if (meal === initialMeal) opt.selected = true;
    select.appendChild(opt);
  });

  select.addEventListener("change", recalcTotals);
  return select;
}

function addRow(meal = "", calories = "", protein = "") {
  const tbody = document.getElementById("entries-body");
  if (!tbody) return;

  const tr = document.createElement("tr");

  // Meal type
  const mealTd = document.createElement("td");
  const mealSelect = createMealSelect(meal);
  mealTd.appendChild(mealSelect);

  // Calories
  const calTd = document.createElement("td");
  const calInput = document.createElement("input");
  calInput.type = "number";
  calInput.min = "0";
  calInput.step = "10";
  calInput.placeholder = "e.g. 250";
   if (calories !== "") {
    calInput.value = String(calories);
  }
  calInput.addEventListener("input", recalcTotals);
  calTd.appendChild(calInput);

  // Protein
  const proteinTd = document.createElement("td");
  const proteinInput = document.createElement("input");
  proteinInput.type = "number";
  proteinInput.min = "0";
  proteinInput.step = "0.5";
  proteinInput.placeholder = "e.g. 10";
  if (protein !== "") {
    proteinInput.value = String(protein);
  }
  proteinInput.addEventListener("input", recalcTotals);
  proteinTd.appendChild(proteinInput);

  // Delete button
  const delTd = document.createElement("td");
  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.textContent = "×";
  delBtn.className = "delete-btn";
  delBtn.addEventListener("click", () => {
    tr.remove();
    recalcTotals();
  });
  delTd.appendChild(delBtn);

  tr.appendChild(mealTd);
  tr.appendChild(calTd);
  tr.appendChild(proteinTd);
  tr.appendChild(delTd);

  tbody.appendChild(tr);
}

function recalcTotals() {
  const entries = getEntriesFromDOM();

  let dailyCalories = 0;
  let dailyProtein = 0;

  const mealTotals = {
    Breakfast: { cal: 0, protein: 0 },
    Lunch: { cal: 0, protein: 0 },
    Snack: { cal: 0, protein: 0 },
    Dinner: { cal: 0, protein: 0 }
  };

  entries.forEach(entry => {
    const meal = entry.meal || "";
    const calories = Number.isFinite(entry.calories) ? entry.calories : 0;
    const protein = Number.isFinite(entry.protein) ? entry.protein : 0;

    if (!calories && !protein) {
      return;
    }

    dailyCalories += calories;
    dailyProtein += protein;

    if (meal && mealTotals[meal]) {
      mealTotals[meal].cal += calories;
      mealTotals[meal].protein += protein;
    }
  });

  // Update meal cards
  setText("breakfast-cal", mealTotals.Breakfast.cal);
  setText("breakfast-protein", mealTotals.Breakfast.protein.toFixed(1));
  setText("lunch-cal", mealTotals.Lunch.cal);
  setText("lunch-protein", mealTotals.Lunch.protein.toFixed(1));
  setText("snack-cal", mealTotals.Snack.cal);
  setText("snack-protein", mealTotals.Snack.protein.toFixed(1));
  setText("dinner-cal", mealTotals.Dinner.cal);
  setText("dinner-protein", mealTotals.Dinner.protein.toFixed(1));

  // Daily totals
  setText("daily-cal", dailyCalories);
  setText("daily-protein", dailyProtein.toFixed(1));

  saveCurrentDay(entries);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = isNaN(value) ? "0" : value;
}

function getEntriesFromDOM() {
  const tbody = document.getElementById("entries-body");
  if (!tbody) return [];

  const rows = Array.from(tbody.querySelectorAll("tr"));
  const entries = [];

  rows.forEach(row => {
    const mealSelect = row.querySelector("td:nth-child(1) select");
    const calInput = row.querySelector("td:nth-child(2) input");
    const proteinInput = row.querySelector("td:nth-child(3) input");

    const meal = mealSelect?.value || "";
    const calories = parseFloat(calInput?.value || "0");
    const protein = parseFloat(proteinInput?.value || "0");

    if (!meal && !calories && !protein) {
      return;
    }

    entries.push({
      meal,
      calories: Number.isNaN(calories) ? 0 : calories,
      protein: Number.isNaN(protein) ? 0 : protein
    });
  });

  return entries;
}

function getCurrentDateValue() {
  const dateInput = document.getElementById("date");
  return dateInput?.value || "";
}

function getAllSavedDays() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
    return {};
  } catch (_e) {
    return {};
  }
}

function saveCurrentDay(entries) {
  const dateValue = getCurrentDateValue();
  if (!dateValue) return;

  const all = getAllSavedDays();
  all[dateValue] = entries || [];

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (_e) {
    // Ignore storage errors (quota, private mode, etc.)
  }
}

function loadDay(dateValue) {
  const tbody = document.getElementById("entries-body");
  if (!tbody) return;

  tbody.innerHTML = "";

  const all = getAllSavedDays();
  const entries = all[dateValue] || [];

  if (!entries.length) {
    // Default rows when no data saved for this date
    addRow("Breakfast");
    addRow("Breakfast");
    addRow("Lunch");
    addRow("Snack");
    addRow("Dinner");
  } else {
    entries.forEach(entry => {
      addRow(entry.meal, entry.calories, entry.protein);
    });
  }

  recalcTotals();
}

function openHistory() {
  const modal = document.getElementById("history-modal");
  if (!modal) return;

  renderHistoryList();
  modal.classList.add("open");
}

function closeHistory() {
  const modal = document.getElementById("history-modal");
  if (!modal) return;

  modal.classList.remove("open");
}

function renderHistoryList() {
  const listEl = document.getElementById("history-list");
  if (!listEl) return;

  const all = getAllSavedDays();
  const dates = Object.keys(all).sort();

  listEl.innerHTML = "";

  if (!dates.length) {
    const li = document.createElement("li");
    li.textContent = "No days saved yet.";
    li.className = "history-empty";
    listEl.appendChild(li);
    return;
  }

  dates.forEach(dateStr => {
    const li = document.createElement("li");
    li.textContent = dateStr;
    li.className = "history-item";
    li.addEventListener("click", () => {
      const dateInput = document.getElementById("date");
      if (dateInput) {
        dateInput.value = dateStr;
      }
      loadDay(dateStr);
      closeHistory();
    });
    listEl.appendChild(li);
  });
}

document.addEventListener("DOMContentLoaded", init);

