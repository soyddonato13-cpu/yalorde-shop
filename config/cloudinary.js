const cloudinary = require('cloudinary').v2;

// Configuración de Cloudinary
cloudinary.config({
    cloud_name: 'dt2ee81bb',
    api_key: '464837923263588',
    api_secret: 'VVcR83L_vRb79G3LD8UYQ65Rk1c'
});

module.exports = cloudinary;
