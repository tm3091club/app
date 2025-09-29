@echo off
REM This script checks if the knowledge base is running and starts it if needed
REM Can be called from Cursor or run manually

cd /d "%~dp0.."

REM Check if FalkorDB is running
docker ps | findstr falkordb >nul
if %errorlevel% equ 0 (
    echo 🧠 Knowledge base is already running
    exit /b 0
)

echo 🔧 Starting knowledge base services...
call scripts\start-services.bat

