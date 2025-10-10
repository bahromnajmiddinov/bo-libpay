# Quick Setup Guide

## 🚀 Quick Start (Windows)

### Option 1: Using Setup Scripts

1. **Backend Setup**
   ```bash
   setup-backend.bat
   ```

2. **Frontend Setup** (in a new terminal)
   ```bash
   setup-frontend.bat
   ```

### Option 2: Manual Setup

#### Backend Setup
```bash
cd backend
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_data
python manage.py runserver
```

#### Frontend Setup
```bash
cd frontend
copy env.example .env
npm install
npm start
```

## 🌐 Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api/
- **Django Admin**: http://localhost:8000/admin/

## 👤 Demo Credentials

- **Seller Login**: `seller1` / `password123`
- **Admin**: Create during setup or use `admin` / `admin123`

## 📊 What You'll See

The application includes sample data:
- 2 sellers with different business types
- 5 products across various categories
- 3 customers with complete profiles
- Sample orders with installment plans
- Payment history and schedules

## 🔧 Troubleshooting

### Backend Issues
- Make sure virtual environment is activated
- Check if port 8000 is available
- Verify all dependencies are installed

### Frontend Issues
- Make sure Node.js is installed
- Check if port 3000 is available
- Verify .env file exists in frontend directory

### API Connection Issues
- Ensure backend is running on port 8000
- Check REACT_APP_API_URL in .env file
- Verify CORS settings in Django

## 📱 Features to Test

1. **Login** with demo credentials
2. **Dashboard** - view metrics and due payments
3. **Products** - manage product catalog
4. **Customers** - view customer database
5. **Orders** - manage orders and payments
6. **Customer Portal** - http://localhost:3000/customer-portal/1

## 🐳 Docker Alternative

If you prefer Docker:
```bash
docker-compose up --build
```

This will start all services automatically.
