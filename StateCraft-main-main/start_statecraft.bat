@echo off
title StateCraft Simulation Platform
echo =======================================================================
echo          StateCraft - National Governance Simulation Platform
echo =======================================================================
echo.
echo Starting Python backend server on http://localhost:8000 ...
echo.

start "" http://localhost:8000/
python server.py

pause
