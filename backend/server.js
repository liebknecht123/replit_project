const express = require('express');
const { initializeDatabase } = require('./src/db');
const { createTables } = require('./src/database');

const app = express();
const PORT = 3000;

// 中间件
app.use(express.json());

// 数据库连接实例
let dbConnection = null;

// 根路由 - 返回JSON响应
app.get('/', (req, res) => {
  res.json({ 
    "message": "Backend server is live!",
    "database": dbConnection ? `Connected to ${dbConnection.type}` : "No database connection"
  });
});

// 数据库状态检查路由
app.get('/db-status', (req, res) => {
  if (dbConnection) {
    res.json({
      status: 'connected',
      type: dbConnection.type,
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(503).json({
      status: 'disconnected',
      message: 'Database connection not established'
    });
  }
});

// 启动服务器并初始化数据库
async function startServer() {
  try {
    // 初始化数据库连接
    dbConnection = await initializeDatabase();
    console.log('数据库连接已建立');
    
    // 创建数据表
    await createTables(dbConnection.type);
    console.log('数据表初始化完成');
    
    // 启动Express服务器
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Backend server running on port ${PORT}`);
      console.log(`访问 http://localhost:${PORT} 查看服务状态`);
      console.log(`数据库状态: http://localhost:${PORT}/db-status`);
    });
  } catch (error) {
    console.error('启动服务器失败:', error.message);
    console.log('服务器将继续运行，但没有数据库连接');
    
    // 即使数据库连接失败，仍然启动服务器
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Backend server running on port ${PORT} (without database)`);
    });
  }
}

startServer();
