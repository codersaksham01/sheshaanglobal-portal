@echo off
setlocal

set "APP_DIR=%~dp0"
set "APP_URL=http://127.0.0.1:3000/"

echo Starting Crixy CIF Quote Portal...

where npm >nul 2>nul
if errorlevel 1 (
  echo.
  echo npm was not found. Please install Node.js, then run this launcher again.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $response = Invoke-WebRequest -Uri '%APP_URL%' -UseBasicParsing -TimeoutSec 2; if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>nul
if %errorlevel%==0 (
  echo App is already running. Opening browser...
  start "" "%APP_URL%"
  exit /b 0
)

if not exist "%APP_DIR%node_modules\" (
  echo Installing dependencies. This may take a few minutes...
  pushd "%APP_DIR%"
  call npm install
  if errorlevel 1 (
    echo.
    echo Dependency install failed. Please check Node.js and npm installation.
    pause
    exit /b 1
  )
  popd
)

start "Crixy Portal Server" /min cmd /k "cd /d ""%APP_DIR%"" && npm run dev -- -p 3000"

echo Waiting for the app to start...
for /l %%i in (1,1,45) do (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $response = Invoke-WebRequest -Uri '%APP_URL%' -UseBasicParsing -TimeoutSec 2; if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>nul
  if not errorlevel 1 (
    echo Opening browser...
    start "" "%APP_URL%"
    exit /b 0
  )
  timeout /t 1 /nobreak >nul
)

echo.
echo The app did not respond yet. The server window is still running.
echo Open %APP_URL% in your browser after it finishes compiling.
pause
