$ErrorActionPreference = "Stop"

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env from .env.example for local development." -ForegroundColor Yellow
}

docker compose up -d --build --wait
Write-Host ""
Write-Host "Frontend:     http://localhost:5173"
Write-Host "Backend API:  http://localhost:8000"
Write-Host "Swagger:      http://localhost:8000/docs"
Write-Host "Health check: http://localhost:8000/health"
Write-Host ""
