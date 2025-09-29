@echo off
echo Starting Toastmasters Knowledge Base Services...

REM Change to project directory
cd /d "%~dp0.."

REM Check if Docker is running
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

REM Use Docker Compose if available, otherwise use docker run
if exist "graphiti-knowledge-base\docker-compose.yml" (
    echo Using Docker Compose to start FalkorDB...
    cd graphiti-knowledge-base
    docker-compose up -d
    cd ..
) else (
    echo Using Docker run to start FalkorDB...
    REM Check if FalkorDB is already running
    docker ps | findstr falkordb >nul
    if %errorlevel% equ 0 (
        echo FalkorDB is already running
    ) else (
        echo Starting FalkorDB...
        docker run -d --name falkordb -p 6379:6379 falkordb/falkordb:latest
        if %errorlevel% neq 0 (
            echo ❌ Failed to start FalkorDB
            pause
            exit /b 1
        )
    )
)

REM Wait a moment for service to be ready
echo Waiting for FalkorDB to be ready...
timeout /t 3 /nobreak >nul

REM Check if service is responding
docker exec falkordb redis-cli ping >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ FalkorDB is ready and responding
) else (
    echo ⚠️ FalkorDB started but may not be fully ready yet
)

echo.
echo Services Status:
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | findstr falkordb

echo.
echo 🧠 Knowledge base services are ready!
echo 💡 You can now use Cursor with full AI agent memory.
echo 🔄 The knowledge base will persist data between sessions.
echo.
echo To stop services, run: stop-services.bat
pause
