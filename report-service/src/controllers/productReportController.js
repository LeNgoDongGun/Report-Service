const db = require('../db');
const svc = require('../services/clients');

const round = (n) => Math.round(n * 100) / 100;

exports.getAll = async (req, res) => {
  const [rows] = req.query.product_id
    ? await db.query('SELECT * FROM product_reports WHERE product_id = ? ORDER BY id DESC', [req.query.product_id])
    : await db.query('SELECT * FROM product_reports ORDER BY id DESC');
  res.json(rows);
};

exports.getOne = async (req, res) => {
  const [[row]] = await db.query('SELECT * FROM product_reports WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ message: 'Không tìm thấy báo cáo sản phẩm' });
  res.json(row);
};

// Body: { product_id, order_report_id? }
//  - co order_report_id: bao cao san pham trong DUNG don hang cua bao cao do
//  - khong co: bao cao tong hop san pham tren TAT CA don hang (tru don da huy)
// So luong ton lay tu Product service tai thoi diem lap bao cao.
exports.create = async (req, res) => {
  const product_id = Number(req.body.product_id);
  const order_report_id = req.body.order_report_id ? Number(req.body.order_report_id) : null;
  if (!product_id) return res.status(400).json({ message: 'Cần product_id' });

  let product;
  try {
    product = await svc.getProduct(product_id, req.token);
  } catch (e) {
    if (e.response?.status === 404) return res.status(404).json({ message: 'Sản phẩm không tồn tại' });
    return res.status(503).json({ message: 'Không kết nối được Product service' });
  }

  let items;
  try {
    if (order_report_id) {
      const [[orp]] = await db.query('SELECT order_id FROM orders_reports WHERE id = ?', [order_report_id]);
      if (!orp) return res.status(404).json({ message: 'Báo cáo đơn hàng không tồn tại' });
      const [[dup]] = await db.query(
        'SELECT id FROM product_reports WHERE order_report_id = ? AND product_id = ?',
        [order_report_id, product_id]);
      if (dup) return res.status(409).json({ message: 'Đã có báo cáo sản phẩm này cho đơn', report_id: dup.id });
      items = (await svc.getOrder(orp.order_id, req.token)).items;
    } else {
      const orders = await svc.getAllOrders(req.token);
      const valid = new Set(orders.filter((o) => o.status !== 'cancelled').map((o) => o.id));
      items = (await svc.getAllOrderItems(req.token)).filter((i) => valid.has(i.order_id));
    }
  } catch (e) {
    return res.status(503).json({ message: 'Không lấy được dữ liệu từ Order service' });
  }

  const mine = items.filter((i) => Number(i.product_id) === product_id);
  const total_sold = mine.reduce((s, i) => s + Number(i.quantity), 0);
  const revenue = mine.reduce((s, i) => s + Number(i.total_price), 0);
  const cost = product.cost * total_sold;
  const profit = revenue - cost;

  const [r] = await db.query(
    `INSERT INTO product_reports
     (order_report_id, product_id, total_sold, revenue, cost, profit, stock_quantity)
     VALUES (?,?,?,?,?,?,?)`,
    [order_report_id, product_id, total_sold, round(revenue), round(cost), round(profit), product.stock]
  );
  res.status(201).json({
    id: r.insertId, order_report_id, product_id, product_name: product.name,
    total_sold, revenue: round(revenue), cost: round(cost), profit: round(profit),
    stock_quantity: product.stock,
  });
};

exports.remove = async (req, res) => {
  const [r] = await db.query('DELETE FROM product_reports WHERE id = ?', [req.params.id]);
  if (!r.affectedRows) return res.status(404).json({ message: 'Không tìm thấy báo cáo sản phẩm' });
  res.json({ message: 'Đã xóa báo cáo sản phẩm' });
};
