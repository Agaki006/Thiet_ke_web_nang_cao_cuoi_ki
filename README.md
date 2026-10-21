# MediaGuard

MediaGuard là ứng dụng đăng ký và xác minh quyền sở hữu tác phẩm số. Hệ thống sử dụng SHA-256, pHash, xác thực ví MetaMask và bằng chứng on-chain trên Ethereum Sepolia. Ứng dụng hỗ trợ cả hình ảnh và written work dạng TXT, Markdown hoặc PDF text.

## Link demo đã deploy

- **Frontend:** https://web-project-sigma-five.vercel.app
- **Backend API:** https://web-project-q18h.onrender.com
- **API documentation:** https://web-project-q18h.onrender.com/docs
- **Health check:** https://web-project-q18h.onrender.com/health

Frontend production dùng Vercel rewrite `/api/*` tới backend Render. Render Free có thể sleep sau thời gian không hoạt động; request đầu tiên đôi khi cần khoảng 30–60 giây để đánh thức backend.

> Các link trên Internet dùng cho demo/nộp bài. Docker Compose bên dưới chỉ chạy một bản **local độc lập** trên máy của bạn, không khởi động Vercel hoặc Render.

## Chạy toàn bộ ứng dụng bằng Docker với một lệnh

### Yêu cầu

Cài một trong các lựa chọn sau:

- Docker Desktop trên Windows/macOS.
- Docker Engine và Docker Compose plugin trên Linux.
- Kiểm tra cài đặt:

```bash
docker --version
docker compose version
```

### Lệnh chạy một lần duy nhất

Mở Terminal tại **thư mục gốc của repository** — nơi có file `docker-compose.yml` — rồi chạy:

```bash
test -f .env || cp .env.example .env; docker compose up --build
```

Trên Windows PowerShell, dùng:

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }; docker compose up --build
```

Lệnh trên thực hiện ba việc:

1. Tạo `.env` từ `.env.example` nếu máy chưa có file `.env`.
2. Build image cho backend và frontend.
3. Khởi động hai container, trong đó frontend chỉ khởi động sau khi healthcheck backend đạt yêu cầu.

Không nên dùng `cp .env.example .env` mỗi lần chạy vì lệnh đó sẽ ghi đè các cấu hình bạn đã chỉnh trong `.env`. Lệnh ở trên chỉ tạo file khi file chưa tồn tại.

### Các URL sau khi chạy

Khi Terminal hiển thị log của hai service, mở:

| Thành phần | URL | Mục đích |
|---|---|---|
| Frontend | http://localhost:5173 | Giao diện MediaGuard |
| Backend API | http://localhost:8000 | API local |
| Swagger UI | http://localhost:8000/docs | Xem và thử API |
| Health check | http://localhost:8000/health | Kiểm tra backend đã sẵn sàng |

Giữ nguyên cửa sổ Terminal để các container tiếp tục chạy. Nhấn `Ctrl+C` để dừng stack.

### Chạy nền thay vì chiếm Terminal

```bash
docker compose up --build -d
```

Xem log:

```bash
docker compose logs -f
```

Dừng container:

```bash
docker compose down
```

Dừng và xóa cả database/uploads local đã lưu trong volume:

```bash
docker compose down -v
```

> Chỉ dùng `down -v` khi muốn reset hoàn toàn dữ liệu local. Volume `backend_data` chứa SQLite database và file upload.

## Cấu hình `.env` cho chạy local

Bản mẫu `.env.example` đã có sẵn trong repository. Với mục đích xem giao diện, chạy API và làm demo local, có thể bắt đầu bằng file được tạo tự động từ mẫu.

Nếu muốn ghi bằng chứng lên Ethereum Sepolia, cần cấu hình thêm các biến blockchain trong `.env`:

```dotenv
WEB3_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
BACKEND_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS
CHAIN_ID=11155111
```

Các giá trị secret/private key chỉ được đặt trong `.env` local hoặc secret manager. Không commit `.env`, private key, API key hoặc file upload lên GitHub.

Compose tự ghi đè một số biến để hai container kết nối đúng với nhau:

- Backend database: `/data/mediaguard.db`.
- Backend upload directory: `/data/uploads`.
- Frontend API base: `http://localhost:8000`.
- Backend CORS origin: `http://localhost:5173`.

## Kiểm tra sau khi khởi động

1. Mở http://localhost:8000/health. Kết quả HTTP `200` cho biết backend đã sẵn sàng.
2. Mở http://localhost:8000/docs để xem Swagger UI.
3. Mở http://localhost:5173 để dùng giao diện.
4. Đăng ký tài khoản hoặc đăng nhập.
5. Kết nối MetaMask nếu cần ký xác thực ví.
6. Vào **Upload & Protect** để đăng ký tác phẩm.
7. Vào **Verify** để kiểm tra lại file bằng SHA-256 và pHash.

