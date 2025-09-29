@echo off
echo Setting up FalkorDB as Windows Service...

REM Create a batch file that Docker Compose can use
echo @echo off > docker-start.bat
echo docker run -d --name falkordb -p 6379:6379 falkordb/falkordb:latest >> docker-start.bat

echo.
echo To set up as Windows Service, you have a few options:
echo.
echo OPTION 1 - Using NSSM (Non-Sucking Service Manager):
echo 1. Download NSSM from https://nssm.cc/download
echo 2. Extract and run: nssm install FalkorDB
echo 3. Set Path to: %CD%\docker-start.bat
echo 4. Set Startup directory to: %CD%
echo.
echo OPTION 2 - Using Task Scheduler:
echo 1. Open Task Scheduler
echo 2. Create Basic Task
echo 3. Name: FalkorDB Startup
echo 4. Trigger: At startup
echo 5. Action: Start program
echo 6. Program: %CD%\docker-start.bat
echo.
echo OPTION 3 - Manual (Recommended for development):
echo Just run start-services.bat when you need it
echo.
pause

