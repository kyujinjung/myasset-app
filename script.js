const STORAGE_KEY = "asset-manager-state";
const ASSET_AVAILABILITY = {
  long: "장기",
  short: "단기",
  immediate: "즉시",
};
const ASSET_COLORS = [
  "#0b7a5a",
  "#3858d6",
  "#d58b13",
  "#b8453e",
  "#7c4dff",
  "#0f8ea8",
  "#6f7d1b",
  "#c45086",
];
const AVAILABILITY_COLORS = {
  long: "#3858d6",
  short: "#d58b13",
  immediate: "#0b7a5a",
};

const state = loadState();
const editing = {
  collection: null,
  id: null,
};

const elements = {
  assetForm: document.querySelector("#assetForm"),
  debtForm: document.querySelector("#debtForm"),
  amountInputs: document.querySelectorAll('input[name="amount"]'),
  assetDialog: document.querySelector("#assetDialog"),
  debtDialog: document.querySelector("#debtDialog"),
  settingsDialog: document.querySelector("#settingsDialog"),
  overviewPage: document.querySelector("#overviewPage"),
  allocationPage: document.querySelector("#allocationPage"),
  openAssetDialog: document.querySelector("#openAssetDialog"),
  openDebtDialog: document.querySelector("#openDebtDialog"),
  openSettingsDialog: document.querySelector("#openSettingsDialog"),
  toggleAllocationPage: document.querySelector("#toggleAllocationPage"),
  assetList: document.querySelector("#assetList"),
  debtList: document.querySelector("#debtList"),
  assetPieChart: document.querySelector("#assetPieChart"),
  pieCenterLabel: document.querySelector("#pieCenterLabel"),
  allocationTotal: document.querySelector("#allocationTotal"),
  allocationList: document.querySelector("#allocationList"),
  availabilityPieChart: document.querySelector("#availabilityPieChart"),
  availabilityPieCenterLabel: document.querySelector("#availabilityPieCenterLabel"),
  availabilityAllocationTotal: document.querySelector("#availabilityAllocationTotal"),
  availabilityAllocationList: document.querySelector("#availabilityAllocationList"),
  assetCount: document.querySelector("#assetCount"),
  debtCount: document.querySelector("#debtCount"),
  totalAssets: document.querySelector("#totalAssets"),
  totalDebts: document.querySelector("#totalDebts"),
  netWorth: document.querySelector("#netWorth"),
  longTermAssets: document.querySelector("#longTermAssets"),
  shortTermAssets: document.querySelector("#shortTermAssets"),
  immediateAssets: document.querySelector("#immediateAssets"),
  hideAmountsToggle: document.querySelector("#hideAmountsToggle"),
  darkModeToggle: document.querySelector("#darkModeToggle"),
  resetButton: document.querySelector("#resetButton"),
  template: document.querySelector("#itemTemplate"),
};

applyTheme();
elements.hideAmountsToggle.checked = state.hideAmounts;
elements.darkModeToggle.checked = state.darkMode;

elements.amountInputs.forEach((input) => {
  input.addEventListener("input", () => {
    input.value = formatInputAmount(input.value);
  });
});

elements.openAssetDialog.addEventListener("click", () => {
  openCreateDialog("assets");
});

elements.openDebtDialog.addEventListener("click", () => {
  openCreateDialog("debts");
});

elements.openSettingsDialog.addEventListener("click", () => {
  openDialog(elements.settingsDialog);
});

elements.toggleAllocationPage.addEventListener("click", () => {
  state.activePage = state.activePage === "allocation" ? "overview" : "allocation";
  persist();
  render();
});

document.querySelectorAll("[data-close-dialog]").forEach((button) => {
  button.addEventListener("click", () => {
    closeDialog(button.closest("dialog"));
  });
});

