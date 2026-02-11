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
const User = require('./models/User'); // Phase 7
const Coupon = require('./models/Coupon'); // Phase 7
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const cloudinary = require('./config/cloudinary'); // Cloudinary for image uploads

const JWT_SECRET = 'yalorde_ultra_secret_2026';

// Nodemailer Transporter (Configure with real SMTP for production)
const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email', // Placeholder: use Gmail/SendGrid in prod
    port: 587,
    auth: {
        user: 'placeholder@ethereal.email',
        pass: 'password'
    }
});

async function sendOrderStatusEmail(order) {
    const statusText = { 'approved': 'Aprobado', 'shipped': 'Enviado', 'delivered': 'Entregado' };
    const mailOptions = {
        from: '"Yalorde Tentaciones" <noreply@yalorde.com>',
        to: order.customer.email,
        subject: `Actualización de tu pedido Yalorde - ${statusText[order.status] || order.status}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
                <h2 style="color: #e84393;">¡Hola ${order.customer.name}!</h2>
                <p>Tu pedido ha cambiado de estado a: <strong>${statusText[order.status] || order.status}</strong></p>
                ${order.trackingCode ? `<p>Tu código de rastreo es: <strong>${order.trackingCode}</strong></p>` : ''}
                <p>Puedes rastrearlo en nuestra web con tu ID de pedido o código de seguimiento.</p>
                <hr>
                <p style="font-size: 12px; color: #888;">Gracias por elegir Yalorde Tentaciones.</p>
            </div>
        `
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log('📧 Email enviado a:', order.customer.email);
    } catch (err) {
        console.error('❌ Error enviando email:', err);
    }
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increase limit for Base64 images
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Netlify serves 'public' folder via CDN, but for API handling we keep this line
// possibly redundant in Netlify but harmless.
app.use(express.static('public'));

// Configure Multer for Memory Storage (Serverless friendly)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// MongoDB Connection
const MONGO_URI = "mongodb://isaronstudio_db_user:9qAPPeUHUCA5VVei@ac-wdjjzbn-shard-00-00.o6p9ft3.mongodb.net:27017,ac-wdjjzbn-shard-00-01.o6p9ft3.mongodb.net:27017,ac-wdjjzbn-shard-00-02.o6p9ft3.mongodb.net:27017/yalorde_db?ssl=true&authSource=admin&retryWrites=true&w=majority";
// Conexión directa a través de shards para evitar bloqueos de DNS SRV



let cachedDb = null;

const connectDB = async () => {
    if (cachedDb && mongoose.connection.readyState === 1) {
        console.log('✅ Using cached MongoDB connection');
        return cachedDb;
    }

    try {
        console.log('⏳ Connecting to MongoDB...');
        // Fix for serverless: prevent buffering on cold starts if connection fails
        mongoose.set('strictQuery', false);

        const conn = await mongoose.connect(MONGO_URI, {
            family: 4, // Force IPv4
            serverSelectionTimeoutMS: 5000, // Fail fast if no connection (default 30s)
            socketTimeoutMS: 45000, // Close sockets after 45s
        });

        cachedDb = conn;
        isConnected = true;
        console.log('✅ New MongoDB connection established');
        await seedDatabase();
        return conn;
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err);
        // Do not throw here to allow retry logic or gracefull degradation if needed, 
        // but for now let's just log. In serverless, maybe throwing is better to restart pod.
        throw err;
    }
};

// Connect immediately not strictly necessary for serverless but harmless
// connectDB(); // Commented out to let each request handle its connection via middleware/injection if needed, 
// but since this is top-level, it runs on cold start. kept below.
connectDB().catch(err => console.error("Init connection failed", err));

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

// Auth Middlewares
const MASTER_SECRET = 'moneymoney';
const OWNER_SECRET = 'yalordeowner'; // Special key for the client

