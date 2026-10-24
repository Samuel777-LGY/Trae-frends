/**
 * admin.js
 * 模拟后台账房：订单、库存、营收全部为演示数据。
 */

const ORDERS = [
  { id: "LP20261024112832418", time: "11:28", count: 12, rate: "9 折", pay: 1256.4, status: "done" },
  { id: "LP20261024105716902", time: "10:57", count: 22, rate: "8.5 折", pay: 1145.8, status: "ship" },
  { id: "LP20261024093504117", time: "09:35", count: 6, rate: "原价", pay: 534, status: "ship" },
  { id: "LP20261024090233776", time: "09:02", count: 10, rate: "9 折", pay: 711, status: "pack" },
  { id: "LP20261024084512735", time: "08:45", count: 4, rate: "原价", pay: 316, status: "pack" },
  { id: "LP20261024081255421", time: "08:12", count: 18, rate: "9 折", pay: 2043, status: "done" },
  { id: "LP20261023204109380", time: "昨天 20:41", count: 15, rate: "9 折", pay: 987.3, status: "done" },
  { id: "LP20261023185624609", time: "昨天 18:56", count: 8, rate: "原价", pay: 452, status: "done" }
];

const STOCK = [
  { name: "速开双层自动帐篷", category: "帐篷", stock: 26, max: 40, unit: "顶" },
  { name: "六角天幕遮阳帐篷", category: "帐篷", stock: 18, max: 30, unit: "顶" },
  { name: "大空间家庭帐篷", category: "帐篷", stock: 9, max: 20, unit: "顶" },
  { name: "加厚保暖睡袋", category: "睡袋", stock: 48, max: 60, unit: "个" },
  { name: "卡式炉锅具套装", category: "炊具", stock: 24, max: 30, unit: "套" },
  { name: "折叠蛋卷桌", category: "桌椅", stock: 36, max: 40, unit: "张" },
  { name: "克米特户外椅", category: "桌椅", stock: 12, max: 28, unit: "个" },
  { name: "充电式营地灯", category: "灯具", stock: 42, max: 50, unit: "个" },
  { name: "太阳能氛围地灯", category: "灯具", stock: 0, max: 20, unit: "个" },
  { name: "折叠收纳箱", category: "配件收纳", stock: 28, max: 50, unit: "个" }
];

const REVENUE = [
  { day: "周一", amount: 4200 },
  { day: "周二", amount: 3800 },
  { day: "周三", amount: 5100 },
  { day: "周四", amount: 4600 },
  { day: "周五", amount: 6800 },
  { day: "周六", amount: 9200 },
  { day: "今天", amount: 8462.5, today: true }
];

const SHARES = [
  { label: "帐篷", percent: 38 },
  { label: "桌椅", percent: 24 },
  { label: "炊具", percent: 18 },
  { label: "灯具", percent: 12 },
  { label: "配件收纳", percent: 8 }
];

const STATUS_TEXT = {
  done: { label: "已收摊", cls: "status-done" },
  ship: { label: "已配货", cls: "status-ship" },
  pack: { label: "待打包", cls: "status-pack" }
};

function money(value) {
  return "¥" + value.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function renderDate() {
  const el = document.getElementById("adminDate");
  const now = new Date();
  el.textContent = now.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long"
  });
}

function renderOrders() {
  const body = document.getElementById("orderBody");
  body.innerHTML = ORDERS.map((order, index) => {
    const status = STATUS_TEXT[order.status];
    return `
      <tr style="--i:${index}">
        <td class="order-id">${order.id}</td>
        <td class="order-time">${order.time}</td>
        <td>${order.count} 件</td>
        <td>${order.rate}</td>
        <td class="order-pay">${money(order.pay)}</td>
        <td><span class="status-tag ${status.cls}">${status.label}</span></td>
      </tr>
    `;
  }).join("");
}

function renderStock() {
  const grid = document.getElementById("stockGrid");
  grid.innerHTML = STOCK.map((item, index) => {
    const percent = Math.min(100, Math.round((item.stock / item.max) * 100));
    const low = item.stock > 0 && item.stock <= 12;
    const sold = item.stock === 0;
    const flag = sold ? "已售罄" : low ? "库存偏低" : "";
    return `
      <article class="stock-card${low || sold ? " low" : ""}" style="--i:${index}">
        <div class="stock-head">
          <div>
            <h3 class="stock-name">${item.name}</h3>
            <p class="stock-cat">${item.category}</p>
          </div>
          <span class="stock-count">${item.stock} / ${item.max} ${item.unit}</span>
        </div>
        <div class="stock-bar"><span data-width="${percent}%"></span></div>
        ${flag ? `<span class="stock-flag">${flag}</span>` : ""}
      </article>
    `;
  }).join("");
}

function renderRevenue() {
  const max = Math.max(...REVENUE.map(item => item.amount));
  const chart = document.getElementById("revenueChart");
  chart.innerHTML = REVENUE.map(item => {
    const height = Math.max(6, Math.round((item.amount / max) * 100));
    return `
      <div class="revenue-col${item.today ? " today" : ""}">
        <span class="revenue-value">${(item.amount / 1000).toFixed(1)}k</span>
        <div class="revenue-bar" data-height="${height}%"></div>
        <span class="revenue-day">${item.day}</span>
      </div>
    `;
  }).join("");

  document.getElementById("shareList").innerHTML = SHARES.map(share => `
    <div class="share-row">
      <span class="share-label">${share.label}</span>
      <span class="share-bar"><span data-width="${share.percent}%"></span></span>
      <span class="share-percent">${share.percent}%</span>
    </div>
  `).join("");
}

function animateStockBars() {
  requestAnimationFrame(() => {
    document.querySelectorAll("#stockGrid .stock-bar span").forEach(bar => {
      bar.style.width = bar.dataset.width;
    });
  });
}

function animateRevenue() {
  requestAnimationFrame(() => {
    document.querySelectorAll("#revenueChart .revenue-bar").forEach(bar => {
      bar.style.height = bar.dataset.height;
    });
    document.querySelectorAll("#shareList .share-bar span").forEach(bar => {
      bar.style.width = bar.dataset.width;
    });
  });
}

function countUp() {
  document.querySelectorAll("[data-count]").forEach(el => {
    const target = Number(el.dataset.count);
    const decimals = Number(el.dataset.decimals || 0);
    const duration = 900;
    const start = performance.now();

    const tick = now => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = target * eased;
      el.textContent = value.toLocaleString("zh-CN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

function setupTabs() {
  const tabs = Array.from(document.querySelectorAll(".admin-tab"));
  const panes = {
    orders: document.getElementById("pane-orders"),
    stock: document.getElementById("pane-stock"),
    revenue: document.getElementById("pane-revenue")
  };

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const name = tab.dataset.tab;
      tabs.forEach(btn => {
        const active = btn === tab;
        btn.classList.toggle("active", active);
        btn.setAttribute("aria-selected", String(active));
      });
      Object.entries(panes).forEach(([key, pane]) => {
        pane.classList.toggle("active", key === name);
      });
      if (name === "stock") animateStockBars();
      if (name === "revenue") animateRevenue();
    });
  });
}

renderDate();
renderOrders();
renderStock();
renderRevenue();
setupTabs();
countUp();
