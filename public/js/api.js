/**
 * api.js
 * 演示版：使用本地模拟数据库（商品内置 + 订单存 localStorage）。
 * 不依赖后端服务，双击 index.html 即可展示；后续接真实后端时把 USE_MOCK_DB 改为 false。
 */

const USE_MOCK_DB = true;
const API_BASE = "";
const STORAGE_KEY = "camp-wholesale-orders-v1";

const MOCK_GOODS = [
  { id: 1, name: "速开双层自动帐篷", category: "帐篷", price: 199, stock: 26, unit: "顶", retailPrice: 299, tag: "热销", desc: "3 秒撑开，防雨防晒，说走就走" },
  { id: 2, name: "六角天幕遮阳帐篷", category: "帐篷", price: 259, stock: 18, unit: "顶", retailPrice: 369, tag: "新品", desc: "加宽遮阳，六人围坐不嫌挤" },
  { id: 3, name: "大空间家庭帐篷", category: "帐篷", price: 399, stock: 9, unit: "顶", retailPrice: 559, tag: "", desc: "两室一厅，全家露营够住" },
  { id: 4, name: "加厚保暖睡袋", category: "睡袋", price: 69, stock: 48, unit: "个", retailPrice: 99, tag: "热销", desc: "5℃ 保暖，可拼接双人" },
  { id: 5, name: "轻量棉睡袋", category: "睡袋", price: 89, stock: 30, unit: "个", retailPrice: 129, tag: "", desc: "轻装徒步，收纳仅巴掌大" },
  { id: 6, name: "双人拼接睡袋", category: "睡袋", price: 129, stock: 22, unit: "个", retailPrice: 189, tag: "特价", desc: "左右可拼，情侣露营首选" },
  { id: 7, name: "卡式炉锅具套装", category: "炊具", price: 129, stock: 24, unit: "套", retailPrice: 189, tag: "热销", desc: "一炉一锅，煮茶做饭全包" },
  { id: 8, name: "户外便携气罐", category: "炊具", price: 15, stock: 160, unit: "罐", retailPrice: 22, tag: "", desc: "通用卡式接口，燃烧稳定" },
  { id: 9, name: "不锈钢折叠餐具", category: "炊具", price: 39, stock: 56, unit: "套", retailPrice: 59, tag: "新品", desc: "刀叉勺筷，一套收齐" },
  { id: 10, name: "折叠蛋卷桌", category: "桌椅", price: 89, stock: 36, unit: "张", retailPrice: 129, tag: "热销", desc: "一卷即收，桌面够摆一桌菜" },
  { id: 11, name: "克米特户外椅", category: "桌椅", price: 119, stock: 28, unit: "个", retailPrice: 169, tag: "新品", desc: "加宽坐面，久坐不硌腰" },
  { id: 12, name: "铝合金折叠桌", category: "桌椅", price: 149, stock: 16, unit: "张", retailPrice: 219, tag: "", desc: "承重 50kg，四人吃饭不挤" },
  { id: 13, name: "露营 LED 灯串", category: "灯具", price: 29, stock: 120, unit: "串", retailPrice: 45, tag: "热销", desc: "10 米暖光，氛围直接拉满" },
  { id: 14, name: "充电式营地灯", category: "灯具", price: 59, stock: 42, unit: "个", retailPrice: 89, tag: "", desc: "三档调光，满电能亮一整晚" },
  { id: 15, name: "太阳能氛围地灯", category: "灯具", price: 45, stock: 0, unit: "个", retailPrice: 65, tag: "特价", desc: "白天充电，入夜自动亮" },
  { id: 16, name: "折叠收纳箱", category: "配件收纳", price: 39, stock: 50, unit: "个", retailPrice: 59, tag: "热销", desc: "55L 大容量，不用时折平" },
  { id: 17, name: "防潮野餐垫", category: "配件收纳", price: 45, stock: 60, unit: "张", retailPrice: 65, tag: "", desc: "加厚防潮，草地随便躺" },
  { id: 18, name: "户外工具收纳包", category: "配件收纳", price: 25, stock: 34, unit: "个", retailPrice: 39, tag: "新品", desc: "炉具餐具一包拎走" }
];

