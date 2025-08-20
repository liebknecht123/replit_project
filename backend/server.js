const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { initializeDatabase } = require('./src/db');
const { createTables } = require('./src/database');
const { findUserByUsername, createUser, validatePassword } = require('./src/userService');
const GameRoomManager = require('./src/gameRoom');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = 3000;
const gameRoomManager = new GameRoomManager();

// JWT密钥 (生产环境中应该使用环境变量)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

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

// 用户登录API路由
app.post('/api/auth/login', async (req, res) => {
  try {
    // 获取用户名和密码
    const { username, password } = req.body;
    
    // 验证必填字段
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空'
      });
    }
    
    // 检查数据库连接
    if (!dbConnection) {
      return res.status(503).json({
        success: false,
        message: '数据库连接未建立'
      });
    }
    
    // 根据username在users表中查找用户
    const user = await findUserByUsername(username, dbConnection.type, dbConnection.pool);
    
    // 如果用户不存在，返回404 Not Found错误
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 使用bcrypt.compare()比较密码
    const isPasswordValid = await validatePassword(password, user.password_hash);
    
    // 如果密码不匹配，返回401 Unauthorized错误
    if (!isPasswordValid) {
      console.log(`用户 ${username} 登录失败: 密码错误`);
      return res.status(401).json({
        success: false,
        message: '密码错误'
      });
    }
    
    // 生成JWT Token，包含userId和username
    const tokenPayload = {
      userId: user.id,
      username: user.username,
      iat: Math.floor(Date.now() / 1000) // 签发时间
    };
    
    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: '24h' // Token有效期24小时
    });
    
    // 返回成功响应包含Token
    res.status(200).json({
      success: true,
      message: '登录成功',
      data: {
        user: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          created_at: user.created_at
        },
        token: token,
        expiresIn: '24h'
      }
    });
    
    console.log(`用户 ${username} 登录成功`);
    
  } catch (error) {
    console.error('用户登录失败:', error.message);
    res.status(500).json({
      success: false,
      message: '服务器内部错误，请稍后重试'
    });
  }
});

// JWT验证中间件 for Socket.IO
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      console.log(`Socket连接被拒绝: 缺少JWT token, Socket ID: ${socket.id}`);
      return next(new Error('Authentication error: No token provided'));
    }

    // 验证JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 获取用户信息
    const user = await findUserByUsername(decoded.username, dbConnection.type, dbConnection.pool);
    if (!user) {
      console.log(`Socket连接被拒绝: 用户不存在, Username: ${decoded.username}`);
      return next(new Error('Authentication error: User not found'));
    }

    // 将用户信息附加到socket
    socket.userId = decoded.userId;
    socket.username = decoded.username;
    socket.userInfo = {
      userId: user.id,
      username: user.username,
      nickname: user.nickname
    };

    console.log(`Socket认证成功: ${decoded.username}, Socket ID: ${socket.id}`);
    next();
  } catch (error) {
    console.log(`Socket连接被拒绝: JWT验证失败, Socket ID: ${socket.id}, Error: ${error.message}`);
    next(new Error('Authentication error: Invalid token'));
  }
};

// WebSocket连接处理
io.use(authenticateSocket);

io.on('connection', (socket) => {
  console.log(`用户已连接 WebSocket, socket id: ${socket.id}, 用户: ${socket.username}`);

  // 创建房间事件
  socket.on('create_room', () => {
    try {
      const room = gameRoomManager.createRoom(socket.id, socket.userInfo);
      
      // 让客户端加入Socket.IO房间
      socket.join(room.id);
      
      // 向创建者发送房间信息
      socket.emit('room_created', {
        success: true,
        room: room,
        message: `房间 ${room.id} 创建成功`
      });

      console.log(`房间创建成功: ${room.id}, 创建者: ${socket.username}`);
    } catch (error) {
      console.error(`创建房间失败: ${error.message}`);
      socket.emit('room_created', {
        success: false,
        message: '创建房间失败，请稍后重试'
      });
    }
  });

  // 加入房间事件
  socket.on('join_room', (data) => {
    try {
      const { roomId } = data;
      
      if (!roomId) {
        socket.emit('room_joined', {
          success: false,
          message: '房间ID不能为空'
        });
        return;
      }

      const result = gameRoomManager.joinRoom(roomId, socket.id, socket.userInfo);
      
      if (result.success) {
        // 让客户端加入Socket.IO房间
        socket.join(roomId);
        
        // 向加入者发送成功消息
        socket.emit('room_joined', {
          success: true,
          room: result.room,
          message: `成功加入房间 ${roomId}`
        });

        // 向房间内所有客户端广播玩家列表更新
        io.to(roomId).emit('room_update', {
          type: 'player_joined',
          room: result.room,
          players: result.room.players,
          message: `${socket.userInfo.username} 加入了房间`
        });

        console.log(`玩家 ${socket.username} 成功加入房间: ${roomId}`);
      } else {
        socket.emit('room_joined', {
          success: false,
          message: result.message
        });
        console.log(`玩家 ${socket.username} 加入房间失败: ${result.message}`);
      }
    } catch (error) {
      console.error(`加入房间失败: ${error.message}`);
      socket.emit('room_joined', {
        success: false,
        message: '加入房间失败，请稍后重试'
      });
    }
  });

  // 获取房间列表事件
  socket.on('get_rooms', () => {
    try {
      const rooms = gameRoomManager.getAllRooms();
      socket.emit('rooms_list', {
        success: true,
        rooms: rooms
      });
    } catch (error) {
      console.error(`获取房间列表失败: ${error.message}`);
      socket.emit('rooms_list', {
        success: false,
        message: '获取房间列表失败'
      });
    }
  });

  // 断开连接事件
  socket.on('disconnect', () => {
    console.log(`用户断开连接: ${socket.username}, socket id: ${socket.id}`);
    
    // 处理玩家离开房间
    const room = gameRoomManager.leaveRoom(socket.id);
    if (room) {
      // 向房间内剩余客户端广播更新
      io.to(room.id).emit('room_update', {
        type: 'player_left',
        room: room,
        players: room.players,
        message: `${socket.username} 离开了房间`
      });
    }
  });

  // 发送当前房间列表给新连接的用户
  const rooms = gameRoomManager.getAllRooms();
  socket.emit('rooms_list', {
    success: true,
    rooms: rooms
  });
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
    
    // 启动Express服务器 (with Socket.IO)
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Backend server (Express + Socket.IO) running on port ${PORT}`);
      console.log(`访问 http://localhost:${PORT} 查看服务状态`);
      console.log(`数据库状态: http://localhost:${PORT}/db-status`);
      console.log(`WebSocket服务已启用，支持游戏房间功能`);
    });
  } catch (error) {
    console.error('启动服务器失败:', error.message);
    console.log('服务器将继续运行，但没有数据库连接');
    
    // 即使数据库连接失败，仍然启动服务器
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Backend server running on port ${PORT} (without database)`);
    });
  }
}

startServer();
