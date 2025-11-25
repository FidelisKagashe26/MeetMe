# Location-Based Marketplace Backend API

A Django REST Framework backend for a location-based marketplace that connects buyers with nearby sellers. The system uses Mapbox APIs for geocoding and distance calculations.

## Features

- User authentication with token-based auth
- Seller profiles with geographic locations
- Product listings with categories
- Location-based search using Mapbox
- Distance calculation between buyers and sellers
- Product filtering by price, category, and distance
- Seller reviews and ratings
- User favorites
- Mobile-friendly REST API

## Tech Stack

- Django 4.2+
- Django REST Framework
- MySQL Database
- Mapbox API for geocoding and maps
- Token-based authentication

## Installation

### Prerequisites

- Python 3.8+
- MySQL 5.7+ or MariaDB 10.3+
- Mapbox API key

### Setup Steps

1. **Clone or navigate to the project directory**

```bash
cd marketplace_backend
```

2. **Create and activate virtual environment**

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**

```bash
pip install -r requirements.txt
```

4. **Create MySQL database**

```sql
CREATE DATABASE marketplace_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

5. **Configure environment variables**

Copy `.env.example` to `.env` and update with your settings:

```bash
cp .env.example .env
```

Edit `.env` file:

```env
DJANGO_SECRET_KEY=your-secret-key-here
DEBUG=True

DB_NAME=marketplace_db
DB_USER=root
DB_PASSWORD=your-password
DB_HOST=localhost
DB_PORT=3306

MAPBOX_ACCESS_TOKEN=your-mapbox-access-token
```

6. **Run migrations**

```bash
python manage.py makemigrations
python manage.py migrate
```

7. **Create superuser (optional)**

```bash
python manage.py createsuperuser
```

8. **Run development server**

```bash
python manage.py runserver
```

The API will be available at `http://localhost:8000/api/`

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register/` | Register new user |
| POST | `/api/auth/login/` | Login user |
| POST | `/api/auth/logout/` | Logout user |

**Register Example:**
```json
POST /api/auth/register/
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securepass123",
  "password_confirm": "securepass123",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Login Example:**
```json
POST /api/auth/login/
{
  "username": "john_doe",
  "password": "securepass123"
}
```

### Sellers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sellers/` | List all sellers |
| POST | `/api/sellers/` | Create seller profile (authenticated) |
| GET | `/api/sellers/{id}/` | Get seller details |
| PUT | `/api/sellers/{id}/` | Update seller profile |
| GET | `/api/sellers/nearby/` | Find nearby sellers |
| GET | `/api/sellers/{id}/products/` | Get seller's products |
| GET | `/api/sellers/{id}/reviews/` | Get seller's reviews |

**Create Seller Example:**
```json
POST /api/sellers/
{
  "business_name": "Fresh Fruits Market",
  "description": "Local organic fruits and vegetables",
  "phone_number": "+1234567890",
  "location": {
    "address": "123 Main St, San Francisco, CA",
    "city": "San Francisco",
    "state": "CA",
    "country": "USA",
    "postal_code": "94102",
    "latitude": "37.7749",
    "longitude": "-122.4194"
  }
}
```

**Find Nearby Sellers:**
```
GET /api/sellers/nearby/?latitude=37.7749&longitude=-122.4194&radius=10
```

### Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products/` | List all products |
| POST | `/api/products/` | Create product (seller only) |
| GET | `/api/products/{id}/` | Get product details |
| PUT | `/api/products/{id}/` | Update product |
| DELETE | `/api/products/{id}/` | Delete product |
| POST | `/api/products/search_nearby/` | Search products by location |

**Create Product Example:**
```json
POST /api/products/
{
  "category_id": 1,
  "name": "Organic Apples",
  "description": "Fresh organic apples from local farm",
  "price": "4.99",
  "currency": "USD",
  "stock_quantity": 100,
  "is_active": true,
  "image_url": "https://example.com/apples.jpg"
}
```

**Search Nearby Products:**
```json
POST /api/products/search_nearby/
{
  "latitude": "37.7749",
  "longitude": "-122.4194",
  "radius": 15,
  "category": "Fruits",
  "min_price": "1.00",
  "max_price": "10.00",
  "sort_by": "distance"
}
```

