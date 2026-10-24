/**
 * main.js
 * 页面状态、渲染与交互逻辑。商品数据只拉取一次并缓存在 state.goods。
 */

const CATEGORY_ICONS = {
  "帐篷": "⛺",
  "睡袋": "🛌",
  "炊具": "🍳",
  "桌椅": "🪑",
  "灯具": "💡",
  "配件收纳": "🧰"
};

const state = {
  goods: [],
  cart: new Map(),
  category: "全部"
};

const dom = {
  goodsGrid: document.getElementById("goodsGrid"),
  totalCount: document.getElementById("totalCount"),
  rawTotal: document.getElementById("rawTotal"),
  payTotal: document.getElementById("payTotal"),
  tipText: document.getElementById("tipText"),
  checkoutBtn: document.getElementById("checkoutBtn"),
  cartBar: document.getElementById("cartBar"),
  historyBtn: document.getElementById("historyBtn"),
  historyOverlay: document.getElementById("historyOverlay"),
  historyClose: document.getElementById("historyClose"),
  historyList: document.getElementById("historyList"),
  receiptModal: document.getElementById("receiptModal"),
  receiptBackdrop: document.getElementById("receiptBackdrop"),
  receiptClose: document.getElementById("receiptClose"),
  receiptBody: document.getElementById("receiptBody"),
  toast: document.getElementById("toast")
};

let receiptNeedsClear = false;
let toastTimer = null;

/* ---------------- 工具函数 ---------------- */

function formatMoney(value) {
  return Number(value).toFixed(2);
}

function formatPrice(value) {
  const num = Number(value);
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
}

function formatTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso || "");
  const pad = n => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} `
    + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function getTier(totalCount) {
  if (totalCount >= 20) return { rate: 0.85, label: "8.5 折" };
  if (totalCount >= 10) return { rate: 0.9, label: "9 折" };
  return { rate: 1, label: "原价" };
}

function buildTip(totalCount) {
  if (totalCount === 0) return "还没选货，先逛逛摊位！";
  if (totalCount < 10) return `还差 ${10 - totalCount} 件，满 10 件即享 9 折`;
  if (totalCount < 20) return `已享 9 折，再凑 ${20 - totalCount} 件升 8.5 折`;
  return "已享 8.5 折 · 量大从优，真会买！";
}

function showToast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => dom.toast.classList.remove("show"), 2600);
}

/* ---------------- 商品渲染 ---------------- */

async function loadGoods() {
  dom.goodsGrid.innerHTML = '<div class="grid-state"><p class="grid-state-hand">老板正在清点货品…</p></div>';
  try {
    const goods = await getGoods();
    if (!Array.isArray(goods) || goods.length === 0) {
      throw new Error("货架上一件货都没有。");
    }
    // 倾斜角度在加载时固定，避免筛选时卡片乱跳
    state.goods = goods.map(good => ({
      ...good,
      _rot: (Math.random() * 4 - 2).toFixed(2)
    }));
    renderGoods();
    updateCartBar();
  } catch (err) {
    dom.goodsGrid.innerHTML = `
      <div class="grid-state">
        <p class="grid-state-hand">货没拉过来…</p>
        <p class="grid-state-err">${err.message}</p>
        <button class="retry-btn" type="button">再拉一次货</button>
      </div>
    `;
    const retry = dom.goodsGrid.querySelector(".retry-btn");
    if (retry) retry.addEventListener("click", loadGoods);
  }
}

function createCard(good) {
  const qty = state.cart.get(good.id) || 0;
  const isSoldOut = good.stock === 0;
  const card = document.createElement("article");
  card.className = "tag-card"
    + (qty > 0 ? " has-item" : "")
    + (isSoldOut ? " is-soldout" : "");
  card.dataset.id = String(good.id);
  card.dataset.stock = String(good.stock);
  card.style.setProperty("--rot", `${good._rot}deg`);

  const badge = good.tag ? `<span class="tag-badge">${good.tag}</span>` : "";
  const retail = Number(good.retailPrice) > Number(good.price)
    ? `<del class="tag-retail">￥${formatPrice(good.retailPrice)}</del>`
    : "";
  const actions = isSoldOut
    ? '<div class="tag-actions"><span class="soldout-tip">本摊售罄 · 明日请早</span></div>'
    : `<div class="tag-actions">
        <button class="qty-btn" type="button" data-action="minus" aria-label="减少「${good.name}」数量" ${qty === 0 ? "disabled" : ""}>−</button>
        <span class="qty-num" aria-live="polite">${qty}</span>
        <button class="qty-btn" type="button" data-action="plus" aria-label="增加「${good.name}」数量" ${qty >= good.stock ? "disabled" : ""}>＋</button>
      </div>`;

  card.innerHTML = `
    <span class="tape" aria-hidden="true"></span>
    <span class="card-stamp" aria-hidden="true">已加购</span>
    ${isSoldOut ? '<span class="soldout-seal" aria-hidden="true">售罄</span>' : ""}
    <div class="tag-head">
      <span class="tag-emoji" aria-hidden="true">${CATEGORY_ICONS[good.category] || "🏕️"}</span>
      <div class="tag-head-text">
        <div class="tag-title-row">
          <h3 class="tag-title">${good.name}</h3>
          ${badge}
        </div>
        <p class="tag-desc">${good.desc || ""}</p>
      </div>
    </div>
    <div class="tag-price">
      <span class="yen">¥</span><strong class="amount">${formatPrice(good.price)}</strong>
      <span class="unit">/${good.unit}</span>
      ${retail}
    </div>
    <p class="tag-stock">库存 ${good.stock}${good.unit}</p>
    ${actions}
  `;
  return card;
}

/** 使用 DocumentFragment 批量渲染当前分类 */
function renderGoods() {
  const list = state.category === "全部"
    ? state.goods
    : state.goods.filter(good => good.category === state.category);

  if (list.length === 0) {
    dom.goodsGrid.innerHTML = '<div class="grid-state"><p class="grid-state-hand">这个摊位今天没出摊…</p></div>';
    return;
  }

  const fragment = document.createDocumentFragment();
  list.forEach((good, index) => {
    const card = createCard(good);
    card.style.setProperty("--i", String(Math.min(index, 14)));
    fragment.appendChild(card);
  });
  dom.goodsGrid.replaceChildren(fragment);
}

/* ---------------- 购物车交互（局部更新） ---------------- */

function syncCard(card, qty) {
  const stock = Number(card.dataset.stock);
  const num = card.querySelector(".qty-num");
  const minus = card.querySelector('[data-action="minus"]');
  const plus = card.querySelector('[data-action="plus"]');
  if (num) num.textContent = qty;
  if (minus) minus.disabled = qty === 0;
  if (plus) plus.disabled = qty >= stock;
  card.classList.toggle("has-item", qty > 0);
}

function playStamp(card) {
  const stamp = card.querySelector(".card-stamp");
  if (!stamp) return;
  stamp.classList.remove("is-stamping");
  void stamp.offsetWidth;
  stamp.classList.add("is-stamping");
}

function changeQty(id, delta) {
  const good = state.goods.find(item => item.id === id);
  if (!good || good.stock === 0) return;

  const current = state.cart.get(id) || 0;
  const next = Math.min(good.stock, Math.max(0, current + delta));
  if (next === current) {
    if (delta > 0 && current >= good.stock) {
      showToast(`「${good.name}」只剩 ${good.stock}${good.unit} 了`);
    }
    return;
  }

  if (next === 0) {
    state.cart.delete(id);
  } else {
    state.cart.set(id, next);
  }

  const card = dom.goodsGrid.querySelector(`.tag-card[data-id="${id}"]`);
  if (card) {
    syncCard(card, next);
    if (delta > 0) playStamp(card);
  }
  updateCartBar();
}

function setAmount(el, text, animate) {
  if (el.textContent === text) return;
  el.textContent = text;
  if (!animate) return;
  el.classList.remove("bump");
  void el.offsetWidth;
  el.classList.add("bump");
}

function updateCartBar() {
  let totalCount = 0;
  let rawSum = 0;
  state.cart.forEach((qty, id) => {
    const good = state.goods.find(item => item.id === id);
    if (!good) return;
    totalCount += qty;
    rawSum += Number(good.price) * qty;
  });

  const tier = getTier(totalCount);
  const paySum = rawSum * tier.rate;

  setAmount(dom.totalCount, String(totalCount), totalCount > 0);
  setAmount(dom.rawTotal, `¥${formatMoney(rawSum)}`, totalCount > 0);
  setAmount(dom.payTotal, `¥${formatMoney(paySum)}`, totalCount > 0);
  dom.checkoutBtn.disabled = totalCount === 0;

  const achieved = tier.rate < 1;
  dom.tipText.classList.toggle("hit", achieved);
  dom.tipText.textContent = buildTip(totalCount);
}

function clearCart() {
  state.cart.clear();
  dom.goodsGrid.querySelectorAll(".tag-card").forEach(card => {
    if (!card.classList.contains("is-soldout")) {
      syncCard(card, 0);
    }
  });
  updateCartBar();
}

/* ---------------- 开单与小票 ---------------- */

async function checkout() {
  if (state.cart.size === 0) return;

  const items = Array.from(state.cart, ([id, count]) => ({ id, count }));
  const originalLabel = dom.checkoutBtn.textContent;
  dom.checkoutBtn.disabled = true;
  dom.checkoutBtn.textContent = "老板开单中…";

  try {
    const order = await submitOrder(items);
    showReceipt(order);
    receiptNeedsClear = true;
  } catch (err) {
    showToast(err.message || "开单失败，请重试。");
  } finally {
    dom.checkoutBtn.textContent = originalLabel;
    updateCartBar();
  }
}

function showReceipt(order) {
  const itemRows = (order.items || []).map(item => `
    <div class="receipt-item">
      <span>${item.name} × ${item.count}${item.unit || ""}</span>
      <span>${formatMoney(item.subtotal)}</span>
    </div>
  `).join("");

  const rateText = Number(order.rate) < 1
    ? `× ${order.rate}（批发优惠）`
    : "× 1（未达折扣）";

  dom.receiptBody.innerHTML = `
    <div class="receipt-meta"><span>单号</span><span>${order.id}</span></div>
    <div class="receipt-meta"><span>开单时间</span><span>${formatTime(order.createTime)}</span></div>
    <div class="receipt-divider"></div>
    ${itemRows}
    <div class="receipt-divider"></div>
    <div class="receipt-total-row"><span>件数合计</span><span>${order.totalCount} 件</span></div>
    <div class="receipt-total-row"><span>原价合计</span><span>¥${formatMoney(order.rawSum)}</span></div>
    <div class="receipt-total-row"><span>批发折扣</span><span>${rateText}</span></div>
    <div class="receipt-pay"><span>实付金额</span><strong>¥${formatMoney(order.paySum)}</strong></div>
  `;

  dom.receiptModal.classList.add("open");
  document.body.classList.add("no-scroll");
}

function closeReceipt() {
  dom.receiptModal.classList.remove("open");
  document.body.classList.remove("no-scroll");
  if (receiptNeedsClear) {
    receiptNeedsClear = false;
    clearCart();
  }
}

/* ---------------- 历史小票 ---------------- */

async function openHistory() {
  dom.historyOverlay.classList.add("open");
  document.body.classList.add("no-scroll");
  dom.historyList.innerHTML = '<p class="drawer-state">老板翻账本中…</p>';

  try {
    const orders = await getOrders();
    renderHistory(orders);
  } catch (err) {
    dom.historyList.innerHTML = `
      <p class="drawer-state">
        账本没翻开，稍后再试
        <small>${err.message}</small>
      </p>
    `;
  }
}

function renderHistory(orders) {
  if (!Array.isArray(orders) || orders.length === 0) {
    dom.historyList.innerHTML = '<p class="drawer-state">还没开过单<small>先去摊位挑几件货吧</small></p>';
    return;
  }

  const fragment = document.createDocumentFragment();
  orders.forEach((order, index) => {
    const row = document.createElement("div");
    row.className = "history-item";
    row.style.setProperty("--i", String(index));
    row.innerHTML = `
      <div>
        <p class="history-time">${formatTime(order.createTime)}</p>
        <p class="history-meta">${order.totalCount} 件 · 单号 ${order.id}</p>
      </div>
      <strong>¥${formatMoney(order.paySum)}</strong>
    `;
    fragment.appendChild(row);
  });
  dom.historyList.replaceChildren(fragment);
}

function closeHistory() {
  dom.historyOverlay.classList.remove("open");
  document.body.classList.remove("no-scroll");
}

/* ---------------- 事件绑定 ---------------- */

dom.goodsGrid.addEventListener("click", event => {
  const retry = event.target.closest(".retry-btn");
  if (retry) {
    loadGoods();
    return;
  }

  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) return;

  const card = button.closest(".tag-card");
  if (!card) return;

  changeQty(Number(card.dataset.id), button.dataset.action === "plus" ? 1 : -1);
});

document.querySelectorAll(".cat-btn").forEach(button => {
  button.addEventListener("click", () => {
    if (button.classList.contains("active")) return;
    document.querySelectorAll(".cat-btn").forEach(btn => {
      btn.classList.toggle("active", btn === button);
    });
    state.category = button.dataset.category;
    renderGoods();
  });
});

dom.checkoutBtn.addEventListener("click", checkout);
dom.historyBtn.addEventListener("click", openHistory);
dom.historyClose.addEventListener("click", closeHistory);
dom.receiptClose.addEventListener("click", closeReceipt);
dom.receiptBackdrop.addEventListener("click", closeReceipt);

dom.historyOverlay.addEventListener("click", event => {
  if (event.target === dom.historyOverlay) closeHistory();
});

document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  if (dom.receiptModal.classList.contains("open")) {
    closeReceipt();
  } else if (dom.historyOverlay.classList.contains("open")) {
    closeHistory();
  }
});

/* ---------------- 底部车栏高度同步 ---------------- */

function syncCartHeight() {
  document.documentElement.style.setProperty("--cart-h", `${dom.cartBar.offsetHeight}px`);
}

if (typeof ResizeObserver !== "undefined") {
  new ResizeObserver(syncCartHeight).observe(dom.cartBar);
} else {
  window.addEventListener("resize", syncCartHeight);
}

/* ---------------- 启动 ---------------- */

syncCartHeight();
updateCartBar();
loadGoods();
