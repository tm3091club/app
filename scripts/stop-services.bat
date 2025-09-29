@echo off
echo Stopping Toastmasters Knowledge Base Services...

REM Stop FalkorDB
docker stop falkordb 2>nul
if %errorlevel% equ 0 (
    echo ✅ FalkorDB stopped
) else (
    echo ℹ️ FalkorDB was not running
)

REM Remove the container
docker rm falkordb 2>nul
if %errorlevel% equ 0 (
    echo ✅ FalkorDB container removed
) else (
    echo ℹ️ FalkorDB container was not found
)

echo.
echo Services stopped successfully!
pause

