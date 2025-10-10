@echo off
echo Setting up Frontend...
echo.

echo Copying environment file...
copy frontend\env.example frontend\.env

echo.
echo Installing dependencies...
cd frontend
call npm install

echo.
echo Starting development server...
echo Frontend will be available at: http://localhost:3000
echo Backend API is available at: http://localhost:8000/api/
echo.
echo Demo credentials:
echo Username: seller1
echo Password: password123
echo.
call npm start

pause