Query Parameters for GET /api/products/:
- `category` - Filter by category name
- `min_price` - Minimum price
- `max_price` - Maximum price
- `search` - Search in name/description

### Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories/` | List all categories |
| POST | `/api/categories/` | Create category (authenticated) |
| GET | `/api/categories/{id}/` | Get category details |

### Reviews

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reviews/` | List all reviews |
| POST | `/api/reviews/` | Create review (authenticated) |
| GET | `/api/reviews/{id}/` | Get review details |
| PUT | `/api/reviews/{id}/` | Update review |

**Create Review Example:**
```json
POST /api/reviews/
{
  "seller": 1,
  "rating": 5,
  "comment": "Excellent service and quality products!"
}
```

Query Parameters:
- `seller_id` - Filter reviews by seller

### Favorites

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/favorites/` | List user's favorites |
| POST | `/api/favorites/toggle/` | Toggle favorite status |

**Toggle Favorite:**
```json
POST /api/favorites/toggle/
{
  "seller_id": 1
}
```

### Mapbox Utilities

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/mapbox/geocode/` | Convert address to coordinates |
| POST | `/api/mapbox/reverse-geocode/` | Convert coordinates to address |
| POST | `/api/mapbox/distance/` | Calculate distance between points |

**Geocode Example:**
```json
POST /api/mapbox/geocode/
{
  "address": "1600 Amphitheatre Parkway, Mountain View, CA"
}
```

**Calculate Distance:**
```json
POST /api/mapbox/distance/
{
  "latitude1": "37.7749",
  "longitude1": "-122.4194",
  "latitude2": "34.0522",
  "longitude2": "-118.2437"
}
```

## Authentication

Most endpoints require authentication. Include the token in the Authorization header:

```
Authorization: Token your-token-here
```

After login/register, you'll receive a token:

```json
{
  "token": "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com"
  }
}
```

## Models

### User (Django built-in)
- Standard Django User model

### SellerProfile
- User profile extension for sellers
- Business information
- Ratings and verification status

### Location
- Geographic coordinates for sellers
- Address information
- Mapbox place ID

### Category
- Product categories

### Product
- Products listed by sellers
- Price, stock, and availability
- Associated with category and seller

### ProductImage
- Multiple images per product

### Review
- Seller reviews by users
- Ratings and comments

### Favorite
- User's favorite sellers

## Distance Calculation

The system uses the Haversine formula for calculating distances between coordinates. This provides accurate distance calculations for nearby search.

Key functions in `api/utils.py`:
- `haversine_distance()` - Calculate distance between two points
- `filter_by_radius()` - Filter queryset by distance radius
- `add_distance_to_queryset()` - Add distance attribute to results

## Mapbox Integration

The Mapbox service (`MapboxService` class) provides:
- **Geocoding**: Convert addresses to coordinates
- **Reverse Geocoding**: Convert coordinates to addresses
- **Distance Matrix**: Calculate distances between multiple points

Add your Mapbox access token to the `.env` file.

## Admin Panel

Access the Django admin panel at `http://localhost:8000/admin/`

Use the superuser credentials you created to manage:
- Users
- Seller profiles
- Products and categories
- Reviews and favorites

## Development

### Running Tests

```bash
python manage.py test
```

### Creating Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

### Collect Static Files

```bash
python manage.py collectstatic
```

## Production Deployment

1. Set `DEBUG=False` in `.env`
2. Configure `ALLOWED_HOSTS` in `settings.py`
3. Use a production WSGI server (e.g., Gunicorn)
4. Set up proper database backups
5. Use environment variables for secrets
6. Enable HTTPS
7. Configure CORS properly for your frontend domain

## Frontend Integration

This backend is designed to work with any frontend framework. The API returns JSON responses and supports CORS.

Example frontend call:

```javascript
// Login
const response = await fetch('http://localhost:8000/api/auth/login/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    username: 'john_doe',
    password: 'securepass123'
  })
});

const data = await response.json();
const token = data.token;

// Get nearby sellers
const sellersResponse = await fetch(
  'http://localhost:8000/api/sellers/nearby/?latitude=37.7749&longitude=-122.4194&radius=10',
  {
    headers: {
      'Authorization': `Token ${token}`
    }
  }
);

const sellers = await sellersResponse.json();
```

## License

MIT

## Support

For issues or questions, please open an issue in the repository.