[elements.assetDialog, elements.debtDialog, elements.settingsDialog].forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      closeDialog(dialog);
    }
  });

  dialog.addEventListener("close", () => {
    const form = dialog.querySelector("form");
    if (form) {
      form.reset();
    }
  });
});

elements.assetForm.addEventListener("submit", (event) => {
  event.preventDefault();
  saveEntry("assets", elements.assetForm, elements.assetDialog);
});

elements.debtForm.addEventListener("submit", (event) => {
  event.preventDefault();
  saveEntry("debts", elements.debtForm, elements.debtDialog);
});

elements.resetButton.addEventListener("click", () => {
  if (!state.assets.length && !state.debts.length) return;

  const confirmed = window.confirm("모든 자산과 부채 데이터를 삭제할까요?");
  if (!confirmed) return;

  state.assets = [];
  state.debts = [];
  persist();
  render();
});

elements.hideAmountsToggle.addEventListener("change", () => {
  state.hideAmounts = elements.hideAmountsToggle.checked;
  persist();
  render();
});

elements.darkModeToggle.addEventListener("change", () => {
  state.darkMode = elements.darkModeToggle.checked;
  persist();
  applyTheme();
});

function openCreateDialog(collection) {
  editing.collection = null;
  editing.id = null;

  const dialog = getDialog(collection);
  const form = getForm(collection);
  form.reset();
  setDialogMode(collection, "create");
  openDialog(dialog);
}

function openEditDialog(collection, id) {
  const item = state[collection].find((entry) => entry.id === id);
  if (!item) return;

  editing.collection = collection;
  editing.id = id;

  const dialog = getDialog(collection);
  const form = getForm(collection);
  form.elements.name.value = item.name;
  form.elements.amount.value = formatInputAmount(item.amount);
  form.elements.type.value = item.type;
  if (collection === "assets") {
    form.elements.availability.value = getAssetAvailability(item.availability);
  }
  setDialogMode(collection, "edit");
  openDialog(dialog);
}

function openDialog(dialog) {
  dialog.showModal();
  const focusTarget = dialog.querySelector("input, button, select");
  if (focusTarget) {
    focusTarget.focus();
  }
}

function closeDialog(dialog) {
  dialog.close();
}

function saveEntry(collection, form, dialog) {
  const data = new FormData(form);
  const name = String(data.get("name") || "").trim();
  const amount = parseInputAmount(data.get("amount"));
  const type = String(data.get("type") || "기타");
  const availability = getAssetAvailability(data.get("availability"));

  if (!name || !Number.isFinite(amount) || amount <= 0) return;

  if (editing.collection === collection && editing.id) {
    const item = state[collection].find((entry) => entry.id === editing.id);
    if (item) {
      item.name = name;
      item.amount = amount;
      item.type = type;
      if (collection === "assets") {
        item.availability = availability;
      }
    }
  } else {
    const entry = {
      id: createId(),
      name,
      amount,
      type,
    };

    if (collection === "assets") {
      entry.availability = availability;
    }

    state[collection].push(entry);
  }

  persist();
  form.reset();
  editing.collection = null;
  editing.id = null;
  closeDialog(dialog);
  render();
}

function deleteEntry(collection, id) {
  state[collection] = state[collection].filter((item) => item.id !== id);
  persist();
  render();
}

function render() {
  renderList("assets", elements.assetList);
  renderList("debts", elements.debtList);

  const totalAssets = sum(state.assets);
  const totalDebts = sum(state.debts);
  const netWorth = totalAssets - totalDebts;
  const availabilityTotals = sumAssetsByAvailability();

  elements.totalAssets.textContent = formatSummaryAmount(totalAssets);
  elements.totalDebts.textContent = formatSummaryAmount(totalDebts);
  elements.netWorth.textContent = formatSummaryAmount(netWorth);
  elements.longTermAssets.textContent = formatSummaryAmount(availabilityTotals.long);
  elements.shortTermAssets.textContent = formatSummaryAmount(availabilityTotals.short);
  elements.immediateAssets.textContent = formatSummaryAmount(availabilityTotals.immediate);
  elements.assetCount.textContent = `${state.assets.length}개`;
  elements.debtCount.textContent = `${state.debts.length}개`;

  renderActivePage();
  renderAllocation();
}

