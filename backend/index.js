const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// 导入数据库模块
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 主路由 - 返回后端运行状态
app.get('/', (req, res) => {
  res.json({ "status": "Backend is running" });
});

// 健康检查端点
app.get('/health', async (req, res) => {
  const dbConnected = await db.testConnection();
  res.json({ 
    status: dbConnected ? 'healthy' : 'unhealthy', 
    timestamp: new Date().toISOString(),
    service: 'backend',
    database: {
      type: 'MariaDB',
      connected: dbConnected,
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      database: process.env.DB_NAME || 'monorepo_db'
    }
  });
});

// API路由 - 服务信息
app.get('/api/info', (req, res) => {
  res.json({
    name: 'Monorepo Backend API',
    version: '1.0.0',
    description: 'Node.js Express后端服务',
    database: 'MariaDB',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API路由 - 获取所有服务状态
app.get('/api/services', async (req, res) => {
  try {
    const services = await db.getServices();
    res.json(services);
  } catch (error) {
    console.error('获取服务数据失败:', error);
    res.status(500).json({ error: '无法获取服务数据' });
  }
});

// API路由 - 获取项目统计信息
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await db.getProjectStats();
    if (stats) {
      res.json({
        buildStatus: stats.build_status,
        tests: {
          passed: stats.tests_passed,
          total: stats.tests_total
        },
        coverage: parseFloat(stats.coverage)
      });
    } else {
      res.json({
        buildStatus: 'unknown',
        tests: { passed: 0, total: 0 },
        coverage: 0
      });
    }
  } catch (error) {
    console.error('获取项目统计失败:', error);
    res.status(500).json({ error: '无法获取项目统计数据' });
  }
});

// API路由 - 更新服务状态
app.put('/api/services/:name/status', async (req, res) => {
  try {
    const { name } = req.params;
    const { status, health } = req.body;
    
    await db.updateServiceStatus(name, status, health);
    res.json({ message: `服务 ${name} 状态已更新` });
  } catch (error) {
    console.error('更新服务状态失败:', error);
    res.status(500).json({ error: '无法更新服务状态' });
  }
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器内部错误' });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({ error: '路由未找到' });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Backend服务运行在端口 ${PORT}`);
  console.log(`访问 http://localhost:${PORT} 查看服务状态`);
  
  // 测试数据库连接
  console.log('正在测试数据库连接...');
  await db.testConnection();
});

module.exports = app;