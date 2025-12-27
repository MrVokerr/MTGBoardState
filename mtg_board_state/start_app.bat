@echo off
title MTG Board State Launcher
cls

echo ==================================================
echo      Starting MTG Board State Application
echo ==================================================
echo.

:: Check if Node.js is available
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in your PATH.
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b
)

echo Starting local server...
start "MTG Server" /min cmd /c "node local_server.js"

echo Waiting for server to initialize...
timeout /t 2 /nobreak >nul

echo Opening application in your browser...
start http://localhost:3000

echo.
echo ==================================================
echo   Application is running!
echo   Close the "MTG Server" window to stop it.
echo ==================================================
echo.
pause