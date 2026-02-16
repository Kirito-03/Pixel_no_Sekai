@echo off
REM Script para ver logs del backend en tiempo real

echo Mostrando logs del backend (Ctrl+C para salir)...
echo.
docker-compose logs -f backend
