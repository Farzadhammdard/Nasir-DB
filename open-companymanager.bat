@echo off
cd /d "%~dp0"
title NasirDB

REM Already running? Just open the browser.
powershell -NoProfile -Command "try { [void](Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:3000' -TimeoutSec 2); exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel%==0 goto OPEN

echo Starting NasirDB (npm run dev)...
start "NasirDB Server" /min cmd /c "npm run dev"

REM Wait for the server (max ~60s), then open the browser.
set /a n=0
:WAIT
set /a n+=1
if %n% gtr 30 goto OPEN
powershell -NoProfile -Command "try { [void](Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:3000' -TimeoutSec 2); exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel%==0 goto OPEN
timeout /t 2 /nobreak >nul
goto WAIT

:OPEN
start "" "http://localhost:3000"
exit /b
