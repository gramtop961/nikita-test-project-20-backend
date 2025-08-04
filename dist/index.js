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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./config/database");
const slack_1 = require("./config/slack");
dotenv_1.default.config();
// Debug: Log environment variables
console.log('Environment variables loaded:');
console.log('COSMOS_CONNECTION_STRING:', process.env.COSMOS_CONNECTION_STRING ? 'SET' : 'NOT SET');
console.log('PORT:', process.env.PORT || '3000 (default)');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET');
console.log('SLACK_BOT_TOKEN:', process.env.SLACK_BOT_TOKEN ? 'SET' : 'NOT SET');
console.log('SLACK_SIGNING_SECRET:', process.env.SLACK_SIGNING_SECRET ? 'SET' : 'NOT SET');
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
const corsOptions = {
    origin: true,
};
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
// Initialize database connection
(0, database_1.initializeDatabase)().catch(console.error);
// Start connection monitor to check for connection string availability
(0, database_1.startConnectionMonitor)();
// Middleware to check database connection
const requireDatabase = (req, res, next) => {
    if (!(0, database_1.isDatabaseConnected)()) {
        return res.status(503).json({
            error: 'Database not available',
            message: 'The database connection is not yet established. Please try again later.'
        });
    }
    next();
};
app.get('/', (req, res) => {
    res.send('Hello from the backend!');
});
app.get('/api/hello', (req, res) => {
    res.json({ message: 'Hola from the dummy API!' });
});
// Get all items with optional filtering
app.get('/api/items', requireDatabase, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { type, status, priority, search, limit = 50, offset = 0 } = req.query;
        // Build query object
        const query = {};
        if (type)
            query.type = type;
        if (status)
            query.status = status;
        if (priority)
            query.priority = priority;
        // Add search functionality
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        const items = yield database_1.collection
            .find(query)
            .skip(parseInt(offset))
            .limit(parseInt(limit))
            .toArray();
        const total = yield database_1.collection.countDocuments(query);
        res.json({
            items,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: parseInt(offset) + parseInt(limit) < total
            }
        });
    }
    catch (error) {
        console.error('Error fetching items:', error);
        res.status(500).json({ error: 'Failed to fetch items' });
    }
}));
// Get users only
app.get('/api/users', requireDatabase, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { role, search } = req.query;
        const query = { type: 'user' };
        if (role)
            query.role = role;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { role: { $regex: search, $options: 'i' } }
            ];
        }
        const users = yield database_1.collection.find(query).toArray();
        res.json(users);
    }
    catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
}));
// Get projects only
app.get('/api/projects', requireDatabase, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status, priority, assignedTo } = req.query;
        const query = { type: 'project' };
        if (status)
            query.status = status;
        if (priority)
            query.priority = priority;
        if (assignedTo)
            query.assignedTo = assignedTo;
        const projects = yield database_1.collection.find(query).toArray();
        res.json(projects);
    }
    catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
}));
// Get tasks only
app.get('/api/tasks', requireDatabase, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status, priority, category, assignedTo } = req.query;
        const query = { type: 'task' };
        if (status)
            query.status = status;
        if (priority)
            query.priority = priority;
        if (category)
            query.category = category;
        if (assignedTo)
            query.assignedTo = assignedTo;
        const tasks = yield database_1.collection.find(query).toArray();
        res.json(tasks);
    }
    catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
}));
// Get item by ID
app.get('/api/items/:id', requireDatabase, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const item = yield database_1.collection.findOne({
            $or: [
                { id: parseInt(id) },
                { _id: id }
            ]
        });
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }
        res.json(item);
    }
    catch (error) {
        console.error('Error fetching item:', error);
        res.status(500).json({ error: 'Failed to fetch item' });
    }
}));
// Get statistics/summary
app.get('/api/stats', requireDatabase, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const totalItems = yield database_1.collection.countDocuments();
        const userCount = yield database_1.collection.countDocuments({ type: 'user' });
        const projectCount = yield database_1.collection.countDocuments({ type: 'project' });
        const taskCount = yield database_1.collection.countDocuments({ type: 'task' });
        const projectStats = yield database_1.collection.aggregate([
            { $match: { type: 'project' } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]).toArray();
        const taskStats = yield database_1.collection.aggregate([
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
            projectsByStatus: projectStats.reduce((acc, stat) => {
                acc[stat._id] = stat.count;
                return acc;
            }, {}),
            tasksByStatus: taskStats.reduce((acc, stat) => {
                acc[stat._id] = stat.count;
                return acc;
            }, {})
        });
    }
    catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
}));
// Create a new item
app.post('/api/items', requireDatabase, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const _a = req.body, { _id } = _a, itemBody = __rest(_a, ["_id"]);
        // Generate next ID for new items - avoid sorting by finding max ID
        const items = yield database_1.collection.find({}, { projection: { id: 1 } }).toArray();
        const maxId = items.length > 0 ? Math.max(...items.map((item) => item.id || 0)) : 0;
        const nextId = maxId + 1;
        const newItem = Object.assign(Object.assign({ id: nextId }, itemBody), { createdAt: new Date() });
        const result = yield database_1.collection.insertOne(newItem);
        res.status(201).json(Object.assign(Object.assign({}, newItem), { _id: result.insertedId }));
    }
    catch (error) {
        console.error('Error creating item:', error);
        res.status(500).json({ error: 'Failed to create item' });
    }
}));
// Update an item
app.put('/api/items/:id', requireDatabase, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const updateData = Object.assign({}, req.body);
        delete updateData._id; // Remove _id from update data
        updateData.updatedAt = new Date();
        const result = yield database_1.collection.updateOne({
            $or: [
                { id: parseInt(id) },
                { _id: id }
            ]
        }, { $set: updateData });
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }
        const updatedItem = yield database_1.collection.findOne({
            $or: [
                { id: parseInt(id) },
                { _id: id }
            ]
        });
        res.json(updatedItem);
    }
    catch (error) {
        console.error('Error updating item:', error);
        res.status(500).json({ error: 'Failed to update item' });
    }
}));
// Delete an item
app.delete('/api/items/:id', requireDatabase, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const result = yield database_1.collection.deleteOne({
            $or: [
                { id: parseInt(id) },
                { _id: id }
            ]
        });
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }
        res.json({ message: 'Item deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).json({ error: 'Failed to delete item' });
    }
}));
// Slack API endpoints
app.post('/api/slack/send-message', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!(0, slack_1.isSlackConfigured)()) {
            return res.status(400).json({ error: 'Slack not configured. Please set SLACK_BOT_TOKEN and SLACK_SIGNING_SECRET.' });
        }
        const { channel, text, blocks } = req.body;
        if (!channel || !text) {
            return res.status(400).json({ error: 'Channel and text are required' });
        }
        const result = yield slack_1.slackClient.chat.postMessage({
            channel,
            text,
            blocks
        });
        res.json({
            success: true,
            message: 'Message sent successfully',
            messageId: result.ts,
            channel: result.channel
        });
    }
    catch (error) {
        console.error('Error sending Slack message:', error);
        res.status(500).json({ error: 'Failed to send message to Slack' });
    }
}));
app.get('/api/slack/channels', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        if (!(0, slack_1.isSlackConfigured)()) {
            return res.status(400).json({ error: 'Slack not configured. Please set SLACK_BOT_TOKEN and SLACK_SIGNING_SECRET.' });
        }
        const result = yield slack_1.slackClient.conversations.list({
            types: 'public_channel,private_channel',
            limit: 100
        });
        const channels = ((_a = result.channels) === null || _a === void 0 ? void 0 : _a.map(channel => ({
            id: channel.id,
            name: channel.name,
            is_channel: channel.is_channel,
            is_group: channel.is_group,
            is_private: channel.is_private,
            is_member: channel.is_member
        }))) || [];
        res.json({ channels });
    }
    catch (error) {
        console.error('Error fetching Slack channels:', error);
        res.status(500).json({ error: 'Failed to fetch Slack channels' });
    }
}));
app.get('/api/slack/users', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        if (!(0, slack_1.isSlackConfigured)()) {
            return res.status(400).json({ error: 'Slack not configured. Please set SLACK_BOT_TOKEN and SLACK_SIGNING_SECRET.' });
        }
        const result = yield slack_1.slackClient.users.list({
            limit: 100
        });
        const users = ((_a = result.members) === null || _a === void 0 ? void 0 : _a.map(user => {
            var _a, _b;
            return ({
                id: user.id,
                name: user.name,
                real_name: user.real_name,
                display_name: (_a = user.profile) === null || _a === void 0 ? void 0 : _a.display_name,
                email: (_b = user.profile) === null || _b === void 0 ? void 0 : _b.email,
                is_bot: user.is_bot,
                deleted: user.deleted
            });
        }).filter(user => !user.deleted && !user.is_bot)) || [];
        res.json({ users });
    }
    catch (error) {
        console.error('Error fetching Slack users:', error);
        res.status(500).json({ error: 'Failed to fetch Slack users' });
    }
}));
app.get('/api/slack/status', (req, res) => {
    res.json({
        configured: (0, slack_1.isSlackConfigured)(),
        bot_token: process.env.SLACK_BOT_TOKEN ? 'SET' : 'NOT SET',
        signing_secret: process.env.SLACK_SIGNING_SECRET ? 'SET' : 'NOT SET'
    });
});
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        database: (0, database_1.isDatabaseConnected)() ? 'connected' : 'disconnected',
        slack: (0, slack_1.isSlackConfigured)() ? 'configured' : 'not configured',
        timestamp: new Date().toISOString()
    });
});
app.listen(port, () => {
    console.log(`Backend listening at http://localhost:${port}`);
});