function renderList(collection, list) {
  list.replaceChildren();

  state[collection].forEach((item) => {
    const fragment = elements.template.content.cloneNode(true);
    const row = fragment.querySelector(".money-item");
    const editButton = fragment.querySelector("[data-edit-entry]");
    const deleteButton = fragment.querySelector("[data-delete-entry]");

    row.classList.toggle("debt", collection === "debts");
    fragment.querySelector(".item-name").textContent = item.name;
    fragment.querySelector(".item-type").textContent = getItemTypeLabel(collection, item);
    fragment.querySelector(".item-amount").textContent = formatDisplayAmount(item.amount);
    editButton.addEventListener("click", () => openEditDialog(collection, item.id));
    deleteButton.addEventListener("click", () => deleteEntry(collection, item.id));

    list.append(fragment);
  });
}

function renderActivePage() {
  const isAllocationPage = state.activePage === "allocation";

  elements.overviewPage.hidden = isAllocationPage;
  elements.allocationPage.hidden = !isAllocationPage;
  elements.toggleAllocationPage.textContent = isAllocationPage ? "목록" : "비중";
  elements.toggleAllocationPage.setAttribute("aria-pressed", String(isAllocationPage));
}

function renderAllocation() {
  const totalAssets = sum(state.assets);
  const assetSegments = getAssetSegments(totalAssets);
  const availabilitySegments = getAvailabilitySegments(totalAssets);

  renderAllocationChart({
    total: totalAssets,
    segments: assetSegments,
    totalElement: elements.allocationTotal,
    chartElement: elements.assetPieChart,
    centerElement: elements.pieCenterLabel,
    listElement: elements.allocationList,
    emptyText: "자산을 추가하면 비중 그래프가 표시됩니다.",
  });

  renderAllocationChart({
    total: totalAssets,
    segments: availabilitySegments,
    totalElement: elements.availabilityAllocationTotal,
    chartElement: elements.availabilityPieChart,
    centerElement: elements.availabilityPieCenterLabel,
    listElement: elements.availabilityAllocationList,
    emptyText: "자산을 추가하면 가용성 비중이 표시됩니다.",
  });
}

function renderAllocationChart({
  total,
  segments,
  totalElement,
  chartElement,
  centerElement,
  listElement,
  emptyText,
}) {
  totalElement.textContent = formatDisplayAmount(total);
  centerElement.textContent = total > 0 ? "100%" : "0%";
  chartElement.style.background = getPieBackground(segments);
  chartElement.classList.toggle("empty", total <= 0);
  listElement.replaceChildren();

  if (!segments.length) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "allocation-empty";
    emptyItem.textContent = emptyText;
    listElement.append(emptyItem);
    return;
  }

  segments.forEach((segment) => {
    const item = document.createElement("li");
    item.className = "allocation-item";

    const swatch = document.createElement("span");
    swatch.className = "allocation-swatch";
    swatch.style.background = segment.color;

    const text = document.createElement("div");
    const name = document.createElement("strong");
    const meta = document.createElement("span");
    name.textContent = segment.name;
    meta.textContent = `${segment.type} · ${segment.percent.toFixed(1)}%`;
    text.append(name, meta);

    const amount = document.createElement("b");
    amount.textContent = formatDisplayAmount(segment.amount);

    item.append(swatch, text, amount);
    listElement.append(item);
  });
}

function getAssetSegments(totalAssets) {
  if (totalAssets <= 0) return [];

  return state.assets.map((asset, index) => ({
    name: asset.name,
    type: getItemTypeLabel("assets", asset),
    amount: asset.amount,
    percent: (asset.amount / totalAssets) * 100,
    color: ASSET_COLORS[index % ASSET_COLORS.length],
  }));
}

