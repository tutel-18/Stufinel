const ALL_CATEGORIES = {
  spend: {
    key: "spend",
    label: "Spend",
    color: "#d39b62",
    description: "Daily needs, transport, food, and small rewards.",
    detail: "Keeps room for class essentials and your day-to-day lifestyle.",
  },
  save: {
    key: "save",
    label: "Save",
    color: "#82b8b1",
    description: "Emergency cushion, short-term goals, and peace of mind.",
    detail: "Builds a cash buffer for school projects, events, or surprises.",
  },
  invest: {
    key: "invest",
    label: "Invest",
    color: "#669f99",
    description: "Future growth, skills, and long-term money habits.",
    detail: "Sets aside part of your allowance for future-focused decisions.",
  },
};

const MODES = {
  basic: {
    key: "basic",
    label: "Student Basic",
    shortLabel: "basic mode",
    description: "Student Basic keeps your plan focused on Spend and Save only.",
    overlayCopy: "Stufinel will unlock your two-part allocation and scroll you here after a short loading animation.",
    categories: ["spend", "save"],
    defaults: { spend: 6, save: 4, invest: 2 },
  },
  pro: {
    key: "pro",
    label: "Student Pro",
    shortLabel: "pro mode",
    description: "Student Pro gives you the full Spend, Save, and Invest allocation.",
    overlayCopy: "Stufinel will unlock your full three-part allocation and scroll you here after a short loading animation.",
    categories: ["spend", "save", "invest"],
    defaults: { spend: 5, save: 3, invest: 2 },
  },
};

const appShell = document.querySelector("#appShell");
const workspace = document.querySelector("#workspace");
const controlColumn = document.querySelector("#controlColumn");
const heroModeLabel = document.querySelector("#heroModeLabel");
const modeDescription = document.querySelector("#modeDescription");
const allowanceInput = document.querySelector("#allowanceInput");
const priorityList = document.querySelector("#priorityList");
const priorityTemplate = document.querySelector("#priorityTemplate");
const allocationGrid = document.querySelector("#allocationGrid");
const allocationTemplate = document.querySelector("#allocationTemplate");
const calculateButton = document.querySelector("#calculateButton");
const calculateStatus = document.querySelector("#calculateStatus");
const resultsSection = document.querySelector("#resultsSection");
const resultsOverlayText = document.querySelector("#resultsOverlayText");
const legendList = document.querySelector("#legendList");
const donutChart = document.querySelector("#donutChart");
const topFocusPercent = document.querySelector("#topFocusPercent");
const totalAllowance = document.querySelector("#totalAllowance");
const headlineTitle = document.querySelector("#headlineTitle");
const headlineText = document.querySelector("#headlineText");
const summaryLine = document.querySelector("#summaryLine");
const statusLine = document.querySelector("#statusLine");
const resetButton = document.querySelector("#resetButton");
const modeButtons = [...document.querySelectorAll(".mode-button[data-mode]")];

const state = {
  mode: "basic",
  allowance: "",
  priorities: { ...MODES.basic.defaults },
  isCalculating: false,
  hasCalculated: false,
  results: null,
  elements: {},
};

function sanitizeMoney(value) {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const [whole = "", ...decimals] = cleaned.split(".");
  const decimal = decimals.join("").slice(0, 2);
  let sanitized = decimals.length > 0 ? `${whole}.${decimal}` : whole;

  if (sanitized.startsWith(".")) {
    sanitized = `0${sanitized}`;
  }

  return sanitized;
}

function toNumber(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value) {
  return `${value.toFixed(1).replace(".0", "")}%`;
}

function formatPriority(value) {
  return `${value}/10`;
}

function getActiveCategories(mode = state.mode) {
  return MODES[mode].categories.map((key) => ALL_CATEGORIES[key]);
}

function getDefaultPriorities(mode) {
  return { ...MODES[mode].defaults };
}

function getModeSummaryText(mode) {
  return MODES[mode].description;
}

function calculatePlan() {
  const categories = getActiveCategories();
  const allowance = toNumber(state.allowance);
  const totalPriority = categories.reduce(
    (sum, category) => sum + toNumber(state.priorities[category.key]),
    0,
  );
  const safeTotal = totalPriority || 1;

  const allocations = categories.map((category, index) => {
    const priority = toNumber(state.priorities[category.key]);
    const percentage = priority / safeTotal * 100;
    const rawAmount = allowance * percentage / 100;
    const roundedAmount =
      index === categories.length - 1
        ? Math.max(
            0,
            allowance -
              categories
                .slice(0, -1)
                .map((item) => {
                  const itemPriority = toNumber(state.priorities[item.key]);
                  return allowance * (itemPriority / safeTotal);
                })
                .reduce((sum, amount) => sum + Number(amount.toFixed(2)), 0),
          )
        : Number(rawAmount.toFixed(2));

    return {
      ...category,
      priority,
      percentage,
      amount: Number(roundedAmount.toFixed(2)),
    };
  });

  const headline = getHeadline(allocations);

  return {
    mode: state.mode,
    modeLabel: MODES[state.mode].label,
    allowance,
    allocations,
    headline,
  };
}