let memoryOrders = null;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const clone = data => JSON.parse(JSON.stringify(data));
const round2 = num => Math.round((num + Number.EPSILON) * 100) / 100;

function discountRate(totalCount) {
  if (totalCount >= 20) return 0.85;
  if (totalCount >= 10) return 0.9;
  return 1;
}

function makeOrderId(date) {
  const pad = n => String(n).padStart(2, "0");
  const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
    + `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  return `LP${stamp}${String(Math.floor(Math.random() * 900) + 100)}`;
}

function buildOrder(items, date) {
  const orderItems = items.map(item => ({
    id: item.id,
    name: item.name,
    category: item.category,
    price: item.price,
    unit: item.unit,
    count: item.count,
    subtotal: round2(item.price * item.count)
  }));
  const totalCount = orderItems.reduce((sum, item) => sum + item.count, 0);
  const rawSum = round2(orderItems.reduce((sum, item) => sum + item.subtotal, 0));
  const rate = discountRate(totalCount);
  return {
    id: makeOrderId(date),
    createTime: date.toISOString(),
    items: orderItems,
    totalCount,
    rawSum,
    rate,
    paySum: round2(rawSum * rate)
  };
}

function seedOrders() {
  const now = Date.now();
  const pick = (id, count) => {
    const good = MOCK_GOODS.find(item => item.id === id);
    return { ...good, count };
  };
  return [
    buildOrder([pick(1, 2), pick(4, 4), pick(13, 4)], new Date(now - 26 * 60 * 60 * 1000)),
    buildOrder([pick(3, 1), pick(10, 2), pick(11, 4), pick(8, 10), pick(13, 5)], new Date(now - 50 * 60 * 60 * 1000))
  ];
}

function loadOrders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      const seeded = seedOrders();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (memoryOrders === null) memoryOrders = seedOrders();
    return memoryOrders;
  }
}

function saveOrders(orders) {
  memoryOrders = orders;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch (err) {
    // 浏览器禁用存储时退回内存，演示流程不受影响
  }
}

async function request(url, options) {
  let response;
  try {
    response = await fetch(API_BASE + url, options);
  } catch (err) {
    throw new Error("连不上批发部，请确认服务已经启动。");
  }

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : null;

  if (!response.ok) {
    throw new Error((payload && payload.error) || `请求失败（${response.status}）`);
  }
  return payload;
}

/** 获取商品列表（模拟环境下读取内置演示商品） */
async function getGoods() {
  if (USE_MOCK_DB) {
    await delay(260);
    return clone(MOCK_GOODS);
  }
  return request("/api/goods");
}

/** 获取历史订单（最新在前） */
async function getOrders() {
  if (USE_MOCK_DB) {
    await delay(200);
    const orders = loadOrders();
    return clone(orders.sort((a, b) => new Date(b.createTime) - new Date(a.createTime)));
  }
  return request("/api/orders");
}

/** 提交订单，items 形如 [{ id, count }]；模拟环境同样做价格与库存校验 */
async function submitOrder(items) {
  if (USE_MOCK_DB) {
    await delay(420);
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("购物车是空的，先挑几件货再来开单。");
    }

    const picked = [];
    const seenIds = new Set();

    for (const raw of items) {
      const id = Number(raw && raw.id);
      const count = Number(raw && raw.count);
      const good = MOCK_GOODS.find(item => item.id === id);

      if (!good) throw new Error(`货号 ${raw && raw.id} 不存在，请刷新页面重试。`);
      if (seenIds.has(id)) throw new Error(`「${good.name}」重复提交，请刷新页面重试。`);
      if (!Number.isInteger(count) || count < 1) throw new Error(`「${good.name}」的数量不正确。`);
      if (count > good.stock) throw new Error(`「${good.name}」库存只剩 ${good.stock}${good.unit}，请调整数量。`);

      seenIds.add(id);
      picked.push({ ...good, count });
    }

    const order = buildOrder(picked, new Date());

    const orders = loadOrders();
    orders.unshift(order);
    saveOrders(orders);
    return clone(order);
  }

  return request("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items })
  });
}
