# MediaGuard frontend plan

## Design

**Các hướng thử:** Neo-archive editorial (0.06), dark cyber-bureau (0.04), quiet fintech (0.08). Chọn **dark cyber-bureau**.

- **Design movement:** data-room / cyber-bureau với nền xanh mực, đường kẻ mảnh và điểm nhấn mint.
- **Core principles:** bằng chứng trước trang trí; trạng thái luôn rõ; khoảng thở rộng; thao tác demo một đường thẳng.
- **Color philosophy:** navy gần đen tạo cảm giác lưu trữ an toàn; mint là tín hiệu proof thành công; violet dùng cho lớp AI/pHash.
- **Layout paradigm:** sidebar cố định như console vận hành, nội dung dàn theo các dải thông tin ngang thay vì card grid dày đặc.
- **Signature elements:** proof stamp trên artwork, metric cards kiểu registry, đường lưới mờ trong vùng preview.
- **Interaction:** hover nâng nhẹ, toast thông báo trạng thái, upload chuyển từ empty state sang scan state rồi result state.
- **Animation:** chỉ dùng spin cho tác vụ chờ và translateY nhẹ cho card; không dùng animation gây nhiễu khi trình diễn.
- **Typography:** Manrope cho UI và DM Mono cho hash, status, chain metadata.
- **Brand essence:** sổ đăng ký quyền sở hữu ảnh có bằng chứng kiểm chứng được; rõ ràng, chắc chắn, thực dụng.
- **Brand voice:** ngắn, trực tiếp, có chất kiểm chứng. Ví dụ: “Proof, not promises.” và “Does it belong?”

## Implementation

Frontend React/Vite nằm trong `frontend/`, proxy `/api` chuyển đến FastAPI `localhost:8000`. Ba view chính là Gallery, Upload & Protect và Verify; auth modal xử lý login/register; wallet helper dùng ethers v6 cho MetaMask message signing.

## Cập nhật giao diện MediaGuard

Giữ nguyên kiến trúc và luồng xác thực/ví/API. Dùng chung container 1040px cho nội dung và breadcrumb. Chuẩn hóa mint #5EE6C8 cho exact/protected, xanh #6CB8FF cho not registered, vàng #F5B65B cho similar/pending, xám xanh cho local proof; thanh tương đồng không gradient. Thống kê nhãn trên, số 40px; typography phụ tối thiểu 12px #9AA9C2 và tiêu đề lớn tracking -0.02em.

Gallery giữ quyền riêng tư tác phẩm, hiển thị trạng thái pending/failed công khai để chủ sở hữu retry qua endpoint có kiểm tra quyền sẵn có; bổ sung cờ is_owner do server tính. Verify bổ sung URL thumbnail gần nhất từ bản ghi public, định dạng mọi phần trăm một chữ số thập phân và CTA sang Upload. Upload bỏ chip ví trùng, dropzone 300px, checkbox trong khung bo góc và nhãn form 14px đậm. Kiểm thử trên dữ liệu demo SQLite riêng, không gửi giao dịch thật; ảnh chụp không đưa vào mã production.
