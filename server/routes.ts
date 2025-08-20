import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
import { GameRoomManager } from "./gameRoomManager";
import jwt from "jsonwebtoken";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key';
const gameRoomManager = new GameRoomManager();

export async function registerRoutes(app: Express): Promise<Server> {
  // 基础认证路由示例
  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: '用户名和密码不能为空' 
      });
    }

    try {
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: '用户不存在' 
        });
      }

      // 简单密码检查（实际项目应该使用bcrypt）
      if (user.password_hash !== password) {
        return res.status(401).json({ 
          success: false, 
          message: '密码错误' 
        });
      }

      // 生成JWT Token
      const token = jwt.sign(
        { 
          userId: user.id, 
          username: user.username,
          iat: Math.floor(Date.now() / 1000)
        }, 
        JWT_SECRET, 
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        message: '登录成功',
        data: {
          user: {
            id: user.id,
            username: user.username
          },
          token,
          expiresIn: '24h'
        }
      });

    } catch (error) {
      console.error('登录错误:', error);
      res.status(500).json({ 
        success: false, 
        message: '服务器内部错误' 
      });
    }
  });

  const httpServer = createServer(app);

  // 设置Socket.IO服务器
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    path: '/ws'  // 使用 /ws 路径避免与Vite HMR冲突
  });

  // JWT认证中间件
  io.use(async (socket: any, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        console.log(`Socket连接被拒绝: 缺少JWT token, Socket ID: ${socket.id}`);
        return next(new Error('Authentication error: No token provided'));
      }

      // 验证JWT token
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // 获取用户信息
      const [user] = await db.select().from(users).where(eq(users.id, decoded.userId));
      if (!user) {
        console.log(`Socket连接被拒绝: 用户不存在, UserID: ${decoded.userId}`);
        return next(new Error('Authentication error: User not found'));
      }

      // 将用户信息附加到socket
      socket.userId = decoded.userId;
      socket.username = decoded.username;
      socket.userInfo = user;

      console.log(`Socket认证成功: ${decoded.username}, Socket ID: ${socket.id}`);
      next();
    } catch (error: any) {
      console.log(`Socket连接被拒绝: JWT验证失败, Socket ID: ${socket.id}, Error: ${error.message}`);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // WebSocket连接处理
  io.on('connection', (socket: any) => {
    console.log(`用户已连接 WebSocket, socket id: ${socket.id}, 用户: ${socket.username}`);

    // 创建房间事件
    socket.on('create_room', async (data: any) => {
      try {
        const roomName = data?.name || undefined;
        const room = await gameRoomManager.createRoom(socket.id, socket.userInfo, roomName);
        
        // 让客户端加入Socket.IO房间
        socket.join(room.id);
        
        // 向创建者发送房间信息
        socket.emit('room_created', {
          success: true,
          room: room,
          message: `房间 ${room.id} 创建成功`
        });

        console.log(`房间创建成功: ${room.id}, 创建者: ${socket.username}`);
      } catch (error: any) {
        console.error(`创建房间失败: ${error.message}`);
        socket.emit('room_created', {
          success: false,
          message: '创建房间失败，请稍后重试'
        });
      }
    });

    // 加入房间事件
    socket.on('join_room', async (data: any) => {
      try {
        const { roomId } = data;
        
        if (!roomId) {
          socket.emit('room_joined', {
            success: false,
            message: '房间ID不能为空'
          });
          return;
        }

        const result = await gameRoomManager.joinRoom(roomId, socket.id, socket.userInfo);
        
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
            players: result.room!.players,
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
      } catch (error: any) {
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
      } catch (error: any) {
        console.error(`获取房间列表失败: ${error.message}`);
        socket.emit('rooms_list', {
          success: false,
          message: '获取房间列表失败'
        });
      }
    });

    // 断开连接事件
    socket.on('disconnect', async () => {
      console.log(`用户断开连接: ${socket.username}, socket id: ${socket.id}`);
      
      // 处理玩家离开房间
      const room = await gameRoomManager.leaveRoom(socket.id);
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

  return httpServer;
}
