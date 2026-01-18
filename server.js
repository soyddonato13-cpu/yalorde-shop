const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const mongoose = require('mongoose');
const serverless = require('serverless-http');

// Models
const Product = require('./models/Product');
const Order = require('./models/Order');
const SiteContent = require('./models/SiteContent');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increase limit for Base64 images
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Netlify serves 'public' folder via CDN, but for API handling we keep this line
// possibly redundant in Netlify but harmless.
// app.use(express.static('public')); 

// Configure Multer for Memory Storage (Serverless friendly)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// MongoDB Connection
const MONGO_URI = "mongodb+srv://isaronstudio_db_user:9qAPPeUHUCA5VVei@cluster0.o6p9ft3.mongodb.net/yalorde_db?retryWrites=true&w=majority&appName=Cluster0";

let isConnected = false;

const connectDB = async () => {
    if (isConnected) return;
    try {
        await mongoose.connect(MONGO_URI);
        isConnected = true;
        console.log('✅ Connected to MongoDB Atlas');
        await seedDatabase();
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err);
    }
};

// Connect immediately on load (mostly for local, Lambda might reuse context)
connectDB();

// Seeding Logic
async function seedDatabase() {
    try {
        const prodCount = await Product.countDocuments();
        if (prodCount === 0 && fs.existsSync('products.json')) {
            console.log('📦 Seeding Products...');
            const data = JSON.parse(fs.readFileSync('products.json', 'utf8'));
            const products = data.map(p => ({ ...p, id: String(p.id) }));
            await Product.insertMany(products);
        }

        const contentCount = await SiteContent.countDocuments();
        if (contentCount === 0 && fs.existsSync('site_content.json')) {
            console.log('🎨 Seeding Content...');
            const data = JSON.parse(fs.readFileSync('site_content.json', 'utf8'));
            await SiteContent.create(data);
        }
    } catch (err) {
        console.error('Migration Error:', err);
    }
}

// Auth Middleware
const requireAuth = (req, res, next) => {
    if (req.cookies.admin_auth === 'valid_token_123') {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// --- API ROUTES ---

// LOGIN
app.post('/api/login', (req, res) => {
    const { secret } = req.body;
    if (secret === 'moneymoney') {
        res.cookie('admin_auth', 'valid_token_123', { httpOnly: true, secure: true, sameSite: 'None' }); // Added secure flags for Prod
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Auth failed' });
    }
});

// 1. PRODUCTS
app.get('/api/products', async (req, res) => {
    await connectDB();
    try {
        const products = await Product.find();
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching products' });
    }
});

app.post('/api/products', requireAuth, upload.single('image'), async (req, res) => {
    await connectDB();
    try {
        const { title, category, price, description, sizes } = req.body;
        const isTrending = req.body.isTrending === 'true' || req.body.isTrending === 'on';

        let imageUrl = '';
        if (req.file) {
            // Convert Buffer to Base64 String
            const b64 = Buffer.from(req.file.buffer).toString('base64');
            const mime = req.file.mimetype;
            imageUrl = `data:${mime};base64,${b64}`;
        } else {
            imageUrl = req.body.imageUrl || 'https://via.placeholder.com/500';
        }

        const newProduct = new Product({
            id: Date.now().toString(),
            title,
            category,
            price: parseFloat(price),
            description,
            img: imageUrl, // Stored as connection string or Base64
            sizes: JSON.parse(sizes),
            isTrending
        });

        await newProduct.save();
        res.status(201).json(newProduct);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error saving product' });
    }
});

app.put('/api/products/:id', requireAuth, upload.single('image'), async (req, res) => {
    await connectDB();
    try {
        const { id } = req.params;
        const { title, category, price, description, sizes } = req.body;
        const isTrending = req.body.isTrending === 'true' || req.body.isTrending === 'on';

        const product = await Product.findOne({ id: id });
        if (!product) return res.status(404).json({ error: 'Product not found' });

        let imageUrl = product.img;
        if (req.file) {
            // Convert Buffer to Base64 String
            const b64 = Buffer.from(req.file.buffer).toString('base64');
            const mime = req.file.mimetype;
            imageUrl = `data:${mime};base64,${b64}`;
        }

        const updateData = {
            title,
            category,
            price: parseFloat(price),
            description,
            img: imageUrl,
            sizes: JSON.parse(sizes),
            isTrending
        };

        const updatedProduct = await Product.findOneAndUpdate({ id: id }, updateData, { new: true });
        res.json({ success: true, product: updatedProduct });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error updating product' });
    }
});

app.delete('/api/products/:id', requireAuth, async (req, res) => {
    await connectDB();
    try {
        const { id } = req.params;
        const result = await Product.findOneAndDelete({ id: id });
        if (!result) return res.status(404).json({ error: 'Product not found' });
        res.json({ success: true, message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// 2. ORDERS
app.get('/api/orders', requireAuth, async (req, res) => {
    await connectDB();
    try {
        const orders = await Order.find().sort({ date: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching orders' });
    }
});

app.post('/api/orders', async (req, res) => {
    await connectDB();
    try {
        const { customer, items, total, paymentMethod, paymentRef } = req.body;

        // Handle legacy string customer or new object
        const customerData = typeof customer === 'string' ? { name: customer } : customer;

        const newOrder = new Order({
            customer: customerData,
            items,
            total,
            paymentMethod,
            paymentRef,
            status: 'pending'
        });
        await newOrder.save();
        res.status(201).json({ success: true, orderId: newOrder._id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error saving order' });
    }
});

app.put('/api/orders/:id', requireAuth, async (req, res) => {
    await connectDB();
    try {
        const { id } = req.params;
        const updatedOrder = await Order.findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedOrder) return res.status(404).json({ error: 'Order not found' });
        res.json({ success: true, order: updatedOrder });
    } catch (err) {
        res.status(500).json({ error: 'Error updating order' });
    }
});

app.delete('/api/orders/:id', requireAuth, async (req, res) => {
    await connectDB();
    try {
        const { id } = req.params;
        const result = await Order.findByIdAndDelete(id);
        if (!result) return res.status(404).json({ error: 'Order not found' });
        res.json({ success: true, message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Error deleting order' });
    }
});

// 3. CMS CONTENT
app.get('/api/content', async (req, res) => {
    await connectDB();
    try {
        let content = await SiteContent.findOne();
        if (!content) content = {};
        res.json(content);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching content' });
    }
});

app.post('/api/content', requireAuth, async (req, res) => {
    await connectDB();
    try {
        const content = await SiteContent.findOne();
        if (content) {
            await SiteContent.findByIdAndUpdate(content._id, req.body);
        } else {
            await SiteContent.create(req.body);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Error saving content' });
    }
});

// Redirects (Frontend Handled by Netlify _redirects usually, but keeping API redirects)
// Redirects
app.get('/dashboard', (req, res) => res.redirect('/')); // Redirect old dashboard to home
app.get('/login', (req, res) => res.redirect('/')); // Redirect old login to home
app.get('/acceso-x7z', (req, res) => res.sendFile(path.join(__dirname, 'public/acceso-x7z.html')));
app.get('/admin-privado-7392', requireAuth, (req, res) => res.sendFile(path.join(__dirname, 'public/admin-privado-7392.html')));

// Netlify Handler
const handler = serverless(app);
module.exports.handler = async (event, context) => {
    // Ensure Context for Lambda
    context.callbackWaitsForEmptyEventLoop = false;
    return await handler(event, context);
};

// Local Development
if (process.env.NODE_ENV !== 'production' && !process.env.NETLIFY) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running locally on port ${PORT}`);
    });
}
