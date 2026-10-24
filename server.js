const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 80;
const PUBLIC_DIR = path.join(__dirname, 'public');
const GOODS_PATH = path.join(__dirname, 'data', 'goods.json');
const ORDERS_PATH = path.join(__dirname, 'data', 'orders.json');

app.disable('x-powered-by');
app.use(express.json());

// 静态资源：HTML 不缓存，CSS/JS 缓存 1 小时
app.use(express.static(PUBLIC_DIR, {
  maxAge: '1h',
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

/** 读取 JSON 文件，可选提供兜底值 */
function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    if (fallback !== undefined) return fallback;
    throw err;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function round2(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/** 按全场累计件数判定批发折扣系数 */
function getDiscountRate(totalCount) {
  if (totalCount >= 20) return 0.85;
  if (totalCount >= 10) return 0.9;
  return 1;
}

/** 时间戳单号，例如 LP20261024153012486 */
function createOrderId() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
    + `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `LP${stamp}${String(Math.floor(Math.random() * 900) + 100)}`;
}

app.get('/api/goods', (req, res) => {
  res.json(readJson(GOODS_PATH));
});

app.get('/api/orders', (req, res) => {
  const orders = readJson(ORDERS_PATH, []);
  orders.sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
  res.json(orders);
});

// 结算：价格、数量、折扣一律以后端 goods.json 为准
app.post('/api/orders', (req, res) => {
  const rawItems = req.body && req.body.items;
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return res.status(400).json({ error: '购物车是空的，先挑几件货再来开单。' });
  }

  const goods = readJson(GOODS_PATH);
  const orderItems = [];
  const seenIds = new Set();

  for (const raw of rawItems) {
    const id = Number(raw && raw.id);
    const count = Number(raw && raw.count);
    const good = goods.find(g => g.id === id);

    if (!good) {
      return res.status(400).json({ error: `货号 ${raw && raw.id} 不存在，请刷新页面重试。` });
    }
    if (seenIds.has(id)) {
      return res.status(400).json({ error: `「${good.name}」重复提交，请刷新页面重试。` });
    }
    if (!Number.isInteger(count) || count < 1) {
      return res.status(400).json({ error: `「${good.name}」的数量不正确。` });
    }
    if (count > good.stock) {
      return res.status(400).json({ error: `「${good.name}」库存只剩 ${good.stock}${good.unit}，请调整数量。` });
    }

    seenIds.add(id);
    orderItems.push({
      id: good.id,
      name: good.name,
      category: good.category,
      price: good.price,
      unit: good.unit,
      count,
      subtotal: round2(good.price * count)
    });
  }

  const totalCount = orderItems.reduce((sum, item) => sum + item.count, 0);
  const rawSum = round2(orderItems.reduce((sum, item) => sum + item.subtotal, 0));
  const rate = getDiscountRate(totalCount);
  const paySum = round2(rawSum * rate);

  const order = {
    id: createOrderId(),
    createTime: new Date().toISOString(),
    items: orderItems,
    totalCount,
    rawSum,
    rate,
    paySum
  };

  const orders = readJson(ORDERS_PATH, []);
  orders.unshift(order);
  writeJson(ORDERS_PATH, orders);

  res.status(201).json(order);
});

// 未匹配的接口统一返回 JSON，避免前端拿到 HTML
app.use('/api', (req, res) => {
  res.status(404).json({ error: '接口不存在。' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: '老板的账本出了点问题，请稍后再试。' });
});

const server = app.listen(PORT, () => {
  console.log(`露营批发部已开市：http://localhost:${PORT}`);
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`端口 ${PORT} 被占用，请关闭占用进程或执行：set PORT=8080 && npm start`);
    process.exit(1);
  }
  throw err;
});
