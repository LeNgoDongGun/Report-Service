const db = require('../db');
const svc = require('../services/clients');

const round = (n) => Math.round(n * 100) / 100;

exports.getAll = async (req, res) => {
  const [rows] = req.query.order_id
    ? await db.query('SELECT * FROM orders_reports WHERE order_id = ? ORDER BY id DESC', [req.query.order_id])
    : await db.query('SELECT * FROM orders_reports ORDER BY id DESC');
  res.json(rows);
};

exports.getOne = async (req, res) => {
  const [[report]] = await db.query('SELECT * FROM orders_reports WHERE id = ?', [req.params.id]);
  if (!report) return res.status(404).json({ message: 'Không tìm thấy báo cáo đơn hàng' });
  const [products] = await db.query('SELECT * FROM product_reports WHERE order_report_id = ?', [report.id]);
  res.json({ ...report, products });
};

// Body: { order_id }
// Lay don hang tu Order service, gia nhap tu Product service,
// tinh doanh thu / chi phi / loi nhuan cho don va tung san pham.
exports.create = async (req, res) => {
  const order_id = Number(req.body.order_id);
  if (!order_id) return res.status(400).json({ message: 'Cần order_id' });

  const [[dup]] = await db.query('SELECT id FROM orders_reports WHERE order_id = ?', [order_id]);
  if (dup) return res.status(409).json({ message: 'Đơn hàng này đã có báo cáo', report_id: dup.id });

  let order;
  try {
    order = await svc.getOrder(order_id, req.token);
  } catch (e) {
    if (e.response?.status === 404) return res.status(404).json({ message: 'Đơn hàng không tồn tại' });
    return res.status(503).json({ message: 'Không kết nối được Order service' });
  }
  if (order.status === 'cancelled')
    return res.status(400).json({ message: 'Đơn hàng đã hủy, không tạo báo cáo' });
  if (!order.items.length) return res.status(400).json({ message: 'Đơn hàng chưa có mặt hàng' });

  // Gom theo san pham
  const byProduct = new Map();
  for (const it of order.items) {
    const cur = byProduct.get(it.product_id) || { product_id: it.product_id, sold: 0, revenue: 0 };
    cur.sold += Number(it.quantity);
    cur.revenue += Number(it.total_price);
    byProduct.set(it.product_id, cur);
  }

  const lines = [];
  for (const l of byProduct.values()) {
    let cost = 0, stock = null;
    try {
      const p = await svc.getProduct(l.product_id, req.token);
      cost = p.cost * l.sold;
      stock = p.stock;
    } catch (e) {
      // san pham da bi xoa -> coi chi phi = 0; loi ket noi -> bao loi
      if (e.response?.status !== 404)
        return res.status(503).json({ message: 'Không kết nối được Product service' });
    }
    lines.push({ ...l, cost, profit: l.revenue - cost, stock });
  }

  const total_revenue = lines.reduce((s, l) => s + l.revenue, 0);
  const total_cost = lines.reduce((s, l) => s + l.cost, 0);

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.query(
      'INSERT INTO orders_reports (order_id, total_revenue, total_cost, total_profit) VALUES (?,?,?,?)',
      [order_id, round(total_revenue), round(total_cost), round(total_revenue - total_cost)]
    );
    for (const l of lines) {
      await conn.query(
        `INSERT INTO product_reports
         (order_report_id, product_id, total_sold, revenue, cost, profit, stock_quantity)
         VALUES (?,?,?,?,?,?,?)`,
        [r.insertId, l.product_id, l.sold, round(l.revenue), round(l.cost), round(l.profit), l.stock]
      );
    }
    await conn.commit();
    res.status(201).json({
      id: r.insertId, order_id,
      total_revenue: round(total_revenue),
      total_cost: round(total_cost),
      total_profit: round(total_revenue - total_cost),
    });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ message: e.message });
  } finally {
    conn.release();
  }
};

exports.remove = async (req, res) => {
  // product_reports bi xoa theo (ON DELETE CASCADE)
  const [r] = await db.query('DELETE FROM orders_reports WHERE id = ?', [req.params.id]);
  if (!r.affectedRows) return res.status(404).json({ message: 'Không tìm thấy báo cáo đơn hàng' });
  res.json({ message: 'Đã xóa báo cáo đơn hàng' });
};
