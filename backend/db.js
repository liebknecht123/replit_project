const mysql = require('mysql2/promise');
require('dotenv').config();

// MariaDB连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'monorepo_user',
  password: process.env.DB_PASSWORD || 'monorepo_password',
  database: process.env.DB_NAME || 'monorepo_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000
};

// 创建连接池
const pool = mysql.createPool(dbConfig);

// 数据库连接测试函数
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MariaDB数据库连接成功');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ MariaDB数据库连接失败:', error.message);
    return false;
  }
}

// 查询函数包装器
async function query(sql, params = []) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('数据库查询错误:', error);
    throw error;
  }
}

// 获取所有服务
async function getServices() {
  const sql = 'SELECT * FROM services ORDER BY name';
  return await query(sql);
}

// 获取项目统计信息
async function getProjectStats() {
  const sql = 'SELECT * FROM project_stats ORDER BY updated_at DESC LIMIT 1';
  const results = await query(sql);
  return results[0] || null;
}

// 更新服务状态
async function updateServiceStatus(serviceName, status, health = null) {
  const sql = 'UPDATE services SET status = ?, health = ?, updated_at = NOW() WHERE name = ?';
  return await query(sql, [status, health, serviceName]);
}

// 插入或更新项目统计
async function updateProjectStats(buildStatus, testsPassed, testsTotal, coverage) {
  const sql = `
    INSERT INTO project_stats (build_status, tests_passed, tests_total, coverage) 
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE 
    build_status = VALUES(build_status),
    tests_passed = VALUES(tests_passed),
    tests_total = VALUES(tests_total),
    coverage = VALUES(coverage),
    updated_at = NOW()
  `;
  return await query(sql, [buildStatus, testsPassed, testsTotal, coverage]);
}

module.exports = {
  pool,
  testConnection,
  query,
  getServices,
  getProjectStats,
  updateServiceStatus,
  updateProjectStats
};