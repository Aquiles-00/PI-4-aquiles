@echo off
chcp 65001 >nul
cls
echo ======================================================================
echo          MP Consultoria - Portal de Servicos Financeiros
echo ======================================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [AVISO] Node.js nao foi detectado neste computador.
    echo.
    echo Nao se preocupe! O portal funciona perfeitamente sem Node.js.
    echo Abrindo o portal diretamente no seu navegador padrao...
    echo.
    start "" "Abrir_Portal.html"
    echo Pressione qualquer tecla para encerrar.
    pause >nul
    exit /b
)

if not exist node_modules (
    echo [1/3] Instalando dependencias - primeira execucao...
    call npm.cmd install
)

if not exist "data\financial_portal.sqlite" (
    echo [2/3] Inicializando banco de dados com dados de teste...
    call node src/database/seeds.js
)

echo [3/3] Iniciando servidor e abrindo o navegador...
echo.

start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3000"

echo ======================================================================
echo  Servidor no ar em: http://localhost:3000
echo  Area do Cliente:   http://localhost:3000/client_portal.html
echo  Documentacao API:  http://localhost:3000/api/info
echo.
echo  Mantenha esta janela aberta enquanto estiver utilizando o sistema.
echo  Para encerrar o sistema, feche esta janela ou pressione Ctrl+C.
echo ======================================================================
echo.

node src/server.js
pause