Nếu chưa cấu hình RPC/contract, các chức năng local như mở giao diện, đăng nhập, upload và kiểm tra API vẫn có thể chạy; trạng thái ghi on-chain sẽ không hoàn tất cho tới khi blockchain được cấu hình đúng.

## Tạo dữ liệu demo mẫu

Sau khi backend container đang chạy, có thể tạo exhibition demo gồm 8 tác phẩm mẫu:

```bash
docker compose exec backend python scripts/seed_demo.py --reset-demo
```

Script tạo 3 ảnh mẫu và 5 written works mẫu. File upload và database chỉ nằm trong volume Docker local, không được commit vào Git. Tài khoản metadata mẫu dùng địa chỉ dạng `demo.*@mediaguard.local`; không dùng mật khẩu demo trên môi trường thật.

Sau khi seed, refresh http://localhost:5173 để xem Gallery.

## Cách chạy không dùng Docker

### Backend

```bash
cd backend
python -m venv venv
./venv/bin/pip install -r requirements.txt
cp ../.env.example .env
../backend/venv/bin/uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### Frontend

Mở Terminal thứ hai:

```bash
cd frontend
npm install
npm run dev
```

Mở http://localhost:5173. Vite proxy `/api` tới `http://localhost:8000`. Nếu backend ở URL khác, tạo `frontend/.env.local`:

```dotenv
VITE_API_BASE=https://your-api.example.com
```

Các route chính của frontend là `/`, `/protect`, `/verify`, `/works/:id` và `/works/:id/certificate`.

## Smart contract

Cài dependency ở thư mục gốc:

```bash
npm install
npm run compile
cp .env.example .env
npm run deploy:sepolia
```

Script deploy tạo `backend/app/contract_deployment.json`. Không commit `.env`, private key hoặc file upload.

## Test

Backend:

```bash
pytest
```

Smart contract:

```bash
npm test
```

Frontend:

```bash
cd frontend
npm test
npm run build
```

## Xử lý lỗi thường gặp

### `docker compose` báo thiếu `.env`

Đảm bảo đang đứng tại thư mục gốc repository và chạy lại:

```bash
test -f .env || cp .env.example .env; docker compose up --build
```

### Backend chưa healthy hoặc frontend chưa mở được

Xem log riêng của backend:

```bash
docker compose logs -f backend
```

Kiểm tra:

```bash
curl http://localhost:8000/health
```

Backend có thể cần thêm thời gian ở lần build/khởi động đầu tiên. Compose đã cấu hình `depends_on` để frontend chờ healthcheck backend.

### Port 5173 hoặc 8000 đã được sử dụng

Tìm và dừng service đang dùng port, hoặc chỉnh port bên trái trong `docker-compose.yml`. Ví dụ:

```yaml
ports:
  - "5174:5173"
```

Sau đó mở frontend tại http://localhost:5174 và cập nhật `CORS_ORIGINS` tương ứng nếu cần.

### Thay đổi mã nguồn nhưng giao diện chưa cập nhật

Build lại image:

```bash
docker compose up --build
```

Nếu vẫn còn cache cũ:

```bash
docker compose build --no-cache
docker compose up
```

## Kiến trúc Docker

`docker-compose.yml` khởi động hai service:

- **backend:** FastAPI/Uvicorn trên port `8000`, dùng SQLite và upload directory trong volume `backend_data`.
- **frontend:** React/Vite trên port `5173`, gọi backend local tại `http://localhost:8000`.

Sơ đồ luồng local:

```text
Browser :5173  →  Frontend container :5173
                     ↓
                Backend container :8000
                     ↓
              SQLite + uploads volume
```

Docker local và hệ thống deploy Internet là hai môi trường độc lập:

```text
Local Docker:
http://localhost:5173  →  http://localhost:8000

Production:
Vercel frontend        →  Render backend
```

## Một số giới hạn và lưu ý production

- Production bắt buộc đặt `JWT_SECRET` tối thiểu 32 ký tự.
- Backend có rate limit mặc định 30 lượt/phút/IP cho `/verify` và 10 lượt/phút/IP cho auth.
- SQLite phù hợp cho local/demo. Khi chạy nhiều worker/instance, nên dùng PostgreSQL với cơ chế khóa phân tán hoặc queue giao dịch.
- Trạng thái artwork gồm `pending_chain`, `protected`, `approved_local` và `chain_failed`.
- Nếu request bị ngắt sau khi broadcast, có thể retry bằng `POST /artworks/{id}/retry-chain`.
- Gallery public chỉ hiển thị tác phẩm public có proof hợp lệ.
