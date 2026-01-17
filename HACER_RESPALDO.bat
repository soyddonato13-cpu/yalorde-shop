@echo off
echo ==========================================
echo      RESPALDANDO TIENDA YALORDE...
echo ==========================================
echo.
echo Conectando a la base de datos...

:: Ejecutar el script de Node.js
node scripts/backup_db.js

echo.
echo ==========================================
echo      PROCESO FINALIZADO
echo ==========================================
pause
