"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isConnected = exports.client = exports.collection = exports.database = void 0;
exports.initializeDatabase = initializeDatabase;
exports.isDatabaseConnected = isDatabaseConnected;
exports.startConnectionMonitor = startConnectionMonitor;
const dotenv_1 = __importDefault(require("dotenv"));
const mongodb_1 = require("mongodb");
// Load environment variables
dotenv_1.default.config();
// Debug: Log initial environment state
console.log('Database config - Initial environment check:');
console.log('COSMOS_CONNECTION_STRING available:', !!process.env.COSMOS_CONNECTION_STRING);
// Database and collection configuration
const databaseName = 'yourdeveloper';
const collectionName = 'main';
exports.isConnected = false;
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
function seedDatabase() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!exports.collection) {
                console.log('Collection not available for seeding');
                return;
            }
            // Check if collection already has data
            const existingCount = yield exports.collection.countDocuments();
            if (existingCount === 0) {
                console.log('No existing data found. Seeding database with dummy data...');
                const result = yield exports.collection.insertMany(dummyData);
                console.log(`Successfully inserted ${result.insertedCount} dummy records`);
            }
            else {
                console.log(`Database already contains ${existingCount} records. Skipping seed.`);
            }
        }
        catch (error) {
            console.error('Error seeding database:', error);
            throw error;
        }
    });
}
// Attempt to establish database connection
function attemptConnection() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Reload environment variables to check for new connection string
            dotenv_1.default.config();
            console.log('Attempting database connection...');
            console.log('COSMOS_CONNECTION_STRING available:', !!process.env.COSMOS_CONNECTION_STRING);
            if (!process.env.COSMOS_CONNECTION_STRING) {
                console.log('COSMOS_CONNECTION_STRING not available yet...');
                return false;
            }
            if (exports.client && exports.isConnected) {
                return true;
            }
            // Close existing connection if any
            if (exports.client) {
                yield exports.client.close();
            }
            exports.client = new mongodb_1.MongoClient(process.env.COSMOS_CONNECTION_STRING);
            yield exports.client.connect();
            exports.database = exports.client.db(databaseName);
            exports.collection = exports.database.collection(collectionName);
            exports.isConnected = true;
            console.log('Connected to MongoDB (Cosmos DB)');
            console.log(`Database ${databaseName} and collection ${collectionName} initialized`);
            // Seed database with dummy data
            yield seedDatabase();
            return true;
        }
        catch (error) {
            console.error('Error connecting to database:', error);
            exports.isConnected = false;
            return false;
        }
    });
}
// Initialize database connection with retry logic
function initializeDatabase() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Initializing database connection...');
        let retryCount = 0;
        while (retryCount < MAX_RETRIES) {
            const connected = yield attemptConnection();
            if (connected) {
                console.log('Database connection established successfully');
                return { database: exports.database, collection: exports.collection };
            }
            retryCount++;
            console.log(`Connection attempt ${retryCount}/${MAX_RETRIES} failed. Retrying in ${RETRY_INTERVAL / 1000} seconds...`);
            // Wait before next retry
            yield new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
        }
        console.log('Failed to establish database connection after maximum retries');
        return null;
    });
}
// Check if database is connected
function isDatabaseConnected() {
    return exports.isConnected && !!exports.collection;
}
// Periodic connection checker
function startConnectionMonitor() {
    console.log('Starting connection monitor...');
    setInterval(() => __awaiter(this, void 0, void 0, function* () {
        // Reload environment variables to check for new connection string
        dotenv_1.default.config();
        console.log('Connection monitor check - COSMOS_CONNECTION_STRING available:', !!process.env.COSMOS_CONNECTION_STRING);
        if (!exports.isConnected && process.env.COSMOS_CONNECTION_STRING) {
            console.log('Connection string available, attempting to connect...');
            yield attemptConnection();
        }
    }), 10000); // Check every 10 seconds
}
// Graceful shutdown
process.on('SIGINT', () => __awaiter(void 0, void 0, void 0, function* () {
    if (exports.client) {
        yield exports.client.close();
        console.log('Database connection closed');
    }
    process.exit(0);
}));
