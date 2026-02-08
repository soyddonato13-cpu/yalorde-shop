const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
    heroTitle: String,
    heroSubtitle: String,
    heroImg: String,
    backgroundImage: String, // New field for custom background
    infoBar: String,
    themeColor: { type: String, default: '#e84393' }, // Default Pink
    whatsapp: String,
    instagram: String,
    tiktok: String,
    faq: [
        {
            question: String,
            answer: String
        }
    ]
});

module.exports = mongoose.model('SiteContent', contentSchema);
