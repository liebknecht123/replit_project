// 用户服务模块 - 处理用户相关的数据库操作
const bcrypt = require('bcrypt');
const { mysqlPool, postgresPool } = require('./db');

// 根据数据库类型查询用户
async function findUserByUsername(username, dbType, dbConnection) {
  if (dbType === 'postgresql') {
    const client = await postgresPool.connect();
    try {
      const result = await client.query('SELECT * FROM users WHERE username = $1', [username]);
      client.release();
      return result.rows[0];
    } catch (error) {
      client.release();
      throw error;
    }
  } else if (dbType === 'mysql') {
    const [rows] = await mysqlPool.execute('SELECT * FROM users WHERE username = ?', [username]);
    return rows[0];
  }
}

// 创建新用户
async function createUser(userData, dbType) {
  const { username, password, nickname } = userData;
  
  // 哈希密码
  const saltRounds = 10;
  const password_hash = await bcrypt.hash(password, saltRounds);
  
  if (dbType === 'postgresql') {
    const client = await postgresPool.connect();
    try {
      const result = await client.query(
        'INSERT INTO users (username, password_hash, nickname) VALUES ($1, $2, $3) RETURNING id, username, nickname, created_at',
        [username, password_hash, nickname]
      );
      client.release();
      return result.rows[0];
    } catch (error) {
      client.release();
      throw error;
    }
  } else if (dbType === 'mysql') {
    const [result] = await mysqlPool.execute(
      'INSERT INTO users (username, password_hash, nickname) VALUES (?, ?, ?)',
      [username, password_hash, nickname]
    );
    
    // 获取刚插入的用户信息
    const [newUser] = await mysqlPool.execute(
      'SELECT id, username, nickname, created_at FROM users WHERE id = ?',
      [result.insertId]
    );
    return newUser[0];
  }
}

// 验证用户密码
async function validatePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

// 获取所有用户（管理功能）
async function getAllUsers(dbType) {
  if (dbType === 'postgresql') {
    const client = await postgresPool.connect();
    try {
      const result = await client.query('SELECT id, username, nickname, created_at FROM users ORDER BY created_at DESC');
      client.release();
      return result.rows;
    } catch (error) {
      client.release();
      throw error;
    }
  } else if (dbType === 'mysql') {
    const [rows] = await mysqlPool.execute('SELECT id, username, nickname, created_at FROM users ORDER BY created_at DESC');
    return rows;
  }
}

module.exports = {
  findUserByUsername,
  createUser,
  validatePassword,
  getAllUsers
};