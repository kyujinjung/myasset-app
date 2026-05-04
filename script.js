const STORAGE_KEY = "asset-manager-state";

const state = loadState();

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
  openDialog(elements.assetDialog);
});

elements.openDebtDialog.addEventListener("click", () => {
  openDialog(elements.debtDialog);
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
  addEntry("assets", elements.assetForm, elements.assetDialog);
});

elements.debtForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addEntry("debts", elements.debtForm, elements.debtDialog);
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

function openDialog(dialog) {
  dialog.showModal();
  dialog.querySelector("input").focus();
}

function closeDialog(dialog) {
  dialog.close();
}

function addEntry(collection, form, dialog) {
  const data = new FormData(form);
  const name = String(data.get("name") || "").trim();
  const amount = parseInputAmount(data.get("amount"));
  const type = String(data.get("type") || "기타");

  if (!name || !Number.isFinite(amount) || amount <= 0) return;

  state[collection].push({
    id: createId(),
    name,
    amount,
    type,
  });

  persist();
  form.reset();
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
    const deleteButton = fragment.querySelector("button");

    row.classList.toggle("debt", collection === "debts");
    fragment.querySelector(".item-name").textContent = item.name;
    fragment.querySelector(".item-type").textContent = item.type;
    fragment.querySelector(".item-amount").textContent = formatWon(item.amount);
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
