const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'DataUploads',
    password: 'Lcdtvrane@12',
    port: 5432,
});

module.exports = pool;
