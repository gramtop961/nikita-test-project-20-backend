# Backend API

This is a Node.js/Express backend API with dynamic database connection support for Azure Cosmos DB.

## Features

- **Dynamic Database Connection**: The application can start without a database connection string and will establish the connection when it becomes available
- **Retry Logic**: Automatically retries database connection with configurable intervals
- **Health Check**: Provides a health check endpoint to monitor database connection status
- **Graceful Error Handling**: Returns appropriate error responses when database is not available

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables (optional for initial startup):
```bash
# Create .env file
COSMOS_CONNECTION_STRING=your_cosmos_db_connection_string
FRONTEND_URL=http://localhost:3000
PORT=3001
```

## Running the Application

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

## Database Connection Behavior

The application handles database connection dynamically:

1. **Initial Startup**: The app starts even without a connection string
2. **Connection Retry**: Attempts to connect every 5 seconds for up to 5 minutes
3. **Periodic Monitoring**: Checks for connection string availability every 10 seconds
4. **Graceful Handling**: API endpoints return 503 status when database is unavailable

## API Endpoints

### Health Check
- `GET /api/health` - Check application and database status

### Data Endpoints (require database connection)
- `GET /api/items` - Get all items with filtering
- `GET /api/users` - Get users only
- `GET /api/projects` - Get projects only
- `GET /api/tasks` - Get tasks only
- `GET /api/items/:id` - Get item by ID
- `GET /api/stats` - Get statistics
- `POST /api/items` - Create new item
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item

## Error Responses

When the database is not available, endpoints return:
```json
{
  "error": "Database not available",
  "message": "The database connection is not yet established. Please try again later."
}
```

## Configuration

Database connection settings can be modified in `src/config/database.ts`:
- `RETRY_INTERVAL`: Time between connection attempts (default: 5000ms)
- `MAX_RETRIES`: Maximum number of retry attempts (default: 60)
- Connection monitor interval: 10000ms (10 seconds) 