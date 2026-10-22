$ErrorActionPreference = "Stop"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Không tìm thấy Docker. Hãy cài và mở Docker Desktop trước khi chạy script này."
}

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Đã tạo .env từ .env.example. Với local demo, có thể chạy ngay; muốn ghi Sepolia hãy chỉnh các biến blockchain trong .env." -ForegroundColor Yellow
}

Write-Host "Đang build và khởi động MediaGuard bằng Docker Compose..." -ForegroundColor Cyan
docker compose up --build -d --wait
docker compose ps

Write-Host ""
Write-Host "Frontend:     http://localhost:5173" -ForegroundColor Green
Write-Host "Backend API:  http://localhost:8000" -ForegroundColor Green
Write-Host "Swagger:      http://localhost:8000/docs" -ForegroundColor Green
Write-Host "Health check: http://localhost:8000/health" -ForegroundColor Green
Write-Host ""
Write-Host "Dừng ứng dụng: docker compose down" -ForegroundColor DarkGray
