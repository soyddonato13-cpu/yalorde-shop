const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // Keeping string ID for compatibility with frontend logic
    title: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    img: { type: String, required: true },
    description: { type: String, required: true },
    sizes: {
        S: { stock: { type: Number, default: 0 } },
        M: { stock: { type: Number, default: 0 } },
        L: { stock: { type: Number, default: 0 } },
        // Add more sizes if needed dynamically, but this matches current structure
        "36": { stock: { type: Number, default: 0 } },
        "37": { stock: { type: Number, default: 0 } },
        "38": { stock: { type: Number, default: 0 } },
        "40": { stock: { type: Number, default: 0 } }
    },
    isTrending: { type: Boolean, default: false }
}, { strict: false }); // strict: false allows for mixed size keys (S, M, L vs 36, 38) if not strictly defined above, but we defied common ones.

module.exports = mongoose.model('Product', productSchema);