const requireAuth = (req, res, next) => {
    const auth = req.cookies.admin_auth;
    if (auth === 'role_master' || auth === 'role_owner') {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

const requireMaster = (req, res, next) => {
    if (req.cookies.admin_auth === 'role_master') {
        next();
    } else {
        res.status(403).json({ error: 'Acceso restringido (Solo Master Admin)' });
    }
};

const requireUserAuth = (req, res, next) => {
    const token = req.cookies.user_auth;
    if (!token) return res.status(401).json({ error: 'Debes iniciar sesión' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Sesión inválida' });
    }
};

// --- API ROUTES ---

// LOGIN ADMIN
app.post('/api/login', (req, res) => {
    const { secret } = req.body;
    if (secret === MASTER_SECRET) {
        res.cookie('admin_auth', 'role_master', { httpOnly: true });
        res.json({ success: true, role: 'master', redirect: '/isaronstudioadmin' });
    } else if (secret === OWNER_SECRET) {
        res.cookie('admin_auth', 'role_owner', { httpOnly: true });
        res.json({ success: true, role: 'owner', redirect: '/admin-privado-7392' });
    } else {
        res.status(401).json({ error: 'Clave incorrecta' });
    }
});

// --- CLIENT AUTH ---
app.post('/api/auth/register', async (req, res) => {
    await connectDB();
    try {
        const { name, email, password, phone, address } = req.body;
        const exists = await User.findOne({ email });
        if (exists) return res.status(400).json({ error: 'El correo ya está registrado' });

        const user = new User({ name, email, password, phone, address });
        await user.save();

        const token = jwt.sign({ id: user._id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
        res.cookie('user_auth', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
        res.json({ success: true, user: { name: user.name, email: user.email } });
    } catch (err) {
        res.status(500).json({ error: 'Error en registro' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    await connectDB();
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const token = jwt.sign({ id: user._id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
        res.cookie('user_auth', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
        res.json({ success: true, user: { name: user.name, email: user.email } });
    } catch (err) {
        res.status(500).json({ error: 'Error en login' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('user_auth');
    res.json({ success: true });
});

app.get('/api/auth/me', requireUserAuth, async (req, res) => {
    res.json(req.user);
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

app.post('/api/products', requireMaster, upload.single('image'), async (req, res) => {
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

app.put('/api/products/:id', requireMaster, upload.single('image'), async (req, res) => {
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

app.delete('/api/products/:id', requireMaster, async (req, res) => {
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

app.post('/api/orders', upload.single('paymentProof'), async (req, res) => {
    await connectDB();
    try {
        const { items, total, paymentMethod, paymentRef } = req.body;

        // Parse 'customer' and 'items' which might come as JSON strings due to FormData
        let customerData;
        try {
            customerData = JSON.parse(req.body.customer);
        } catch (e) {
            customerData = req.body.customer; // Fallback for legacy string
        }

        let itemsData;
        try {
            itemsData = typeof items === 'string' ? JSON.parse(items) : items;
        } catch (e) {
            itemsData = items;
        }

        let paymentProofUrl = '';
        if (req.file) {
            const b64 = Buffer.from(req.file.buffer).toString('base64');
            const mime = req.file.mimetype;
            paymentProofUrl = `data:${mime};base64,${b64}`;
        }

        // Generate unique 4-digit tracking code
        let trackingCode;
        let isUnique = false;
        while (!isUnique) {
            trackingCode = Math.floor(1000 + Math.random() * 9000).toString(); // 1000-9999
            const existing = await Order.findOne({ trackingCode });
            if (!existing) isUnique = true;
        }

        const newOrder = new Order({
            customer: customerData,
            items: itemsData,
            total,
            paymentMethod,
            paymentRef,
            paymentProofUrl,
            trackingCode,
            status: 'pending'
        });
        await newOrder.save();
        res.status(201).json({ success: true, orderId: newOrder._id, trackingCode: trackingCode });
    } catch (err) {
        console.error("❌ Error creating order:", err.message);
        console.error(err.stack); // Detail for debugging
        res.status(500).json({ error: 'Error saving order: ' + err.message });
    }
});

app.put('/api/orders/:id', requireAuth, async (req, res) => {
    await connectDB();
    try {
        const { id } = req.params;
        const oldOrder = await Order.findById(id);
        const updatedOrder = await Order.findByIdAndUpdate(id, req.body, { new: true });

        if (!updatedOrder) return res.status(404).json({ error: 'Order not found' });

        // Trigger email if status changed
        if (oldOrder && oldOrder.status !== updatedOrder.status) {
            sendOrderStatusEmail(updatedOrder);
        }

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

// --- ADMIN ANALYTICS ---
app.get('/api/admin/stats', requireAuth, async (req, res) => {
    await connectDB();
    try {
        const totalSales = await Order.aggregate([
            { $match: { status: { $in: ['approved', 'shipped', 'delivered'] } } },
            { $group: { _id: null, total: { $sum: '$total' } } }
        ]);

        const ordersByStatus = await Order.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        const lowStockCount = await Product.countDocuments({
            $expr: {
                $lte: [
                    {
                        $reduce: {
                            input: { $objectToArray: "$sizes" },
                            initialValue: 0,
                            in: { $add: ["$$value", "$$this.v.stock"] }
                        }
                    },
                    5
                ]
            }
        });

        // Sales in last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const weeklySales = await Order.aggregate([
            { $match: { date: { $gte: sevenDaysAgo }, status: { $ne: 'cancelled' } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                    total: { $sum: "$total" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            totalRevenue: totalSales[0]?.total || 0,
            statusDistribution: ordersByStatus,
            lowStockCount,
            weeklySales
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error generating stats' });
    }
});
app.get('/api/orders/track/:id', async (req, res) => {
    await connectDB();
    try {
        const { id } = req.params;
        let query = {};

        // Check if ID is a valid MongoDB ObjectId
        if (mongoose.Types.ObjectId.isValid(id)) {
            query = { $or: [{ _id: id }, { trackingCode: id }] };
        } else {
            query = { trackingCode: id };
        }

        const order = await Order.findOne(query).select('status customer.name date items total trackingCode paymentStatus notes');
        if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: 'Error al buscar pedido' });
    }
});

// COUPONS
app.post('/api/coupons/validate', async (req, res) => {
    await connectDB();
    try {
        const { code, cartTotal } = req.body;
        const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });

        if (!coupon) return res.status(404).json({ error: 'Cupón no válido' });
        if (coupon.expiryDate && new Date() > coupon.expiryDate) return res.status(400).json({ error: 'Cupón expirado' });
        if (cartTotal < coupon.minPurchase) return res.status(400).json({ error: `Compra mínima de $${coupon.minPurchase} requerida` });

        res.json({ success: true, discountType: coupon.discountType, discountValue: coupon.discountValue });
    } catch (err) {
        res.status(500).json({ error: 'Error al validar cupón' });
    }
});

// SEED COUPONS (Temporary for testing)
async function seedCoupons() {
    await connectDB();
    const count = await Coupon.countDocuments();
    if (count === 0) {
        await Coupon.create({ code: 'BIENVENIDA', discountType: 'percentage', discountValue: 10, minPurchase: 50 });
        await Coupon.create({ code: 'YALORDE5', discountType: 'fixed', discountValue: 5, minPurchase: 30 });
        console.log('🎟️ Cupones iniciales creados');
    }
}
seedCoupons();

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
app.get('/isaronstudioadmin', requireMaster, (req, res) => res.sendFile(path.join(__dirname, 'public/isaronstudioadmin.html')));

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

module.exports = app;
