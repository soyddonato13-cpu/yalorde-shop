const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    customer: { type: String, required: true },
    items: [
        {
            title: String,
            price: Number,
            qty: Number,
            size: String,
            img: String,
            id: String
        }
    ],
    total: { type: Number, required: true },
    paymentMethod: { type: String, required: true }, // pago_movil, binance, zelle
    paymentRef: { type: String, required: true },
    date: { type: Date, default: Date.now },
    status: { type: String, default: 'pending', enum: ['pending', 'paid', 'shipped'] }
});

module.exports = mongoose.model('Order', orderSchema);
