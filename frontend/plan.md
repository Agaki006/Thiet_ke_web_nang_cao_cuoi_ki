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
