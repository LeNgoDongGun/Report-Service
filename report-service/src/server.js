require('dotenv').config();
const express = require('express');
const auth = require('./middleware/auth');

const app = express();
app.use(express.json());

app.use('/reports/products', auth, require('./routes/products'));
app.use('/reports/orders', auth, require('./routes/orders'));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: err.message });
});

const port = process.env.PORT || 3005;
app.listen(port, () => console.log(`Report service chạy tại http://localhost:${port}`));
