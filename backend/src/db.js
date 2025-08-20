const mysql = require('mysql2/promise');
const { Pool } = require('pg');

// MariaDB/MySQL连接配置
const mysqlConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'user',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'guandan_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// PostgreSQL连接配置（使用Replit提供的数据库）
const postgresConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// 创建MySQL连接池
const mysqlPool = mysql.createPool(mysqlConfig);

// 创建PostgreSQL连接池
const postgresPool = new Pool(postgresConfig);

// 测试MySQL连接
async function testMySQLConnection() {
  try {
    const connection = await mysqlPool.getConnection();
    console.log('Successfully connected to MySQL/MariaDB database.');
    connection.release();
    return true;
  } catch (error) {
    console.error('MySQL/MariaDB connection failed:', error.message);
    return false;
  }
}

// 测试PostgreSQL连接
async function testPostgreSQLConnection() {
  try {
    const client = await postgresPool.connect();
    console.log('Successfully connected to PostgreSQL database.');
    client.release();
    return true;
  } catch (error) {
    console.error('PostgreSQL connection failed:', error.message);
    return false;
  }
}

// 初始化数据库连接
async function initializeDatabase() {
  console.log('正在初始化数据库连接...');
  
  // 优先尝试PostgreSQL（Replit提供）
  const postgresConnected = await testPostgreSQLConnection();
  if (postgresConnected) {
    console.log('使用PostgreSQL数据库');
    return { type: 'postgresql', pool: postgresPool };
  }
  
  // 如果PostgreSQL不可用，尝试MySQL/MariaDB
  const mysqlConnected = await testMySQLConnection();
  if (mysqlConnected) {
    console.log('使用MySQL/MariaDB数据库');
    return { type: 'mysql', pool: mysqlPool };
  }
  
  throw new Error('无法连接到任何数据库');
}

module.exports = {
  mysqlPool,
  postgresPool,
  initializeDatabase,
  testMySQLConnection,
  testPostgreSQLConnection
};