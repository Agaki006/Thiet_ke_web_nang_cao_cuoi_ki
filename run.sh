#!/usr/bin/env bash
set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  echo "Không tìm thấy Docker. Hãy cài và khởi động Docker trước khi chạy script này." >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Đã tạo .env từ .env.example. Với local demo, có thể chạy ngay; muốn ghi Sepolia hãy chỉnh các biến blockchain trong .env."
fi

echo "Đang build và khởi động MediaGuard bằng Docker Compose..."
docker compose up --build -d --wait
docker compose ps

echo
echo "Frontend:     http://localhost:5173"
echo "Backend API:  http://localhost:8000"
echo "Swagger:      http://localhost:8000/docs"
echo "Health check: http://localhost:8000/health"
echo
echo "Dừng ứng dụng: docker compose down"
