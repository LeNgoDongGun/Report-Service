const axios = require('axios');

// Xac thuc qua Auth service (bai thuc hanh 2): chuyen tiep header Authorization
module.exports = async (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ message: 'Thiếu token xác thực' });
  try {
    await axios.get(process.env.AUTH_VERIFY_URL, { headers: { Authorization: token } });
    req.token = token;
    next();
  } catch (err) {
    if (err.response) return res.status(401).json({ message: 'Token không hợp lệ' });
    res.status(503).json({ message: 'Không kết nối được Auth service' });
  }
};