function getAvailabilitySegments(totalAssets) {
  if (totalAssets <= 0) return [];

  const totals = sumAssetsByAvailability();

  return Object.keys(ASSET_AVAILABILITY)
    .map((availability) => ({
      name: ASSET_AVAILABILITY[availability],
      type: "가용성",
      amount: totals[availability],
      percent: (totals[availability] / totalAssets) * 100,
      color: AVAILABILITY_COLORS[availability],
    }))
    .filter((segment) => segment.amount > 0);
}

function getPieBackground(segments) {
  if (!segments.length) {
    return "conic-gradient(var(--line) 0deg 360deg)";
  }

  let current = 0;
  const stops = segments.map((segment, index) => {
    const start = current;
    const end = index === segments.length - 1 ? 360 : current + segment.percent * 3.6;
    current = end;
    return `${segment.color} ${start.toFixed(2)}deg ${end.toFixed(2)}deg`;
  });

  return `conic-gradient(${stops.join(", ")})`;
}

function sum(items) {
  return items.reduce((total, item) => total + item.amount, 0);
}

function sumAssetsByAvailability() {
  return state.assets.reduce(
    (totals, item) => {
      const availability = getAssetAvailability(item.availability);
      totals[availability] += item.amount;
      return totals;
    },
    { long: 0, short: 0, immediate: 0 },
  );
}

function getItemTypeLabel(collection, item) {
  if (collection !== "assets") {
    return item.type;
  }

  return `${item.type} · ${ASSET_AVAILABILITY[getAssetAvailability(item.availability)]}`;
}

function getAssetAvailability(value) {
  return Object.prototype.hasOwnProperty.call(ASSET_AVAILABILITY, value) ? value : "immediate";
}

function formatInputAmount(value) {
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return "";

  return Number(digits).toLocaleString("ko-KR");
}

function parseInputAmount(value) {
  return Number(String(value).replace(/,/g, ""));
}

function getDialog(collection) {
  return collection === "assets" ? elements.assetDialog : elements.debtDialog;
}

function getForm(collection) {
  return collection === "assets" ? elements.assetForm : elements.debtForm;
}

function setDialogMode(collection, mode) {
  const form = getForm(collection);
  const title = form.querySelector("h2");
  const submitLabel = form.querySelector("[data-submit-label]");
  const label = collection === "assets" ? "자산" : "부채";
  const action = mode === "edit" ? "수정" : "추가";

  title.textContent = `${label} ${action}`;
  submitLabel.textContent = mode === "edit" ? "수정 저장" : "저장";
}

function formatWon(value) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSummaryAmount(value) {
  return formatDisplayAmount(value);
}

function formatDisplayAmount(value) {
  const formatted = formatWon(value);
  return state.hideAmounts ? maskDigits(formatted) : formatted;
}

function maskDigits(value) {
  return String(value).replace(/\d/g, "*");
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function applyTheme() {
  document.documentElement.dataset.theme = state.darkMode ? "dark" : "light";
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) {
    themeColor.setAttribute("content", state.darkMode ? "#111713" : "#1f2a24");
  }
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.assets) && Array.isArray(saved.debts)) {
      const hideAmounts = "hideAmounts" in saved ? saved.hideAmounts : saved.hideSummaryAmounts;

      return {
        ...saved,
        assets: saved.assets.map(normalizeAsset),
        hideAmounts: Boolean(hideAmounts),
        darkMode: Boolean(saved.darkMode),
        activePage: saved.activePage === "allocation" ? "allocation" : "overview",
      };
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }

  return {
    assets: [],
    debts: [],
    hideAmounts: false,
    darkMode: false,
    activePage: "overview",
  };
}

function normalizeAsset(asset) {
  return {
    ...asset,
    availability: getAssetAvailability(asset.availability),
  };
}

render();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}
