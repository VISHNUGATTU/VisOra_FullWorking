@echo off
title VisOra: Production Stack Launcher
echo ======================================================================
echo    VisOra: Neural Identity Platform (Patent App No: 202641036876)
echo    OPTIMIZED PRODUCTION MODE LAUNCHER
echo ======================================================================
echo.

echo [*] Building optimized React production bundle...
cd client
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [!] Client build failed! Aborting production startup.
    pause
    exit /b 1
)
cd ..
echo [+] Client production bundle compiled successfully.
echo.

echo [1/3] Starting Python Neural Engine (FastAPI + FAISS + InsightFace)...
start "VisOra - Neural Engine [PROD 8000]" cmd /k "set PYTHONUNBUFFERED=1 && cd engine && python main.py"

timeout /t 3 /nobreak >nul

echo [2/3] Starting Node.js Express Core API (Cluster / Port 6446)...
start "VisOra - Core Server [PROD 6446]" cmd /k "set NODE_ENV=production && cd server && npm start"

timeout /t 2 /nobreak >nul

echo [3/3] Serving React Client Production Build (Port 4173 / 5173)...
start "VisOra - Client Preview [PROD]" cmd /k "cd client && npx vite preview --port 5173 --host"

echo.
echo ======================================================================
echo  All VisOra services active in PRODUCTION MODE:
echo  - Frontend Web UI:    http://localhost:5173
echo  - Node.js Core API:   http://localhost:6446 (Health: /health)
echo  - Python Neural Core: http://localhost:8000 (Health: /health)
echo ======================================================================
echo.
pause
