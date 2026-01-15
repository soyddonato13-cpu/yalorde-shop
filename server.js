const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Serve static files, BUT we need to intercept dashboard.html
// So we serve public folder but manually handle sensitive files first

// Auth Middleware
const requireAuth = (req, res, next) => {
    if (req.cookies.admin_auth === 'valid_token_123') {
        next();
    } else {
        res.redirect('/login');
    }
};

// CLEAN URL ROUTES

// Login Page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Protect Dashboard
app.get('/dashboard', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Redirects for .html extentions
app.get('/login.html', (req, res) => res.redirect('/login'));
app.get('/dashboard.html', (req, res) => res.redirect('/dashboard'));
app.get('/admin.html', (req, res) => res.redirect('/dashboard'));
app.get('/admin', (req, res) => res.redirect('/dashboard'));

// Serve Public Files
app.use(express.static('public'));

// Configure Multer for Image Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'public/uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

const DB_FILE = 'products.json';

// Helper to read DB
const readDB = () => {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
};

// Helper to write DB
const writeDB = (data) => {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

// Routes

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

// GET Products
app.get('/api/products', (req, res) => {
    const products = readDB();
    res.json(products);
});

// POST Product (Admin Panel) - PROTECTED
app.post('/api/products', requireAuth, upload.single('image'), (req, res) => {
    try {
        const { title, category, price, description, sizes } = req.body;
        const products = readDB();

        let imageUrl = '';
        if (req.file) {
            imageUrl = 'uploads/' + req.file.filename;
        } else {
            imageUrl = req.body.imageUrl || 'https://via.placeholder.com/500';
        }

        const newProduct = {
            id: Date.now().toString(),
            category,
            title,
            price: parseFloat(price),
            img: imageUrl,
            description,
            sizes: JSON.parse(sizes)
        };

        products.push(newProduct);
        writeDB(products);

        res.status(201).json(newProduct);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error saving product' });
    }
});

// DELETE Product - PROTECTED
app.delete('/api/products/:id', requireAuth, (req, res) => {
    try {
        const { id } = req.params;
        let products = readDB();

        const initialLength = products.length;
        products = products.filter(p => p.id !== id);

        if (products.length === initialLength) {
            return res.status(404).json({ error: 'Product not found' });
        }

        writeDB(products);
        res.json({ success: true, message: 'Deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

const ORDERS_FILE = 'orders.json';

// Helper to read Orders
const readOrders = () => {
    try {
        const data = fs.readFileSync(ORDERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
};

// Helper to write Orders
const writeOrders = (data) => {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(data, null, 2));
};

// POST Order (Public - Checkout)
app.post('/api/orders', (req, res) => {
    try {
        const { customer, items, total, paymentMethod, paymentRef } = req.body;
        const orders = readOrders();

        const newOrder = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            status: 'pending', // pending, paid, shipped
            customer,
            items,
            total,
            paymentMethod,
            paymentRef
        };

        orders.push(newOrder);
        writeOrders(orders);

        res.status(201).json({ success: true, orderId: newOrder.id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error processing order' });
    }
});

// GET Orders (Protected - Admin)
app.get('/api/orders', requireAuth, (req, res) => {
    const orders = readOrders();
    // Sort by new
    res.json(orders.sort((a, b) => b.id - a.id));
});


// === CMS CONTENT ===
const CONTENT_FILE = 'site_content.json';

const readContent = () => {
    try {
        const data = fs.readFileSync(CONTENT_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return {};
    }
};

const writeContent = (data) => {
    fs.writeFileSync(CONTENT_FILE, JSON.stringify(data, null, 2));
};

// GET Content (Public)
app.get('/api/content', (req, res) => {
    const content = readContent();
    res.json(content);
});

// POST Content (Protected - Admin)
app.post('/api/content', requireAuth, (req, res) => {
    try {
        const newContent = req.body;
        writeContent(newContent);
        res.json({ success: true, content: newContent });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error saving content' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
});
