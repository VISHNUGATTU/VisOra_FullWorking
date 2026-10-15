# VisOra: Neural Identity Engine (Patent App No: 202641036876)
# PowerShell Launcher Script for All Microservices

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "   VisOra: Neural Identity Engine (Patent App No: 202641036876)" -ForegroundColor Green
Write-Host "   Starting All 3 Microservices..." -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Cyan

$root = $PSScriptRoot
if (-not $root) { $root = Get-Location }

# 1. Start Python Neural Engine
Write-Host "[1/3] Starting Python Neural Engine (Port 8000)..." -ForegroundColor Magenta
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\engine'; python main.py"

Start-Sleep -Seconds 2

# 2. Start Node.js Backend
Write-Host "[2/3] Starting Node.js / Express Backend (Port 5000)..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\server'; npm run server"

Start-Sleep -Seconds 2

# 3. Start React Frontend
Write-Host "[3/3] Starting React 19 Frontend (Port 5173)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\client'; npm run dev"

Write-Host "`nAll VisOra services started successfully!" -ForegroundColor Green
Write-Host " - Frontend:    http://localhost:5173" -ForegroundColor White
Write-Host " - Backend:     http://localhost:5000" -ForegroundColor White
Write-Host " - Neural Core: http://localhost:8000 (Docs: http://localhost:8000/docs)" -ForegroundColor White
