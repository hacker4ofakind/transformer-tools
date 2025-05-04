@echo off
setlocal enabledelayedexpansion

REM Enable ANSI color codes for Windows 10+
for /f "tokens=4-5 delims=. " %%i in ('ver') do set VERSION=%%i.%%j
if "%VERSION%" == "10.0" (
    reg add HKCU\Console /v VirtualTerminalLevel /t REG_DWORD /d 1 /f >nul 2>nul
)

REM Enable color support directly
powershell -command "&{$Host.UI.RawUI.WindowTitle='Transformer Tools Starter'}"
powershell -command "&{$PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'}"

REM Define ANSI color codes
set "GREEN=[92m"
set "CYAN=[96m"
set "RED=[91m"
set "RESET=[0m"

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    color 0C
    echo Error: Node.js is not installed or not in the PATH.
    pause
    exit /b 1
)

REM Check if port 4173 is in use
netstat -ano | findstr ":4173" >nul
if %ERRORLEVEL% equ 0 (
    color 0C
    echo Error: Port 4173 is already in use.
    pause
    exit /b 1
)

REM Check if port 8000 is in use
netstat -ano | findstr ":8000" >nul
if %ERRORLEVEL% equ 0 (
    color 0C
    echo Error: Port 8000 is already in use.
    pause
    exit /b 1
)

REM All checks passed, now install and run the application
echo Installing frontend dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
    color 0C
    echo Error: Failed to install npm dependencies.
    pause
    exit /b 1
)

REM Start frontend in a new terminal
echo Starting frontend...
start cmd /k "npm run start"

REM Install backend dependencies
echo Installing backend dependencies...
cd backend
pip install -r requirements.txt
if %ERRORLEVEL% neq 0 (
    color 0C
    echo Error: Failed to install Python dependencies.
    pause
    exit /b 1
)

REM Start backend in a new terminal
echo Starting backend...
start cmd /k "python backend.py"

REM Display success message
color 0A
echo Transformer tools website running.
echo.
color 0B
echo Access the frontend at: http://localhost:4173
echo Backend API available at: http://localhost:8000

cd ..
echo.
echo Press any key to close this window...
pause >nul 