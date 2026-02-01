const fs = require('fs');
const path = require('path');
const db = require('../db');

const schemaPath = path.join(__dirname, '../db/schema.sql');
const schemaSql = fs.readFileSync(schemaPath, 'utf8');

async function initDb() {
    try {
        console.log('Running schema migration...');
        await db.query(schemaSql);
        console.log('Schema migration successful!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

initDb();
