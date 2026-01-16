const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const mongoose = require('mongoose');

// Models
const Product = require('./models/Product');
const Order = require('./models/Order');
const SiteContent = require('./models/SiteContent');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Configure Multer for Image Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'public', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// MongoDB Connection
const MONGO_URI = "mongodb+srv://isaronstudio_db_user:9qAPPeUHUCA5VVei@cluster0.o6p9ft3.mongodb.net/yalorde_db?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('✅ Connected to MongoDB Atlas');
        await seedDatabase();
    })
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Seeding Logic (Migrate from JSON if DB is empty)
async function seedDatabase() {
    try {
        // Check Products
        const prodCount = await Product.countDocuments();
        if (prodCount === 0) {
            console.log('📦 Seeding Products from JSON...');
            if (fs.existsSync('products.json')) {
                const data = JSON.parse(fs.readFileSync('products.json', 'utf8'));
                // Ensure IDs are strings and fields match schema
                const products = data.map(p => ({ ...p, id: String(p.id) }));
                await Product.insertMany(products);
                console.log('✅ Products seeded');
            }
        }

        // Check Content
        const contentCount = await SiteContent.countDocuments();
        if (contentCount === 0) {
            console.log('🎨 Seeding Content from JSON...');
            if (fs.existsSync('site_content.json')) {
                const data = JSON.parse(fs.readFileSync('site_content.json', 'utf8'));
                await SiteContent.create(data);
                console.log('✅ Content seeded');
            }
        }
    } catch (err) {
        console.error('Migration Error:', err);
    }
}

// Auth Middleware
const requireAuth = (req, res, next) => {
    if (req.cookies.admin_auth === 'valid_token_123') { // Updated token to match valid_token_123 used in login
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// --- API ROUTES ---

// LOGIN Endpoint
app.post('/api/login', (req, res) => {
    const { secret } = req.body;
    if (secret === 'yalorde%desbloquear%') {
        res.cookie('admin_auth', 'valid_token_123', { httpOnly: true });
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Auth failed' });
    }
});

// Admin Login Route (Form) - Keeping for compatibility if used
app.post('/admin-login', (req, res) => {
    const { password } = req.body;
    if (password === 'admin123') {
        res.cookie('admin_auth', 'valid_token_123', { httpOnly: true });
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Invalid password' });
    }
});

// 1. PRODUCTS
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching products' });
    }
});

app.post('/api/products', requireAuth, upload.single('image'), async (req, res) => {
    try {
        const { title, category, price, description, sizes } = req.body;
        const isTrending = req.body.isTrending === 'true' || req.body.isTrending === 'on';

        let imageUrl = '';
        if (req.file) {
            // Save relative path for frontend
            imageUrl = 'uploads/' + req.file.filename;
        } else {
            imageUrl = req.body.imageUrl || 'https://via.placeholder.com/500';
        }

        const newProduct = new Product({
            id: Date.now().toString(),
            title,
            category,
            price: parseFloat(price),
            description,
            img: imageUrl,
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
    try {
        const { id } = req.params;
        const { title, category, price, description, sizes } = req.body;
        const isTrending = req.body.isTrending === 'true' || req.body.isTrending === 'on';

        // Find product first
        const product = await Product.findOne({ id: id });
        if (!product) return res.status(404).json({ error: 'Product not found' });

        let imageUrl = product.img;
        if (req.file) {
            imageUrl = 'uploads/' + req.file.filename;
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
    try {
        const { id } = req.params;
        const result = await Product.findOneAndDelete({ id: id });

        if (!result) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json({ success: true, message: 'Deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// 2. ORDERS
app.get('/api/orders', requireAuth, async (req, res) => {
    try {
        const orders = await Order.find().sort({ date: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching orders' });
    }
});

app.post('/api/orders', async (req, res) => {
    try {
        const { customer, items, total, paymentMethod, paymentRef } = req.body;

        const newOrder = new Order({
            customer,
            items,
            total,
            paymentMethod,
            paymentRef
        });

        await newOrder.save();
        res.status(201).json({ success: true, orderId: newOrder._id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error saving order' });
    }
});

// 3. CMS CONTENT
app.get('/api/content', async (req, res) => {
    try {
        // Try to find the single content document, or create if missing (though seed should handle it)
        let content = await SiteContent.findOne();
        if (!content) content = {};
        res.json(content);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching content' });
    }
});

app.post('/api/content', requireAuth, async (req, res) => {
    try {
        // Upsert: update the first document found, or create new
        const content = await SiteContent.findOne();

        if (content) {
            await SiteContent.findByIdAndUpdate(content._id, req.body);
        } else {
            await SiteContent.create(req.body);
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error saving content' });
    }
});


// Routes for Pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Protect Dashboard Pages
app.get('/dashboard', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});
app.get('/dashboard.html', (req, res) => res.redirect('/dashboard'));
app.get('/admin.html', (req, res) => res.redirect('/dashboard'));
app.get('/admin', (req, res) => res.redirect('/dashboard'));

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
