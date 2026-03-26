@echo off
echo Starting SAMI API Server...
cd /d "%~dp0"
call .\venv312\Scripts\activate
uvicorn app.main:app --reload --port 8000
