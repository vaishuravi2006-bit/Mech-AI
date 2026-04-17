@echo off
TITLE Aurora Vehicle AI - Launcher
COLOR 0A
CLS

ECHO ========================================================
ECHO          AURORA VEHICLE DIAGNOSIS SYSTEM
ECHO ========================================================
ECHO.
ECHO [1/3] Checking Python...
python --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    ECHO ERROR: Python is not installed or not in PATH.
    ECHO Please install Python from https://www.python.org/
    PAUSE
    EXIT /B
)

ECHO [2/3] Installing/Verifying Libraries...
python -m pip install -r requirements.txt
IF %ERRORLEVEL% NEQ 0 (
    ECHO.
    ECHO Warning: Requirement installation failed.
    ECHO Attempting to run anyway, or try running 'fix_pip.py' first.
    ECHO.
)

ECHO [3/3] Starting Application...
ECHO.
ECHO ********************************************************
ECHO *  OPEN YOUR BROWSER TO: http://127.0.0.1:5000         *
ECHO *  Press CTRL+C in this window to stop the server.     *
ECHO ********************************************************
ECHO.
python app.py

PAUSE
