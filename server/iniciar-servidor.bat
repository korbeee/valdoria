@echo off
title Servidor de Valdoria
cd /d "%~dp0"
set "NODE_EXE="
for /f "delims=" %%N in ('where.exe node 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%N"
if not defined NODE_EXE if exist "%~dp0runtime\node\node.exe" set "NODE_EXE=%~dp0runtime\node\node.exe"
if not defined NODE_EXE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_EXE if exist "%LocalAppData%\Programs\nodejs\node.exe" set "NODE_EXE=%LocalAppData%\Programs\nodejs\node.exe"
if not defined NODE_EXE (
	echo Node.js nao foi encontrado.
	echo Instale o Node.js 18 ou superior em https://nodejs.org/ e tente novamente.
	pause
	exit /b 1
)
"%NODE_EXE%" server.js
pause
