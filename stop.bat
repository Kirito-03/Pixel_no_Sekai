@echo off
REM Script para detener todos los servicios Docker del proyecto

echo ========================================
echo   Netflix Clone - Deteniendo Servicios
echo ========================================
echo.

echo Deteniendo servicios Docker...
docker-compose down

echo.
echo ========================================
echo   Servicios detenidos exitosamente
echo ========================================
echo.
echo Para eliminar tambien los volumenes (datos):
echo   docker-compose down -v
echo.
pause
