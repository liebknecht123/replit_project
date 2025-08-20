// 数据库表管理模块
const { mysqlPool, postgresPool } = require('./db');

// 创建users表 - MySQL/MariaDB版本
async function createUsersTableMySQL() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      nickname VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  try {
    await mysqlPool.execute(createTableSQL);
    console.log('Users表创建成功 (MySQL)');
    
    // 创建索引
    await mysqlPool.execute('CREATE INDEX IF NOT EXISTS idx_username ON users(username)');
    await mysqlPool.execute('CREATE INDEX IF NOT EXISTS idx_created_at ON users(created_at)');
    console.log('Users表索引创建成功 (MySQL)');
  } catch (error) {
    console.error('创建Users表失败 (MySQL):', error.message);
    throw error;
  }
}

// 创建users表 - PostgreSQL版本  
async function createUsersTablePostgreSQL() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      nickname VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  try {
    const client = await postgresPool.connect();
    await client.query(createTableSQL);
    
    // 创建索引
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)');
    
    client.release();
    console.log('Users表创建成功 (PostgreSQL)');
  } catch (error) {
    console.error('创建Users表失败 (PostgreSQL):', error.message);
    throw error;
  }
}

// 根据数据库类型创建表
async function createTables(dbType) {
  try {
    if (dbType === 'mysql') {
      await createUsersTableMySQL();
    } else if (dbType === 'postgresql') {
      await createUsersTablePostgreSQL();
    }
    console.log('所有数据表创建完成');
  } catch (error) {
    console.error('创建数据表失败:', error.message);
  }
}

module.exports = {
  createTables,
  createUsersTableMySQL,
  createUsersTablePostgreSQL
};