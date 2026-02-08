@echo off
echo ========================================
echo   BACKUP DE YALORDE TENTACIONES
echo ========================================
echo.
echo Iniciando backup automatico...
echo.

node backup-database.js

echo.
echo ========================================
echo Presiona cualquier tecla para cerrar...
pause >nul
