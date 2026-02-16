@echo off
REM Script para solo levantar el backend (sin Expo)

echo ========================================
echo   Netflix Clone - Solo Backend
echo ========================================
echo.

docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker no esta corriendo.
    pause
    exit /b 1
)

echo Iniciando backend (PostgreSQL + API)...
docker-compose up -d

echo.
echo Esperando inicializacion...
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo   Backend iniciado:
echo   - API: http://localhost:3001/health
echo   - PostgreSQL: localhost:5432
echo   - Adminer: http://localhost:8080
echo ========================================
echo.
echo Ver logs: docker-compose logs -f backend
echo Detener: docker-compose down
echo.
pause
