const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Conexión a MongoDB Atlas
const MONGO_URI = "mongodb://isaronstudio_db_user:9qAPPeUHUCA5VVei@ac-wdjjzbn-shard-00-00.o6p9ft3.mongodb.net:27017,ac-wdjjzbn-shard-00-01.o6p9ft3.mongodb.net:27017,ac-wdjjzbn-shard-00-02.o6p9ft3.mongodb.net:27017/yalorde_db?ssl=true&authSource=admin&retryWrites=true&w=majority";

async function backupDatabase() {
    console.log('🔄 Iniciando backup de la base de datos...\n');

    const client = new MongoClient(MONGO_URI);

    try {
        await client.connect();
        console.log('✅ Conectado a MongoDB Atlas\n');

        const db = client.db('yalorde_db');

        // Crear carpeta de backup con fecha
        const date = new Date().toISOString().split('T')[0]; // 2026-02-07
        const backupDir = path.join(__dirname, 'backups', date);

        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        // Colecciones a respaldar
        const collections = ['products', 'orders', 'sitecontents', 'users', 'coupons'];

        for (const collectionName of collections) {
            console.log(`📦 Exportando ${collectionName}...`);

            const collection = db.collection(collectionName);
            const data = await collection.find({}).toArray();

            const filePath = path.join(backupDir, `${collectionName}.json`);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

            console.log(`   ✅ ${data.length} documentos guardados en ${collectionName}.json`);
        }

        console.log(`\n🎉 ¡Backup completado exitosamente!`);
        console.log(`📁 Ubicación: ${backupDir}\n`);

        // Crear archivo de información
        const infoPath = path.join(backupDir, 'INFO.txt');
        const info = `BACKUP DE YALORDE TENTACIONES
Fecha: ${new Date().toLocaleString('es-VE')}
Base de datos: yalorde_db

Colecciones respaldadas:
${collections.map(c => `- ${c}`).join('\n')}

Para restaurar este backup:
1. Abre una terminal en la carpeta del proyecto
2. Ejecuta: node restore-database.js ${date}
3. Confirma la restauración

IMPORTANTE: Guarda esta carpeta en un lugar seguro (Google Drive, Dropbox, etc.)
`;
        fs.writeFileSync(infoPath, info, 'utf8');

    } catch (error) {
        console.error('❌ Error durante el backup:', error.message);
    } finally {
        await client.close();
        console.log('🔌 Conexión cerrada');
    }
}

// Ejecutar backup
backupDatabase();
