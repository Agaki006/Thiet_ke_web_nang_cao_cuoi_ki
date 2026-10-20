# MediaGuard

Đăng ký bản quyền ảnh số bằng SHA-256, pHash, xác thực ví MetaMask và chứng nhận on-chain trên Ethereum Sepolia.

## Chạy backend

```bash
cd backend
python -m venv venv
./venv/bin/pip install -r requirements.txt
cp ../.env.example .env
../backend/venv/bin/uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

Để tạo exhibition demo sạch và chuyên nghiệp gồm 8 tác phẩm mẫu, chạy từ thư mục `backend`:

```bash
python scripts/seed_demo.py --reset-demo
```

Script tạo 3 ảnh mẫu và 5 written works mẫu, không commit file upload vào Git. Tài khoản demo dùng cho metadata là `demo.*@mediaguard.local`; không dùng mật khẩu demo trên môi trường thật.

Luồng đăng ký: đăng nhập, gọi `POST /auth/wallet/nonce` bằng Bearer JWT, ký message trả về, gọi `POST /auth/wallet/verify`, sau đó upload vào `POST /artworks/register`. Backend stream giới hạn kích thước, validate ảnh thật, tính SHA-256/pHash và gọi `register` on-chain nếu Web3 được cấu hình. `POST /verify` đối chiếu local và chain.

## Chạy frontend

```bash
cd frontend
npm install
npm run dev
```

Mở http://localhost:5173. Vite proxy `/api` tới `http://localhost:8000`; nếu backend chạy ở URL khác, tạo `frontend/.env.local` với `VITE_API_BASE=https://your-api.example.com`. Frontend có các route `/`, `/protect` và `/verify`, đăng nhập/đăng ký, kết nối MetaMask, ký nonce, upload bảo hộ, gallery và verify công khai.

Gallery là public exhibition: chỉ hiển thị tác phẩm public ở trạng thái `protected` hoặc `approved_local`, kèm bằng chứng xác minh. Ngoài ảnh, form hỗ trợ **TXT, Markdown và PDF text**. Written work có bìa typography, loại tác phẩm, ngôn ngữ, số từ/trang, license và modal chi tiết. Tác giả có thể chọn preview 400 từ, cho phép tải file và tích checkbox **Hiển thị Gmail liên hệ trên exhibition**; tất cả đều mặc định tắt. Backend tự migrate các cột written work cho SQLite cũ.

Trạng thái artwork: `pending_chain`, `protected`, `approved_local`, `chain_failed`. Nếu request bị ngắt sau khi broadcast, gọi `POST /artworks/{id}/retry-chain`; backend sẽ verify SHA-256 trên chain trước khi quyết định gửi transaction mới.

## Smart contract

```bash
npm install
npm run compile
cp .env.example .env
npm run deploy:sepolia
```

Script deploy tạo `backend/app/contract_deployment.json`. Không commit `.env`, private key hoặc file upload.

## Test

```bash
pytest
npm test
```

Production bắt buộc đặt `JWT_SECRET` tối thiểu 32 ký tự. Backend có migration additive tự động cho ba cột wallet trên SQLite cũ, rate limit mặc định 30 lượt/phút/IP cho `/verify` (`VERIFY_RATE_LIMIT`) và 10 lượt/phút/IP cho auth (`AUTH_RATE_LIMIT`). RPC verify chạy ngoài event loop và dùng client cache. Lock theo file hash chống gửi duplicate trong cùng process, lock nonce chỉ giữ tới lúc broadcast. Khi phục hồi artwork đã tồn tại trên chain, backend tìm lại `tx_hash` từ event `ArtworkRegistered`; có thể giới hạn vùng quét bằng `CHAIN_START_BLOCK`. Test dùng SQLite tạm từ `backend/tests/conftest.py`. Khi chạy nhiều worker/instance, nên dùng PostgreSQL với cơ chế khóa phân tán hoặc queue giao dịch.
