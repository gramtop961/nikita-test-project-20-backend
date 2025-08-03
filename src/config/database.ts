import dotenv from 'dotenv';
import { MongoClient, Db, Collection } from 'mongodb';

// Load environment variables
dotenv.config();

// Debug: Log initial environment state
console.log('Database config - Initial environment check:');
console.log('COSMOS_CONNECTION_STRING available:', !!process.env.COSMOS_CONNECTION_STRING);

// Database and collection configuration
const databaseName = 'yourdeveloper';
const collectionName = 'main';

export let database: Db;
export let collection: Collection;
export let client: MongoClient;
export let isConnected = false;

// Connection retry configuration
const RETRY_INTERVAL = 5000; // 5 seconds
const MAX_RETRIES = 60; // 5 minutes total

// Dummy data for seeding
const dummyData = [
  {
    id: 1,
    type: 'user',
    name: 'John Doe',
    email: 'john.doe@example.com',
    role: 'developer',
    skills: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
    experience: '5 years',
    location: 'San Francisco, CA',
    createdAt: new Date('2024-01-15')
  },
  {
    id: 2,
    type: 'user', 
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    role: 'designer',
    skills: ['UI/UX', 'Figma', 'Adobe Creative Suite', 'Prototyping'],
    experience: '3 years',
    location: 'New York, NY',
    createdAt: new Date('2024-01-20')
  },
  {
    id: 3,
    type: 'project',
    title: 'E-commerce Platform',
    description: 'A modern e-commerce platform built with Next.js and MongoDB',
    status: 'in-progress',
    priority: 'high',
    technologies: ['Next.js', 'MongoDB', 'Stripe', 'Tailwind CSS'],
    estimatedHours: 120,
    assignedTo: 'John Doe',
    deadline: new Date('2024-03-15'),
    createdAt: new Date('2024-01-10')
  },
  {
    id: 4,
    type: 'project',
    title: 'Mobile App Design',
    description: 'Design system and UI/UX for a fitness tracking mobile application',
    status: 'completed',
    priority: 'medium',
    technologies: ['Figma', 'React Native', 'Design System'],
    estimatedHours: 80,
    assignedTo: 'Jane Smith',
    deadline: new Date('2024-02-28'),
    createdAt: new Date('2024-01-05')
  },
  {
    id: 5,
    type: 'task',
    title: 'Implement user authentication',
    description: 'Add JWT-based authentication system with login/logout functionality',
    status: 'pending',
    priority: 'high',
    category: 'backend',
    estimatedHours: 16,
    assignedTo: 'John Doe',
    dueDate: new Date('2024-02-10'),
    createdAt: new Date('2024-01-25')
  },
  {
    id: 6,
    type: 'task',
    title: 'Create responsive dashboard',
    description: 'Design and implement a responsive admin dashboard with charts and metrics',
    status: 'in-progress',
    priority: 'medium',
    category: 'frontend',
    estimatedHours: 24,
    assignedTo: 'Jane Smith',
    dueDate: new Date('2024-02-20'),
    createdAt: new Date('2024-01-22')
  }
];

// Seed database with dummy data
async function seedDatabase() {
  try {
    if (!collection) {
      console.log('Collection not available for seeding');
      return;
    }
    
    // Check if collection already has data
    const existingCount = await collection.countDocuments();
    
    if (existingCount === 0) {
      console.log('No existing data found. Seeding database with dummy data...');
      const result = await collection.insertMany(dummyData);
      console.log(`Successfully inserted ${result.insertedCount} dummy records`);
    } else {
      console.log(`Database already contains ${existingCount} records. Skipping seed.`);
    }
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

// Attempt to establish database connection
async function attemptConnection(): Promise<boolean> {
  try {
    // Reload environment variables to check for new connection string
    dotenv.config();
    
    console.log('Attempting database connection...');
    console.log('COSMOS_CONNECTION_STRING available:', !!process.env.COSMOS_CONNECTION_STRING);
    
    if (!process.env.COSMOS_CONNECTION_STRING) {
      console.log('COSMOS_CONNECTION_STRING not available yet...');
      return false;
    }

    if (client && isConnected) {
      return true;
    }

    // Close existing connection if any
    if (client) {
      await client.close();
    }

    client = new MongoClient(process.env.COSMOS_CONNECTION_STRING);
    await client.connect();
    
    database = client.db(databaseName);
    collection = database.collection(collectionName);
    
    isConnected = true;
    console.log('Connected to MongoDB (Cosmos DB)');
    console.log(`Database ${databaseName} and collection ${collectionName} initialized`);
    
    // Seed database with dummy data
    await seedDatabase();
    
    return true;
  } catch (error) {
    console.error('Error connecting to database:', error);
    isConnected = false;
    return false;
  }
}

// Initialize database connection with retry logic
export async function initializeDatabase() {
  console.log('Initializing database connection...');
  
  let retryCount = 0;
  
  while (retryCount < MAX_RETRIES) {
    const connected = await attemptConnection();
    
    if (connected) {
      console.log('Database connection established successfully');
      return { database, collection };
    }
    
    retryCount++;
    console.log(`Connection attempt ${retryCount}/${MAX_RETRIES} failed. Retrying in ${RETRY_INTERVAL/1000} seconds...`);
    
    // Wait before next retry
    await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
  }
  
  console.log('Failed to establish database connection after maximum retries');
  return null;
}

// Check if database is connected
export function isDatabaseConnected(): boolean {
  return isConnected && !!collection;
}

// Periodic connection checker
export function startConnectionMonitor() {
  console.log('Starting connection monitor...');
  setInterval(async () => {
    // Reload environment variables to check for new connection string
    dotenv.config();
    
    console.log('Connection monitor check - COSMOS_CONNECTION_STRING available:', !!process.env.COSMOS_CONNECTION_STRING);
    
    if (!isConnected && process.env.COSMOS_CONNECTION_STRING) {
      console.log('Connection string available, attempting to connect...');
      await attemptConnection();
    }
  }, 10000); // Check every 10 seconds
}

// Graceful shutdown
process.on('SIGINT', async () => {
  if (client) {
    await client.close();
    console.log('Database connection closed');
  }
  process.exit(0);
}); 