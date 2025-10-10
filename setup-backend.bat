@echo off
echo Setting up Backend...
echo.

cd backend

echo Activating virtual environment...
call venv\Scripts\activate

echo.
echo Installing dependencies...
call pip install -r requirements.txt

echo.
echo Running migrations...
call python manage.py migrate

echo.
echo Creating superuser (optional)...
call python manage.py createsuperuser

echo.
echo Seeding sample data...
call python manage.py seed_data

echo.
echo Starting Django development server...
echo Backend will be available at: http://localhost:8000
echo Django Admin: http://localhost:8000/admin/
echo.
echo Demo credentials:
echo Username: seller1
echo Password: password123
echo.
call python manage.py runserver

pause
