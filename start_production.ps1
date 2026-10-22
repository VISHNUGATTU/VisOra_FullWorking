# ======================================================================
#   VisOra: Neural Identity Platform (Patent App No: 202641036876)
#   OPTIMIZED PRODUCTION MODE LAUNCHER (PowerShell)
# ======================================================================

Write-Host "`n======================================================================" -ForegroundColor Cyan
Write-Host "   VisOra: Neural Identity Platform (Patent App No: 202641036876)" -ForegroundColor Cyan
Write-Host "   OPTIMIZED PRODUCTION MODE LAUNCHER" -ForegroundColor Cyan
Write-Host "======================================================================`n" -ForegroundColor Cyan

$WorkspaceRoot = $PSScriptRoot

# 1. Build Client Bundle
Write-Host "[*] Compiling optimized React production bundle..." -ForegroundColor Yellow
Set-Location -Path "$WorkspaceRoot\client"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] Client production build failed. Aborting startup." -ForegroundColor Red
    Set-Location -Path $WorkspaceRoot
    Exit 1
}
Write-Host "[+] Client production build compiled successfully.`n" -ForegroundColor Green
Set-Location -Path $WorkspaceRoot

# 2. Start Python Neural Engine
Write-Host "[1/3] Launching Python Neural Identity Engine (Port 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$WorkspaceRoot\engine'; `$env:PYTHONUNBUFFERED='1'; python main.py" -WindowStyle Normal

Start-Sleep -Seconds 3

# 3. Start Node.js Express Core API
Write-Host "[2/3] Launching Node.js Express Core API (Port 6446)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$WorkspaceRoot\server'; `$env:NODE_ENV='production'; npm start" -WindowStyle Normal

Start-Sleep -Seconds 2

# 4. Serve Production Client
Write-Host "[3/3] Serving React Client Production Build (Port 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$WorkspaceRoot\client'; npx vite preview --port 5173 --host" -WindowStyle Normal

Write-Host "`n======================================================================" -ForegroundColor Green
Write-Host "  All VisOra services active in PRODUCTION MODE:" -ForegroundColor Green
Write-Host "  - Frontend Web UI:    http://localhost:5173" -ForegroundColor White
Write-Host "  - Node.js Core API:   http://localhost:6446 (Health: /health)" -ForegroundColor White
Write-Host "  - Python Neural Core: http://localhost:8000 (Health: /health)" -ForegroundColor White
Write-Host "======================================================================`n" -ForegroundColor Green
