# MediaGuard

Đăng ký bản quyền ảnh số bằng SHA-256, pHash và chứng nhận on-chain trên Ethereum Sepolia.

## Smart contract

```bash
cp .env.example .env
# điền SEPOLIA_RPC_URL, DEPLOYER_PRIVATE_KEY, ETHERSCAN_API_KEY
npm install
npm run compile
npm run deploy:local       # cần chạy npx hardhat node ở terminal khác
npm run deploy:sepolia
```

Sau deploy, script tạo `backend/app/contract_deployment.json`. Không commit `.env` hoặc private key.

## Backend

```bash
cd backend
../backend/venv/bin/uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

Các endpoint khung: `POST /auth/register`, `POST /auth/login`, `GET /artworks`, `POST /artworks/register`, `POST /verify`.

## Ghi chú bảo mật

Backend wallet chỉ nên là hot wallet có số dư nhỏ và quyền gọi `register/revoke`. Trong production nên đặt private key ở secret manager, giới hạn kích thước/MIME ảnh, dùng object storage riêng và thêm nonce chống replay cho chữ ký MetaMask.
