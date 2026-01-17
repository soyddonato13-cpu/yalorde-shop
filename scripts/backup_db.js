const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Ajustar rutas para importar modelos desde la carpeta raíz si se ejecuta desde scripts/
// O desde el directorio adecuado. Asumimos estructura:
// root/
//   models/
//   scripts/backup_db.js
const Product = require('../models/Product');
const Order = require('../models/Order');
const SiteContent = require('../models/SiteContent');

// URI de conexión (Misma que en server.js)
const MONGO_URI = "mongodb+srv://isaronstudio_db_user:9qAPPeUHUCA5VVei@cluster0.o6p9ft3.mongodb.net/yalorde_db?retryWrites=true&w=majority&appName=Cluster0";

// Directorio de backups (root/backups)
const backupDir = path.join(__dirname, '../backups');

// Crear directorio si no existe
if (!fs.existsSync(backupDir)) {
    console.log('Creando directorio de backups...');
    fs.mkdirSync(backupDir, { recursive: true });
}

// Función para formatear fecha YYYY-MM-DD_HH-MM
const formatDate = (date) => {
    const d = date.toISOString().split('T')[0];
    const t = date.toTimeString().split(' ')[0].replace(/:/g, '-');
    return `${d}_${t}`;
};

async function backup() {
    try {
        console.log('🔌 Conectando a la base de datos...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Conexión exitosa.');

        const timestamp = formatDate(new Date());

        // 1. Productos
        console.log('📦 Descargando Productos...');
        const products = await Product.find({});
        const productFile = path.join(backupDir, `productos_${timestamp}.json`);
        fs.writeFileSync(productFile, JSON.stringify(products, null, 2));
        console.log(`   -> Guardados ${products.length} productos en: ${path.basename(productFile)}`);

        // 2. Pedidos
        console.log('🛒 Descargando Pedidos...');
        const orders = await Order.find({});
        const orderFile = path.join(backupDir, `pedidos_${timestamp}.json`);
        fs.writeFileSync(orderFile, JSON.stringify(orders, null, 2));
        console.log(`   -> Guardados ${orders.length} pedidos en: ${path.basename(orderFile)}`);

        // 3. Contenido
        console.log('🎨 Descargando Contenido del Sitio...');
        const content = await SiteContent.find({});
        const contentFile = path.join(backupDir, `contenido_${timestamp}.json`);
        fs.writeFileSync(contentFile, JSON.stringify(content, null, 2));
        console.log(`   -> Contenido guardado en: ${path.basename(contentFile)}`);

        console.log('\n✨ ¡RESPALDO COMPLETADO EXITOSAMENTE! ✨');
        console.log(`Tus archivos están en: ${backupDir}`);

    } catch (error) {
        console.error('❌ Ocurrió un error durante el respaldo:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Desconectado de la base de datos.');
        process.exit();
    }
}

backup();
