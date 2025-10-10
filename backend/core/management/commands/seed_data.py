from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
import random

from core.models import Seller
from products.models import Product, Category
from customers.models import Customer
from orders.models import Order, Installment, Payment


class Command(BaseCommand):
    help = 'Seed the database with sample data'

    def handle(self, *args, **options):
        self.stdout.write('Starting to seed data...')

        # Create categories
        categories = self.create_categories()
        
        # Create sellers
        sellers = self.create_sellers()
        
        # Create products
        products = self.create_products(sellers, categories)
        
        # Create customers
        customers = self.create_customers()
        
        # Create orders
        orders = self.create_orders(customers, products)
        
        # Create installments
        self.create_installments(orders)
        
        # Create payments
        self.create_payments(orders)

        self.stdout.write(
            self.style.SUCCESS('Successfully seeded data!')
        )

    def create_categories(self):
        categories_data = [
            {'name': 'Electronics', 'description': 'Electronic devices and gadgets'},
            {'name': 'Furniture', 'description': 'Home and office furniture'},
            {'name': 'Appliances', 'description': 'Home appliances'},
            {'name': 'Clothing', 'description': 'Fashion and clothing items'},
            {'name': 'Books', 'description': 'Books and educational materials'},
        ]
        
        categories = []
        for cat_data in categories_data:
            category, created = Category.objects.get_or_create(
                name=cat_data['name'],
                defaults=cat_data
            )
            categories.append(category)
            if created:
                self.stdout.write(f'Created category: {category.name}')
        
        return categories

    def create_sellers(self):
        sellers_data = [
            {
                'username': 'seller1',
                'email': 'seller1@example.com',
                'password': 'password123',
                'first_name': 'John',
                'last_name': 'Smith',
                'business_name': 'TechStore Solutions',
                'business_address': '123 Tech Street, Tech City, TC 12345',
                'phone_number': '+1-555-0101',
                'email_business': 'info@techstore.com',
                'tax_id': 'TC123456789',
            },
            {
                'username': 'seller2',
                'email': 'seller2@example.com',
                'password': 'password123',
                'first_name': 'Sarah',
                'last_name': 'Johnson',
                'business_name': 'Home Comfort Plus',
                'business_address': '456 Home Avenue, Comfort City, CC 67890',
                'phone_number': '+1-555-0202',
                'email_business': 'sales@homecomfort.com',
                'tax_id': 'CC987654321',
            },
        ]
        
        sellers = []
        for seller_data in sellers_data:
            email_business = seller_data.pop('email_business')
            user, created = User.objects.get_or_create(
                username=seller_data['username'],
                defaults={
                    'email': seller_data['email'],
                    'first_name': seller_data['first_name'],
                    'last_name': seller_data['last_name'],
                }
            )
            if created:
                user.set_password(seller_data['password'])
                user.save()
                self.stdout.write(f'Created user: {user.username}')
            
            seller, created = Seller.objects.get_or_create(
                user=user,
                defaults={
                    'business_name': seller_data['business_name'],
                    'business_address': seller_data['business_address'],
                    'phone_number': seller_data['phone_number'],
                    'email': email_business,
                    'tax_id': seller_data['tax_id'],
                }
            )
            if created:
                self.stdout.write(f'Created seller: {seller.business_name}')
            
            sellers.append(seller)
        
        return sellers

    def create_products(self, sellers, categories):
        products_data = [
            {
                'name': 'iPhone 15 Pro',
                'description': 'Latest iPhone with advanced camera system',
                'price': Decimal('999.99'),
                'sku': 'IPH15PRO001',
                'stock_quantity': 50,
                'category': categories[0],  # Electronics
                'seller': sellers[0],
            },
            {
                'name': 'MacBook Air M2',
                'description': 'Ultra-thin laptop with M2 chip',
                'price': Decimal('1199.99'),
                'sku': 'MBA-M2-001',
                'stock_quantity': 25,
                'category': categories[0],  # Electronics
                'seller': sellers[0],
            },
            {
                'name': 'Leather Sofa Set',
                'description': '3-piece leather sofa set in brown',
                'price': Decimal('1899.99'),
                'sku': 'SOFA-LEATHER-001',
                'stock_quantity': 10,
                'category': categories[1],  # Furniture
                'seller': sellers[1],
            },
            {
                'name': 'Refrigerator 25cu ft',
                'description': 'Stainless steel side-by-side refrigerator',
                'price': Decimal('1299.99'),
                'sku': 'FRIDGE-25SS-001',
                'stock_quantity': 15,
                'category': categories[2],  # Appliances
                'seller': sellers[1],
            },
            {
                'name': 'Designer Jeans',
                'description': 'Premium quality designer jeans',
                'price': Decimal('89.99'),
                'sku': 'JEANS-DESIGNER-001',
                'stock_quantity': 100,
                'category': categories[3],  # Clothing
                'seller': sellers[0],
            },
        ]
        
        products = []
        for prod_data in products_data:
            product, created = Product.objects.get_or_create(
                sku=prod_data['sku'],
                defaults=prod_data
            )
            if created:
                self.stdout.write(f'Created product: {product.name}')
            products.append(product)
        
        return products

    def create_customers(self):
        customers_data = [
            {
                'first_name': 'Alice',
                'last_name': 'Brown',
                'email': 'alice.brown@email.com',
                'phone_number': '+1-555-1001',
                'address': '789 Customer Lane, Customer City, CC 11111',
                'date_of_birth': datetime(1990, 5, 15).date(),
            },
            {
                'first_name': 'Bob',
                'last_name': 'Wilson',
                'email': 'bob.wilson@email.com',
                'phone_number': '+1-555-1002',
                'address': '321 Buyer Boulevard, Buyer City, BC 22222',
                'date_of_birth': datetime(1985, 8, 22).date(),
            },
            {
                'first_name': 'Carol',
                'last_name': 'Davis',
                'email': 'carol.davis@email.com',
                'phone_number': '+1-555-1003',
                'address': '654 Shopper Street, Shopper City, SC 33333',
                'date_of_birth': datetime(1992, 12, 3).date(),
            },
        ]
        
        customers = []
        for cust_data in customers_data:
            customer, created = Customer.objects.get_or_create(
                email=cust_data['email'],
                defaults=cust_data
            )
            if created:
                self.stdout.write(f'Created customer: {customer.full_name}')
            customers.append(customer)
        
        return customers

    def create_orders(self, customers, products):
        orders = []
        
        # Create orders with different statuses
        order_data = [
            {
                'customer': customers[0],
                'product': products[0],  # iPhone
                'quantity': 1,
                'total_amount': Decimal('999.99'),
                'down_payment': Decimal('200.00'),
                'installment_count': 6,
                'status': 'approved',
                'start_date': timezone.now().date(),
            },
            {
                'customer': customers[1],
                'product': products[1],  # MacBook
                'quantity': 1,
                'total_amount': Decimal('1199.99'),
                'down_payment': Decimal('300.00'),
                'installment_count': 12,
                'status': 'approved',
                'start_date': timezone.now().date(),
            },
            {
                'customer': customers[2],
                'product': products[2],  # Sofa
                'quantity': 1,
                'total_amount': Decimal('1899.99'),
                'down_payment': Decimal('500.00'),
                'installment_count': 18,
                'status': 'pending',
            },
        ]
        
        for order_info in order_data:
            # Calculate monthly payment before creating the order
            monthly_payment = (order_info['total_amount'] - order_info['down_payment']) / order_info['installment_count']
            order_info['monthly_payment'] = monthly_payment
            
            order = Order.objects.create(**order_info)
            order.approved_date = timezone.now() if order.status == 'approved' else None
            order.save()
            
            self.stdout.write(f'Created order: {order.id} for {order.customer.full_name}')
            orders.append(order)
        
        return orders

    def create_installments(self, orders):
        for order in orders:
            if order.status == 'approved':
                # Generate installments
                for i in range(1, order.installment_count + 1):
                    due_date = order.start_date + timedelta(days=30 * i)
                    installment = Installment.objects.create(
                        order=order,
                        installment_number=i,
                        amount=order.monthly_payment,
                        due_date=due_date,
                        status='pending'
                    )
                
                self.stdout.write(f'Created {order.installment_count} installments for order {order.id}')

    def create_payments(self, orders):
        for order in orders:
            if order.status == 'approved' and order.installments.exists():
                # Make some payments for the first few installments
                installments = order.installments.all()[:3]  # First 3 installments
                
                for i, installment in enumerate(installments):
                    if i < 2:  # Pay first 2 installments
                        payment = Payment.objects.create(
                            order=order,
                            installment=installment,
                            amount=installment.amount,
                            payment_method='card',
                            payment_date=timezone.now() - timedelta(days=30 * i),
                            reference_number=f'PAY-{order.id}-{i+1}',
                            notes=f'Payment for installment {installment.installment_number}',
                        )
                        self.stdout.write(f'Created payment for installment {installment.installment_number}')
        
        self.stdout.write('Sample data seeding completed!')
