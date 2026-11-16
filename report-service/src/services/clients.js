const axios = require('axios');

const unwrap = (d) => d.data || d.product || d.order || d;
const get = async (url, token) =>
  (await axios.get(url, { headers: { Authorization: token } })).data;

// ---- Product service ----
exports.getProduct = async (id, token) => {
  const p = unwrap(await get(`${process.env.PRODUCT_SERVICE_URL}/products/${id}`, token));
  return {
    id: p.id,
    name: p.name,
    price: Number(p.price) || 0,
    // gia nhap: tu dong nhan cac ten truong thuong gap
    cost: Number(p.cost ?? p.cost_price ?? p.import_price ?? p.purchase_price ?? 0),
    stock: Number(p.stock ?? p.quantity ?? p.stock_quantity ?? 0),
  };
};

// ---- Order service ----
// Tra ve don hang kem items: { id, status, total_amount, items: [...] }
exports.getOrder = async (id, token) => {
  const o = unwrap(await get(`${process.env.ORDER_SERVICE_URL}/orders/${id}`, token));
  return { ...o, items: o.items || [] };
};

exports.getAllOrders = async (token) => {
  const d = await get(`${process.env.ORDER_SERVICE_URL}/orders`, token);
  return Array.isArray(d) ? d : d.data || [];
};

exports.getAllOrderItems = async (token) => {
  const d = await get(`${process.env.ORDER_SERVICE_URL}/order_items`, token);
  return Array.isArray(d) ? d : d.data || [];
};
