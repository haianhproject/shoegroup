@rem Muc dich: Chay Maven cho backend Spring tren Windows qua script PowerShell.
@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\maven.ps1" %*
exit /b %ERRORLEVEL%
