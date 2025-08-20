const express = require('express');
const bcrypt = require('bcrypt');
const { initializeDatabase } = require('./src/db');
const { createTables } = require('./src/database');
const { findUserByUsername, createUser } = require('./src/userService');

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

// 用户注册API路由
app.post('/api/auth/register', async (req, res) => {
  try {
    // 1. 从 req.body 获取 username 和 password
    const { username, password, nickname } = req.body;
    
    // 验证必填字段
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空'
      });
    }
    
    // 验证用户名长度
    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({
        success: false,
        message: '用户名长度必须在3-50个字符之间'
      });
    }
    
    // 验证密码长度
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: '密码长度不能少于6个字符'
      });
    }
    
    // 检查数据库连接
    if (!dbConnection) {
      return res.status(503).json({
        success: false,
        message: '数据库连接未建立'
      });
    }
    
    // 2. 检查数据库中用户名是否已存在
    const existingUser = await findUserByUsername(username, dbConnection.type, dbConnection.pool);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: '用户名已存在'
      });
    }
    
    // 3. 使用 bcrypt 哈希密码 & 4. 将新用户存入数据库
    const userData = {
      username: username.trim(),
      password: password,
      nickname: nickname ? nickname.trim() : username.trim()
    };
    
    const newUser = await createUser(userData, dbConnection.type);
    
    // 5. 返回成功响应（不返回密码哈希）
    res.status(201).json({
      success: true,
      message: '用户注册成功',
      data: {
        id: newUser.id,
        username: newUser.username,
        nickname: newUser.nickname,
        created_at: newUser.created_at
      }
    });
    
    console.log(`新用户注册成功: ${username}`);
    
  } catch (error) {
    console.error('用户注册失败:', error.message);
    res.status(500).json({
      success: false,
      message: '服务器内部错误，请稍后重试'
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
