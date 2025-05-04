# Backend CRUD API

A simple CRUD API server built with FastAPI.

## Requirements

- Python 3.7+
- FastAPI
- Uvicorn

## Setup

1. Install the required packages:
   ```
   pip install -r requirements.txt
   ```

2. Run the server:
   ```
   python backend.py
   ```

The API will be available at `http://localhost:8000`

## API Documentation

Once the server is running, you can access the auto-generated Swagger documentation at:
- `http://localhost:8000/docs`

Or the ReDoc documentation at:
- `http://localhost:8000/redoc`

## API Endpoints

- `POST /items/` - Create a new item
- `GET /items/` - Get all items
- `GET /items/{item_id}` - Get a specific item
- `PUT /items/{item_id}` - Update an item
- `DELETE /items/{item_id}` - Delete an item

## Data Model

```json
{
  "name": "string",
  "description": "string",
  "price": 0.0
}
``` 