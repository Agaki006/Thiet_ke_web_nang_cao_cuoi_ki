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

Luồng đăng ký: đăng nhập, gọi `POST /auth/wallet/nonce` bằng Bearer JWT, ký message trả về, gọi `POST /auth/wallet/verify`, sau đó upload vào `POST /artworks/register`. Backend stream giới hạn kích thước, validate ảnh thật, tính SHA-256/pHash và gọi `register` on-chain nếu Web3 được cấu hình. `POST /verify` đối chiếu local và chain.

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

Production bắt buộc đặt `JWT_SECRET` tối thiểu 32 ký tự. Backend có migration additive tự động cho ba cột wallet trên SQLite cũ, rate limit mặc định 30 lượt/phút/IP cho `/verify` (`VERIFY_RATE_LIMIT`), lock theo file hash để chống gửi duplicate trong cùng process và lock nonce khi broadcast. Khi chạy nhiều worker/instance, nên dùng PostgreSQL với cơ chế khóa phân tán hoặc queue giao dịch.
