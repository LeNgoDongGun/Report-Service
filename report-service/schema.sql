CREATE DATABASE IF NOT EXISTS report_db CHARACTER SET utf8mb4;
USE report_db;

CREATE TABLE IF NOT EXISTS orders_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  total_revenue DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_profit DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- order_report_id = NULL: bao cao tong hop san pham tren tat ca don hang
-- stock_quantity: ton kho tai thoi diem lap bao cao (cot bo sung de thong ke hang ton)
CREATE TABLE IF NOT EXISTS product_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_report_id INT NULL,
  product_id INT NOT NULL,
  total_sold INT NOT NULL DEFAULT 0,
  revenue DECIMAL(10,2) NOT NULL DEFAULT 0,
  cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  profit DECIMAL(10,2) NOT NULL DEFAULT 0,
  stock_quantity INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_report_id) REFERENCES orders_reports(id) ON DELETE CASCADE
);
