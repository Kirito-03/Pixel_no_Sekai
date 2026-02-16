@echo off
title Netflix Clone - Startup

cls
echo.
echo ========================================
echo   NETFLIX CLONE - INICIO
echo ========================================
echo.

REM Paso 1: Docker Check
echo [PASO 1] Verificando Docker...
docker version >nul 2>&1
if errorlevel 1 (
    color 0C
    echo.
    echo   [X] ERROR: Docker no esta corriendo
    echo.
    echo   Solucion:
    echo   1. Abre Docker Desktop
    echo   2. Espera a que diga "Docker Desktop is running"
    echo   3. Vuelve a ejecutar este script
    echo.
    pause
    exit /b 1
)
echo   [OK] Docker corriendo
echo.

REM Paso 2: Levantar Backend
echo [PASO 2] Levantando Backend Docker...
docker-compose up -d
if errorlevel 1 (
    color 0C
    echo.
    echo   [X] ERROR: Fallo al iniciar containers
    echo.
    echo   Ver logs: docker-compose logs backend
    echo.
    pause
    exit /b 1
)
echo   [OK] Backend iniciado
echo.

REM Paso 3: Wait
echo [PASO 3] Esperando que backend este listo (10s)...
timeout /t 10 /nobreak
echo   [OK] Listo
echo.

REM Paso 4: Status
echo [PASO 4] Verificando servicios...
docker-compose ps
echo.

echo ========================================
echo   SERVICIOS LISTOS:
echo ========================================
echo   PostgreSQL  : localhost:5432
echo   Backend API : http://localhost:3001
echo   Adminer     : http://localhost:8080
echo ========================================
echo.
echo.
echo [PASO 5] Iniciando Expo...
echo.
echo Presiona Ctrl+C para detener cuando termines
echo.
timeout /t 3 /nobreak

call npm start

REM Si Expo termina
echo.
echo Expo cerrado. Los servicios Docker siguen corriendo.
echo Para detenerlos: stop.bat
pause