function getHeadline(allocations) {
  const [top, second] = [...allocations].sort((left, right) => right.percentage - left.percentage);
  const gap = second ? top.percentage - second.percentage : top.percentage;

  if (state.mode === "basic") {
    if (gap < 12) {
      return {
        title: "Balanced essentials",
        text: "Your Student Basic plan keeps everyday spending and savings in a healthy balance.",
      };
    }

    if (top.key === "spend") {
      return {
        title: "Spend-forward basic",
        text: "Your current priorities lean more toward present needs, so Stufinel is giving Spend the larger share.",
      };
    }

    return {
      title: "Save-forward basic",
      text: "Your Student Basic plan is protecting more of your allowance for saving goals and unexpected needs.",
    };
  }

  if (gap < 6) {
    return {
      title: "Balanced pro mix",
      text: "Your Student Pro plan is spreading your allowance smoothly across spending, saving, and investing.",
    };
  }

  if (top.key === "spend") {
    return {
      title: "Spend-first momentum",
      text: "Your Student Pro setup currently favors day-to-day use, so more of the allowance is ready for present needs.",
    };
  }

  if (top.key === "save") {
    return {
      title: "Save-first cushion",
      text: "You are pushing more of your allowance toward safety, which helps build a stronger emergency buffer.",
    };
  }

  return {
    title: "Invest-first future",
    text: "Your Student Pro plan leans toward long-term growth, habits, and future-focused decisions.",
  };
}

function updateModeButtons() {
  for (const button of modeButtons) {
    const isActive = button.dataset.mode === state.mode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  }
}

function renderPriorityCards() {
  priorityList.innerHTML = "";
  state.elements = {};

  for (const category of getActiveCategories()) {
    const fragment = priorityTemplate.content.cloneNode(true);
    const priorityCard = fragment.querySelector(".priority-card");
    const priorityTitle = fragment.querySelector(".priority-title");
    const priorityCopy = fragment.querySelector(".priority-copy");
    const priorityScore = fragment.querySelector(".priority-score");
    const priorityInput = fragment.querySelector(".priority-input");

    priorityCard.style.setProperty("--card-accent", category.color);
    priorityCard.style.setProperty("--slider-fill", `${state.priorities[category.key] * 10}%`);
    priorityTitle.textContent = category.label;
    priorityCopy.textContent = category.description;
    priorityScore.textContent = formatPriority(state.priorities[category.key]);
    priorityInput.value = state.priorities[category.key];
    priorityInput.setAttribute("aria-label", `${category.label} priority`);

    priorityInput.addEventListener("input", (event) => {
      state.priorities[category.key] = clamp(Number(event.target.value), 1, 10);
      markInputsDirty();
      syncDraftResults();
    });

    priorityList.append(priorityCard);
    state.elements[category.key] = {
      priorityCard,
      priorityScore,
      priorityInput,
    };
  }
}

function renderAllocationCards() {
  allocationGrid.innerHTML = "";

  for (const category of getActiveCategories()) {
    const fragment = allocationTemplate.content.cloneNode(true);
    const allocationCard = fragment.querySelector(".allocation-card");
    const allocationKicker = fragment.querySelector(".allocation-kicker");
    const allocationTitle = fragment.querySelector(".allocation-title");
    const allocationPercent = fragment.querySelector(".allocation-percent");
    const allocationAmount = fragment.querySelector(".allocation-amount");
    const allocationCopy = fragment.querySelector(".allocation-copy");
    const allocationFill = fragment.querySelector(".allocation-fill");

    allocationCard.style.setProperty("--card-accent", category.color);
    allocationKicker.textContent = "Allocation";
    allocationTitle.textContent = category.label;
    allocationCopy.textContent = category.detail;

    allocationGrid.append(allocationCard);
    Object.assign(state.elements[category.key], {
      allocationCard,
      allocationPercent,
      allocationAmount,
      allocationCopy,
      allocationFill,
    });
  }
}

function renderLegends(allocations) {
  legendList.innerHTML = "";

  for (const allocation of allocations) {
    const item = document.createElement("div");
    item.className = "legend-item";

    const info = document.createElement("div");
    info.className = "legend-info";

    const dot = document.createElement("span");
    dot.className = "legend-dot";
    dot.style.setProperty("--dot-color", allocation.color);

    const name = document.createElement("span");
    name.className = "legend-name";
    name.textContent = allocation.label;

    const value = document.createElement("span");
    value.className = "legend-value";
    value.textContent = formatPercent(allocation.percentage);

    info.append(dot, name);
    item.append(info, value);
    legendList.append(item);
  }
}

function markCardsRefreshing() {
  for (const category of getActiveCategories()) {
    const card = state.elements[category.key]?.allocationCard;
    if (!card) {
      continue;
    }

    card.classList.remove("is-refreshing");
    requestAnimationFrame(() => {
      card.classList.add("is-refreshing");
    });
  }
}

