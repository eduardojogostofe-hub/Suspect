@echo off
setlocal
cd /d "%~dp0"

title SUSPECT - Servidor

echo Iniciando o servidor SUSPECT...

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js nao foi encontrado no PATH.
  echo Instale o Node.js e tente novamente.
  pause
  exit /b 1
)

if not exist "node_modules\express" (
  echo Dependencias nao encontradas. Instalando...
  call npm install
  if errorlevel 1 (
    echo Falha ao instalar as dependencias.
    pause
    exit /b 1
  )
)

start "SUSPECT Server" /D "%~dp0" cmd /k node server\index.js

set "READY="
for /L %%N in (1,1,15) do (
  if not defined READY (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -UseBasicParsing http://localhost:3000/health -TimeoutSec 1 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
    if not errorlevel 1 set "READY=1"
    if not defined READY timeout /t 1 /nobreak >nul
  )
)

if not defined READY (
  echo O servidor nao respondeu na porta 3000.
  echo Verifique a janela SUSPECT Server para ver o erro.
  pause
  exit /b 1
)

start "" "http://localhost:3000/?v=2"

endlocal
exit /b 0
