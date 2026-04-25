@echo off
title BrunnenbauApp
color 0A

echo ============================================
echo    BrunnenbauApp wird gestartet...
echo ============================================
echo.

cd /d "%~dp0"

REM Backend starten (im Hintergrund)
echo [1/2] Backend wird gestartet (Port 3001)...
start "BrunnenbauApp - Backend" /min cmd /c "cd /d "%~dp0backend" && node src/server.js"

REM Kurz warten bis Backend bereit ist
echo      Warte auf Backend...
timeout /t 3 /nobreak >nul

REM Frontend starten (im Hintergrund)
echo [2/2] Frontend wird gestartet (Port 5173)...
start "BrunnenbauApp - Frontend" /min cmd /c "cd /d "%~dp0frontend" && npx vite --host"

REM Warten bis Frontend bereit ist, dann Browser oeffnen
echo      Warte auf Frontend...
timeout /t 5 /nobreak >nul

echo.
echo ============================================
echo    App laeuft! Browser wird geoeffnet...
echo ============================================
echo.
echo    Kunden-Portal:  http://localhost:5173
echo    Admin-Login:    http://localhost:5173/admin
echo    (Admin: admin / brunnen2024!)
echo.
echo    Dieses Fenster schliessen = App beenden
echo ============================================

start "" http://localhost:5173/admin

REM Fenster offen halten mit Stopp-Option
echo.
echo Druecke eine beliebige Taste um die App zu beenden...
pause >nul

REM Beim Schliessen alle Node-Prozesse der App beenden
echo.
echo App wird beendet...
taskkill /fi "WINDOWTITLE eq BrunnenbauApp - Backend" /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq BrunnenbauApp - Frontend" /f >nul 2>&1
echo Fertig.
