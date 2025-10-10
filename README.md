# Pay-in-Installments Application

A comprehensive full-stack application for managing pay-in-installments business operations. Built with React frontend and Django REST Framework backend, this application helps sellers manage products, customers, orders with installment plans, payments, and automated reminders.

## Features

### Backend (Django + Django REST Framework)
- **Authentication**: JWT-based authentication for secure API access
- **Models**: Complete data models for sellers, products, customers, orders, installments, and payments
- **REST APIs**: Comprehensive RESTful API endpoints with proper validation
- **Admin Dashboard**: Django admin interface for data management
- **Payment Reminders**: Automated email and in-app payment reminders using Celery
- **Reporting**: Built-in reporting for outstanding balances, due payments, and overdue accounts
- **Database**: PostgreSQL support with SQLite for development
- **Task Queue**: Celery with Redis for background tasks

### Frontend (React)
- **Authentication**: Login and registration with JWT tokens
- **Dashboard**: Real-time dashboard with key metrics and alerts
- **Product Management**: CRUD operations for products and categories
- **Customer Management**: Customer database with order history
- **Order Management**: Order creation, approval, and tracking
- **Payment Tracking**: Installment and payment management
- **Customer Portal**: Public portal for customers to view their payment status
- **Responsive Design**: Mobile-friendly interface with modern UI

### Key Business Features
- **Installment Plans**: Flexible installment scheduling with customizable terms
- **Payment Tracking**: Complete payment history and status tracking
- **Automated Reminders**: Email and in-app notifications for due payments
- **Reporting**: Comprehensive reports for business analytics
- **Multi-seller Support**: Each seller manages their own products and customers
- **Customer Portal**: Secure customer access to payment information

## Technology Stack

### Backend
- Django 4.2.7
- Django REST Framework 3.14.0
- PostgreSQL (production) / SQLite (development)
- Redis (task queue)
- Celery (background tasks)
- JWT Authentication
- WhiteNoise (static files)

### Frontend
- React 18.2.0
- React Router DOM 6.8.1
- React Query (data fetching)
- React Hook Form (forms)
- Axios (HTTP client)
- React Toastify (notifications)

### DevOps
- Docker & Docker Compose
- Gunicorn (WSGI server)
- Nginx (reverse proxy - optional)

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)

### Using Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd installments-app
   ```

2. **Start the application**
   ```bash
   docker-compose up --build
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - Django Admin: http://localhost:8000/admin
   - API Documentation: http://localhost:8000/api/

4. **Default credentials**
   - Admin: `admin` / `admin123` (you'll be prompted to set password)
   - Demo Seller: `seller1` / `password123`

### Local Development

#### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp env_example .env
   # Edit .env with your configuration
   ```

5. **Run migrations**
   ```bash
   python manage.py migrate
   ```

6. **Create superuser**
   ```bash
   python manage.py createsuperuser
   ```

7. **Seed sample data**
   ```bash
   python manage.py seed_data
   ```

8. **Start the development server**
   ```bash
   python manage.py runserver
   ```

#### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/register/` - Register new seller
- `POST /api/login/` - Login seller
- `GET /api/profile/` - Get seller profile

### Products
- `GET /api/products/` - List products
- `POST /api/products/` - Create product
- `GET /api/products/{id}/` - Get product details
- `PUT /api/products/{id}/` - Update product
- `DELETE /api/products/{id}/` - Delete product

### Customers
- `GET /api/customers/` - List customers
- `POST /api/customers/` - Create customer
- `GET /api/customers/{id}/` - Get customer details
- `PUT /api/customers/{id}/` - Update customer

### Orders
- `GET /api/orders/` - List orders
- `POST /api/orders/` - Create order
- `GET /api/orders/{id}/` - Get order details
- `POST /api/orders/{id}/approve/` - Approve order
- `GET /api/orders/dashboard/stats/` - Get dashboard statistics

## Database Schema

### Core Models
- **Seller**: Business information and user account
- **Product**: Product catalog with installment options
- **Customer**: Customer information and contact details

### Order Management
- **Order**: Customer orders with installment plans
- **Installment**: Individual payment installments
- **Payment**: Payment records and history
- **PaymentReminder**: Automated reminder tracking

## Background Tasks

The application uses Celery for background tasks:

- **Payment Reminders**: Daily check for due and overdue payments
- **Installment Generation**: Automatic creation of installment schedules
- **Email Notifications**: Automated email reminders

To run Celery workers locally:
```bash
# Terminal 1: Start Redis
redis-server

# Terminal 2: Start Celery worker
cd backend
celery -A installments_project worker -l info

# Terminal 3: Start Celery beat (scheduler)
celery -A installments_project beat -l info
```

## Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
SECRET_KEY=your-secret-key-here
DEBUG=True
DATABASE_URL=sqlite:///db.sqlite3
REDIS_URL=redis://localhost:6379/0
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
ALLOWED_HOSTS=localhost,127.0.0.1
```

### Frontend Configuration

Create a `.env` file in the frontend directory:

```env
REACT_APP_API_URL=http://localhost:8000/api
```

## Testing

### Backend Tests
```bash
cd backend
python manage.py test
```

### Frontend Tests
```bash
cd frontend
npm test
```

## Deployment

### Production Deployment

1. **Update environment variables** for production
2. **Set DEBUG=False** in Django settings
3. **Configure database** (PostgreSQL recommended)
4. **Set up email** configuration for reminders
5. **Configure static files** serving
6. **Set up SSL** certificates
7. **Configure domain** and DNS

### Docker Production

```bash
# Build and start production containers
docker-compose -f docker-compose.prod.yml up --build
```

## Sample Data

The application includes a comprehensive seed data command that creates:

- 2 sample sellers with different business types
- 5 product categories (Electronics, Furniture, Appliances, Clothing, Books)
- 5 sample products with different installment options
- 3 sample customers
- Sample orders with different statuses
- Installment schedules
- Sample payments

Run the seed command:
```bash
python manage.py seed_data
```

## Customer Portal

Customers can access their payment information through a public portal:

```
http://localhost:3000/customer-portal/{customer_id}
```

This portal shows:
- Order history
- Payment schedules
- Payment history
- Outstanding balances

## API Documentation

Once the server is running, you can access the API documentation at:
- Swagger UI: http://localhost:8000/api/docs/
- ReDoc: http://localhost:8000/api/redoc/

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation
- Review the API endpoints

## Roadmap

Future enhancements planned:
- [ ] Mobile app (React Native)
- [ ] Advanced reporting and analytics
- [ ] Integration with payment gateways
- [ ] SMS notifications
- [ ] Multi-language support
- [ ] Advanced user roles and permissions
- [ ] API rate limiting
- [ ] Comprehensive test coverage
- [ ] Performance monitoring
- [ ] Backup and recovery tools
