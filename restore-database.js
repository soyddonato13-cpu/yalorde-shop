const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Conexión a MongoDB Atlas
const MONGO_URI = "mongodb://isaronstudio_db_user:9qAPPeUHUCA5VVei@ac-wdjjzbn-shard-00-00.o6p9ft3.mongodb.net:27017,ac-wdjjzbn-shard-00-01.o6p9ft3.mongodb.net:27017,ac-wdjjzbn-shard-00-02.o6p9ft3.mongodb.net:27017/yalorde_db?ssl=true&authSource=admin&retryWrites=true&w=majority";

// Función para preguntar al usuario
function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }));
}

async function restoreDatabase(backupDate) {
    console.log('🔄 Iniciando restauración de la base de datos...\n');

    // Validar que existe el backup
    const backupDir = path.join(__dirname, 'backups', backupDate);

    if (!fs.existsSync(backupDir)) {
        console.error(`❌ No existe el backup para la fecha: ${backupDate}`);
        console.log('\n📁 Backups disponibles:');
        const backupsPath = path.join(__dirname, 'backups');
        if (fs.existsSync(backupsPath)) {
            const folders = fs.readdirSync(backupsPath);
            folders.forEach(f => console.log(`   - ${f}`));
        } else {
            console.log('   (No hay backups disponibles)');
        }
        return;
    }

    // Confirmación de seguridad
    console.log('⚠️  ADVERTENCIA: Esta acción reemplazará TODOS los datos actuales.');
    console.log(`📁 Restaurando desde: ${backupDir}\n`);

    const answer = await askQuestion('¿Estás seguro de continuar? (escribe SI para confirmar): ');

    if (answer.toUpperCase() !== 'SI') {
        console.log('❌ Restauración cancelada.');
        return;
    }

    const client = new MongoClient(MONGO_URI);

    try {
        await client.connect();
        console.log('\n✅ Conectado a MongoDB Atlas\n');

        const db = client.db('yalorde_db');

        // Colecciones a restaurar
        const collections = ['products', 'orders', 'sitecontents', 'users', 'coupons'];

        for (const collectionName of collections) {
            const filePath = path.join(backupDir, `${collectionName}.json`);

            if (!fs.existsSync(filePath)) {
                console.log(`⚠️  Saltando ${collectionName} (archivo no encontrado)`);
                continue;
            }

            console.log(`📦 Restaurando ${collectionName}...`);

            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            if (data.length === 0) {
                console.log(`   ⚠️  ${collectionName} está vacío, saltando...`);
                continue;
            }

            const collection = db.collection(collectionName);

            // Borrar datos actuales
            await collection.deleteMany({});

            // Insertar datos del backup
            await collection.insertMany(data);

            console.log(`   ✅ ${data.length} documentos restaurados en ${collectionName}`);
        }

        console.log(`\n🎉 ¡Restauración completada exitosamente!`);
        console.log(`📊 Base de datos restaurada desde: ${backupDate}\n`);

    } catch (error) {
        console.error('❌ Error durante la restauración:', error.message);
    } finally {
        await client.close();
        console.log('🔌 Conexión cerrada');
    }
}

// Obtener fecha del backup desde argumentos
const backupDate = process.argv[2];

if (!backupDate) {
    console.log('❌ Debes especificar la fecha del backup a restaurar.');
    console.log('\nUso: node restore-database.js YYYY-MM-DD');
    console.log('Ejemplo: node restore-database.js 2026-02-07\n');

    // Mostrar backups disponibles
    const backupsPath = path.join(__dirname, 'backups');
    if (fs.existsSync(backupsPath)) {
        console.log('📁 Backups disponibles:');
        const folders = fs.readdirSync(backupsPath);
        folders.forEach(f => console.log(`   - ${f}`));
    }
} else {
    restoreDatabase(backupDate);
}