function renderPlan(plan, options = {}) {
  const { animateCards = false, calculated = false } = options;
  const leadingAllocation = [...plan.allocations].sort(
    (left, right) => right.percentage - left.percentage,
  )[0];

  totalAllowance.textContent = formatCurrency(plan.allowance);
  headlineTitle.textContent = plan.headline.title;
  headlineText.textContent = plan.headline.text;
  topFocusPercent.textContent = formatPercent(leadingAllocation.percentage);
  donutChart.style.setProperty("--spend-angle", "0deg");
  donutChart.style.setProperty("--save-angle", "0deg");

  if (plan.allocations[0]) {
    donutChart.style.setProperty("--spend-angle", `${plan.allocations[0].percentage * 3.6}deg`);
  }

  if (plan.allocations[1]) {
    donutChart.style.setProperty(
      "--save-angle",
      `${(plan.allocations[0].percentage + plan.allocations[1].percentage) * 3.6}deg`,
    );
  }

  for (const allocation of plan.allocations) {
    const elements = state.elements[allocation.key];
    const sliderFill = `${clamp(allocation.priority * 10, 10, 100)}%`;

    elements.priorityInput.value = allocation.priority;
    elements.priorityScore.textContent = formatPriority(allocation.priority);
    elements.priorityCard.style.setProperty("--slider-fill", sliderFill);
    elements.allocationPercent.textContent = formatPercent(allocation.percentage);
    elements.allocationAmount.textContent = formatCurrency(allocation.amount);
    elements.allocationCopy.textContent = allocation.detail;
    elements.allocationFill.style.width = `${allocation.percentage}%`;
  }

  renderLegends(plan.allocations);

  if (calculated) {
    summaryLine.textContent = plan.allocations
      .map(
        (allocation) =>
          `${allocation.label} ${formatCurrency(allocation.amount)} (${formatPercent(
            allocation.percentage,
          )})`,
      )
      .join(", ");
  } else {
    summaryLine.textContent = "Screenshot your allocation so you won't forget!";
  }

  if (animateCards) {
    markCardsRefreshing();
  }
}

function setResultsLocked(locked) {
  resultsSection.classList.toggle("is-locked", locked);
  state.hasCalculated = !locked;
}

function setControlsHidden(hidden) {
  workspace.classList.toggle("is-calculated", hidden);
  controlColumn.setAttribute("aria-hidden", hidden ? "true" : "false");
}

function markInputsDirty() {
  setResultsLocked(true);
  state.results = null;
  resultsOverlayText.textContent = MODES[state.mode].overlayCopy;
  calculateStatus.textContent = "Changes detected. Press Calculate Budget to refresh the live allocation.";
  statusLine.textContent = "Inputs changed. Recalculate to refresh your allocation.";
}

function syncDraftResults() {
  const draftPlan = calculatePlan();
  renderPlan(draftPlan, { calculated: false });
}

function applyMode(mode) {
  if (!MODES[mode]) {
    return;
  }

  setControlsHidden(false);
  state.mode = mode;
  state.priorities = getDefaultPriorities(mode);
  appShell.dataset.mode = mode;
  if (heroModeLabel) {
    heroModeLabel.textContent = MODES[mode].shortLabel;
  }
  modeDescription.textContent = getModeSummaryText(mode);
  resultsOverlayText.textContent = MODES[mode].overlayCopy;
  updateModeButtons();
  renderPriorityCards();
  renderAllocationCards();
  markInputsDirty();
  syncDraftResults();
}

function calculateBudget() {
  if (state.isCalculating) {
    return;
  }

  if (toNumber(state.allowance) <= 0) {
    calculateStatus.textContent = "Enter an allowance greater than zero before calculating.";
    statusLine.textContent = "Waiting for a valid allowance amount.";
    return;
  }

  state.isCalculating = true;
  calculateButton.classList.add("is-loading");
  calculateStatus.textContent = "Stufinel is mapping your budget...";

  window.setTimeout(() => {
    const plan = calculatePlan();
    state.results = plan;
    state.isCalculating = false;
    calculateButton.classList.remove("is-loading");
    setResultsLocked(false);
    setControlsHidden(true);
    renderPlan(plan, { animateCards: true, calculated: true });
    calculateStatus.textContent = "Budget calculated. Jumping to your live allocation.";
    statusLine.textContent = "Your latest allocation is ready. Take a screenshot so you won't forget it.";

    document.querySelector("#liveAllocationPanel").scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, 850);
}

allowanceInput.addEventListener("input", (event) => {
  state.allowance = sanitizeMoney(event.target.value);
  allowanceInput.value = state.allowance;
  markInputsDirty();
  syncDraftResults();
});

for (const button of modeButtons) {
  button.addEventListener("click", () => {
    applyMode(button.dataset.mode);
  });
}

calculateButton.addEventListener("click", calculateBudget);

resetButton.addEventListener("click", () => {
  state.allowance = "";
  allowanceInput.value = state.allowance;
  applyMode("basic");
  calculateStatus.textContent = "Plan reset. Adjust the sliders, then calculate again.";
  statusLine.textContent = "Plan reset to Student Basic. Screenshot your next allocation after calculating.";
});

applyMode("basic");
calculateStatus.textContent = "Choose a mode, set priorities, then calculate.";
statusLine.textContent = "Ready to build your allowance plan.";
