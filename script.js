const STORAGE_KEY = "asset-manager-state";

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
  openAssetDialog: document.querySelector("#openAssetDialog"),
  openDebtDialog: document.querySelector("#openDebtDialog"),
  assetList: document.querySelector("#assetList"),
  debtList: document.querySelector("#debtList"),
  assetCount: document.querySelector("#assetCount"),
  debtCount: document.querySelector("#debtCount"),
  totalAssets: document.querySelector("#totalAssets"),
  totalDebts: document.querySelector("#totalDebts"),
  netWorth: document.querySelector("#netWorth"),
  resetButton: document.querySelector("#resetButton"),
  template: document.querySelector("#itemTemplate"),
};

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

document.querySelectorAll("[data-close-dialog]").forEach((button) => {
  button.addEventListener("click", () => {
    closeDialog(button.closest("dialog"));
  });
});

[elements.assetDialog, elements.debtDialog].forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      closeDialog(dialog);
    }
  });

  dialog.addEventListener("close", () => {
    dialog.querySelector("form").reset();
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
  setDialogMode(collection, "edit");
  openDialog(dialog);
}

function openDialog(dialog) {
  dialog.showModal();
  dialog.querySelector("input").focus();
}

function closeDialog(dialog) {
  dialog.close();
}

function saveEntry(collection, form, dialog) {
  const data = new FormData(form);
  const name = String(data.get("name") || "").trim();
  const amount = parseInputAmount(data.get("amount"));
  const type = String(data.get("type") || "기타");

  if (!name || !Number.isFinite(amount) || amount <= 0) return;

  if (editing.collection === collection && editing.id) {
    const item = state[collection].find((entry) => entry.id === editing.id);
    if (item) {
      item.name = name;
      item.amount = amount;
      item.type = type;
    }
  } else {
    state[collection].push({
      id: createId(),
      name,
      amount,
      type,
    });
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

  elements.totalAssets.textContent = formatWon(totalAssets);
  elements.totalDebts.textContent = formatWon(totalDebts);
  elements.netWorth.textContent = formatWon(netWorth);
  elements.assetCount.textContent = `${state.assets.length}개`;
  elements.debtCount.textContent = `${state.debts.length}개`;
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
    fragment.querySelector(".item-type").textContent = item.type;
    fragment.querySelector(".item-amount").textContent = formatWon(item.amount);
    editButton.addEventListener("click", () => openEditDialog(collection, item.id));
    deleteButton.addEventListener("click", () => deleteEntry(collection, item.id));

    list.append(fragment);
  });
}

function sum(items) {
  return items.reduce((total, item) => total + item.amount, 0);
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

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.assets) && Array.isArray(saved.debts)) {
      return saved;
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }

  return {
    assets: [],
    debts: [],
  };
}

render();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}
