@echo off
title VisOra: Neural Identity Engine Launcher
echo ======================================================================
echo    VisOra: Neural Identity Engine (Patent App No: 202641036876)
echo    Starting All 3 Microservices...
echo ======================================================================
echo.

echo [1/3] Starting Python Neural Engine (FastAPI + FAISS + InsightFace)...
start "VisOra - Python Neural Engine (Port 8000)" cmd /k "cd engine && python main.py"

timeout /t 2 /nobreak >nul

echo [2/3] Starting Node.js / Express Backend (Port 5000)...
start "VisOra - Node Server (Port 5000)" cmd /k "cd server && npm run server"

timeout /t 2 /nobreak >nul

echo [3/3] Starting React 19 / Vite Client (Port 5173)...
start "VisOra - Vite Client (Port 5173)" cmd /k "cd client && npm run dev"

echo.
echo ======================================================================
echo  All services launched in separate windows!
echo  - Frontend Web UI:    http://localhost:5173
echo  - Node.js Backend:    http://localhost:5000
echo  - Python Neural Core: http://localhost:8000 (Swagger: /docs)
echo ======================================================================
pause
