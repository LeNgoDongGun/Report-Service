# Reporting Service (Bài thực hành số 5)

Dịch vụ báo cáo theo kiến trúc SOA: chạy độc lập trên cổng riêng (mặc định `3005`), CSDL riêng (`report_db`).
Xác thực qua Auth service (BTH2), lấy giá nhập/tồn kho từ Product service (BTH3), lấy đơn hàng từ Order service (BTH4).

## Cài đặt
```bash
npm install
cp .env.example .env     # chỉnh cổng/URL cho khớp các service của bạn
mysql -u root -p < schema.sql
npm start
```

## API (cần header `Authorization: Bearer <token>`)
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | /reports/products | Danh sách báo cáo sản phẩm (lọc `?product_id=`) |
| GET | /reports/products/:id | Chi tiết một báo cáo sản phẩm |
| POST | /reports/products | Tạo báo cáo sản phẩm `{ product_id, order_report_id? }` |
| DELETE | /reports/products/:id | Xóa báo cáo sản phẩm |
| GET | /reports/orders | Danh sách báo cáo đơn hàng (lọc `?order_id=`) |
| GET | /reports/orders/:id | Chi tiết báo cáo đơn hàng (kèm báo cáo từng sản phẩm) |
| POST | /reports/orders | Tạo báo cáo đơn hàng `{ order_id }` |
| DELETE | /reports/orders/:id | Xóa báo cáo đơn hàng (xóa luôn báo cáo sản phẩm con) |

## Cách tính
- **Doanh thu** = tổng `total_price` các mặt hàng (Order service).
- **Chi phí** = số lượng bán × giá nhập của sản phẩm (Product service; hỗ trợ tên trường `cost`, `cost_price`, `import_price`, `purchase_price`).
- **Lợi nhuận** = doanh thu − chi phí.
- **Hàng bán được** = tổng `quantity`; **hàng tồn** = tồn kho hiện tại lấy từ Product service (cột `stock_quantity`).
- Đơn hàng đã hủy (`cancelled`) không được tính.
- `POST /reports/orders` tự sinh luôn các dòng `product_reports` cho từng sản phẩm trong đơn.
- `POST /reports/products` không có `order_report_id` sẽ là báo cáo tổng hợp sản phẩm trên mọi đơn hàng.
