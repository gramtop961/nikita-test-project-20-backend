import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase, collection, isDatabaseConnected, startConnectionMonitor } from './config/database';

dotenv.config();

// Debug: Log environment variables
console.log('Environment variables loaded:');
console.log('COSMOS_CONNECTION_STRING:', process.env.COSMOS_CONNECTION_STRING ? 'SET' : 'NOT SET');
console.log('PORT:', process.env.PORT || '3000 (default)');

const app = express();
const port = process.env.PORT || 3000;

const corsOptions = {
  origin: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Initialize database connection
initializeDatabase().catch(console.error);

// Start connection monitor to check for connection string availability
startConnectionMonitor();

// Middleware to check database connection
const requireDatabase = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!isDatabaseConnected()) {
    return res.status(503).json({ 
      error: 'Database not available', 
      message: 'The database connection is not yet established. Please try again later.' 
    });
  }
  next();
};

app.get('/', (req: express.Request, res: express.Response) => {
  res.send('Hello from the backend!');
});

app.get('/api/hello', (req: express.Request, res: express.Response) => {
  res.json({ message: 'Hello from the dummy API!' });
});

// Get all items with optional filtering
app.get('/api/items', requireDatabase, async (req: express.Request, res: express.Response) => {
  try {
    const { type, status, priority, search, limit = 50, offset = 0 } = req.query;
    
    // Build query object
    const query: any = {};
    
    if (type) query.type = type;
    if (status) query.status = status;
    if (priority) query.priority = priority;
    
    // Add search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const items = await collection
      .find(query)
      .skip(parseInt(offset as string))
      .limit(parseInt(limit as string))
      .toArray();
    
    const total = await collection.countDocuments(query);
    
    res.json({
      items,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: parseInt(offset as string) + parseInt(limit as string) < total
      }
    });
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// Get users only
app.get('/api/users', requireDatabase, async (req: express.Request, res: express.Response) => {
  try {
    const { role, search } = req.query;
    
    const query: any = { type: 'user' };
    if (role) query.role = role;
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { role: { $regex: search, $options: 'i' } }
      ];
    }
    
    const users = await collection.find(query).toArray();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get projects only
app.get('/api/projects', requireDatabase, async (req: express.Request, res: express.Response) => {
  try {
    const { status, priority, assignedTo } = req.query;
    
    const query: any = { type: 'project' };
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;
    
    const projects = await collection.find(query).toArray();
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get tasks only
app.get('/api/tasks', requireDatabase, async (req: express.Request, res: express.Response) => {
  try {
    const { status, priority, category, assignedTo } = req.query;
    
    const query: any = { type: 'task' };
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;
    if (assignedTo) query.assignedTo = assignedTo;
    
    const tasks = await collection.find(query).toArray();
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get item by ID
app.get('/api/items/:id', requireDatabase, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const item = await collection.findOne({ 
      $or: [
        { id: parseInt(id) },
        { _id: id }
      ]
    });
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json(item);
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// Get statistics/summary
app.get('/api/stats', requireDatabase, async (req: express.Request, res: express.Response) => {
  try {
    const totalItems = await collection.countDocuments();
    const userCount = await collection.countDocuments({ type: 'user' });
    const projectCount = await collection.countDocuments({ type: 'project' });
    const taskCount = await collection.countDocuments({ type: 'task' });
    
    const projectStats = await collection.aggregate([
      { $match: { type: 'project' } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray();
    
    const taskStats = await collection.aggregate([
      { $match: { type: 'task' } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray();
    
    res.json({
      totals: {
        total: totalItems,
        users: userCount,
        projects: projectCount,
        tasks: taskCount
      },
      projectsByStatus: projectStats.reduce((acc: any, stat: any) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      tasksByStatus: taskStats.reduce((acc: any, stat: any) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Create a new item
app.post('/api/items', requireDatabase, async (req: express.Request, res: express.Response) => {
  try {
    const { _id, ...itemBody } = req.body;
    
    // Generate next ID for new items - avoid sorting by finding max ID
    const items = await collection.find({}, { projection: { id: 1 } }).toArray();
    const maxId = items.length > 0 ? Math.max(...items.map((item: any) => item.id || 0)) : 0;
    const nextId = maxId + 1;
    
    const newItem = {
      id: nextId,
      ...itemBody,
      createdAt: new Date()
    };
    
    const result = await collection.insertOne(newItem);
    res.status(201).json({ ...newItem, _id: result.insertedId });
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// Update an item
app.put('/api/items/:id', requireDatabase, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    delete updateData._id; // Remove _id from update data
    updateData.updatedAt = new Date();
    
    const result = await collection.updateOne(
      { 
        $or: [
          { id: parseInt(id) },
          { _id: id }
        ]
      },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    const updatedItem = await collection.findOne({ 
      $or: [
        { id: parseInt(id) },
        { _id: id }
      ]
    });
    
    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Delete an item
app.delete('/api/items/:id', requireDatabase, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const result = await collection.deleteOne({ 
      $or: [
        { id: parseInt(id) },
        { _id: id }
      ]
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Health check endpoint
app.get('/api/health', (req: express.Request, res: express.Response) => {
  res.json({
    status: 'ok',
    database: isDatabaseConnected() ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(`Backend listening at http://localhost:${port}`);
}); 