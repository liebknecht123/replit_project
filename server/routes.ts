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

  // 用户注册路由
  app.post('/api/auth/register', async (req, res) => {
    const { username, password, nickname } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: '用户名和密码不能为空' 
      });
    }

    // 用户名验证
    if (username.length > 15) {
      return res.status(400).json({ 
        error: "用户名不符合规范，必须是15位以内的字母或数字。" 
      });
    }

    const usernameRegex = /^[a-zA-Z0-9]+$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ 
        error: "用户名不符合规范，必须是15位以内的字母或数字。" 
      });
    }

    try {
      // 检查用户是否已存在
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ 
          success: false, 
          message: '用户名已存在' 
        });
      }

      // 创建新用户
      const newUser = await storage.createUser({
        username,
        password_hash: password, // 简单实现，实际项目应该使用bcrypt
        nickname: nickname || username
      });

      res.json({
        success: true,
        message: '用户注册成功',
        data: {
          user: {
            id: newUser.id,
            username: newUser.username,
            nickname: newUser.nickname
          }
        }
      });

    } catch (error) {
      console.error('注册错误:', error);
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
    path: '/ws',  // 使用 /ws 路径避免与Vite HMR冲突
    allowEIO3: true  // 允许Engine.IO v3客户端连接到v4服务器
  });

  // JWT认证中间件 - 优雅处理认证错误
  io.use(async (socket: any, next) => {
    try {
      // 尝试从多个位置获取token
      const token = socket.handshake.auth?.token || 
                   socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
                   socket.handshake.query?.token;
      
      if (!token) {
        console.log(`Socket连接被拒绝: 缺少JWT token, Socket ID: ${socket.id}, IP: ${socket.handshake.address}`);
        return next(new Error('AUTHENTICATION_FAILED'));
      }

      // 验证JWT token
      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET) as any;
      } catch (jwtError: any) {
        console.log(`Socket连接被拒绝: JWT无效, Socket ID: ${socket.id}, Error: ${jwtError.message}`);
        return next(new Error('INVALID_TOKEN'));
      }
      
      // 获取用户信息
      let user;
      try {
        [user] = await db.select().from(users).where(eq(users.id, decoded.userId));
      } catch (dbError: any) {
        console.log(`Socket连接被拒绝: 数据库查询失败, Socket ID: ${socket.id}, Error: ${dbError.message}`);
        return next(new Error('DATABASE_ERROR'));
      }

      if (!user) {
        console.log(`Socket连接被拒绝: 用户不存在, UserID: ${decoded.userId}, Socket ID: ${socket.id}`);
        return next(new Error('USER_NOT_FOUND'));
      }

      // 将用户信息附加到socket
      socket.userId = decoded.userId;
      socket.username = decoded.username;
      socket.userInfo = user;

      console.log(`✅ Socket认证成功: ${decoded.username} (ID: ${decoded.userId}), Socket ID: ${socket.id}`);
      next(); // 成功认证，允许连接
    } catch (error: any) {
      console.log(`❌ Socket连接被拒绝: 意外错误, Socket ID: ${socket.id}, Error: ${error.message}`);
      next(new Error('INTERNAL_ERROR'));
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

        // 首先，找到玩家要加入的目标房间
        const result = await gameRoomManager.joinRoom(roomId, socket.id, socket.userInfo);
        
        if (result.success && result.room) {
          // 让客户端加入Socket.IO房间
          socket.join(roomId);
          
          // 向加入者发送成功消息
          socket.emit('room_joined', {
            success: true,
            room: result.room,
            message: `成功加入房间 ${roomId}`
          });

          console.log(`玩家 ${socket.username} 成功加入房间: ${roomId}`);

          // 在完成添加操作之后，获取该房间更新后的玩家数量
          const room = result.room;
          const currentPlayerCount = room.players.length;

          // 最关键的条件判断
          if (currentPlayerCount === room.maxPlayers) {
            // 如果玩家数量等于最大玩家数
            console.log(`房间 ${room.id} 已满! 立即开始游戏...`); // 添加这条关键日志用于验证
            
            // 延迟1秒后自动开始游戏，给客户端时间处理房间更新
            setTimeout(async () => {
              const autoStartResult = await startGameForRoom(room.id, room.hostUserId, true);
              if (autoStartResult.success) {
                // 向房间内所有玩家广播满员自动开始的消息
                io.to(room.id).emit('room_update', {
                  type: 'auto_game_started',
                  roomId: room.id,
                  room: gameRoomManager.getRoom(room.id),
                  status: 'playing',
                  message: '房间已满员，游戏自动开始！'
                });
              }
            }, 1000);
          } else {
            // 如果玩家数量未满，正常广播房间更新事件
            io.to(roomId).emit('room_update', {
              type: 'player_joined',
              roomId: room.id,
              room: room,
              players: room.players,
              status: room.status,
              hostUserId: room.hostUserId,
              playerCount: room.players.length,
              maxPlayers: room.maxPlayers,
              message: `${socket.userInfo.username} 加入了房间`
            });
          }
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

    // 过牌事件 - 将回合交给下一位玩家
    socket.on('pass_turn', async (data: any) => {
      try {
        const roomId = gameRoomManager.getPlayerRoom(socket.id);
        
        if (!roomId) {
          socket.emit('pass_turn_result', {
            success: false,
            message: '你不在任何房间中'
          });
          return;
        }

        const gameState = gameRoomManager.getGameState(roomId);
        if (!gameState) {
          socket.emit('pass_turn_result', {
            success: false,
            message: '游戏状态不存在'
          });
          return;
        }

        // 验证是否轮到当前用户出牌
        if (gameState.currentPlayer !== socket.userInfo.id) {
          socket.emit('pass_turn_result', {
            success: false,
            message: '现在不是你的回合'
          });
          return;
        }

        // 调用advanceTurn函数，将回合交给下一位玩家
        const turnResult = gameRoomManager.advanceTurn(roomId);
        
        if (turnResult.success) {
          // 向房间内的所有客户端广播turn_update事件
          io.to(roomId).emit('turn_update', {
            currentPlayerId: turnResult.currentPlayerId,
            message: `${socket.userInfo.username} 选择过牌`
          });

          socket.emit('pass_turn_result', {
            success: true,
            message: '过牌成功'
          });

          console.log(`玩家 ${socket.userInfo.username} 过牌，回合交给玩家 ${turnResult.currentPlayerId}`);
        } else {
          socket.emit('pass_turn_result', {
            success: false,
            message: turnResult.message || '过牌失败'
          });
        }
      } catch (error: any) {
        console.error(`过牌失败: ${error.message}`);
        socket.emit('pass_turn_result', {
          success: false,
          message: '过牌失败，请稍后重试'
        });
      }
    });

    // 出牌事件 - 在权威验证确认出牌合法之后也调用advanceTurn
    socket.on('play_cards', async (data: any) => {
      try {
        const { cards } = data;
        const roomId = gameRoomManager.getPlayerRoom(socket.id);
        
        if (!roomId) {
          socket.emit('play_cards_result', {
            success: false,
            message: '你不在任何房间中'
          });
          return;
        }

        const gameState = gameRoomManager.getGameState(roomId);
        if (!gameState) {
          socket.emit('play_cards_result', {
            success: false,
            message: '游戏状态不存在'
          });
          return;
        }

        // 验证是否轮到当前用户出牌
        if (gameState.currentPlayer !== socket.userInfo.id) {
          socket.emit('play_cards_result', {
            success: false,
            message: '现在不是你的回合'
          });
          return;
        }

        // 权威验证：检查玩家是否有这些牌并且出牌合法
        const { isPlayValid, removeCardsFromHand, getPlayType, isGameFinished } = await import('./gameLogic');
        const playerHand = gameState.hands.get(socket.userInfo.id) || [];
        const validation = isPlayValid(cards, gameState.lastPlay, playerHand);

        if (!validation.valid) {
          socket.emit('play_cards_result', {
            success: false,
            message: validation.error || '出牌无效'
          });
          return;
        }

        // 出牌成功，更新游戏状态
        const newHand = removeCardsFromHand(playerHand, cards);
        gameState.hands.set(socket.userInfo.id, newHand);
        
        gameState.lastPlay = {
          cards: cards,
          playType: getPlayType(cards), // 使用正确的牌型计算
          player: socket.userInfo.id
        };
        gameState.tableCards = cards;

        // 检查游戏是否结束
        const gameResult = isGameFinished(gameState.hands);

        // 广播出牌结果
        io.to(roomId).emit('cards_played', {
          playerId: socket.userInfo.id,
          playerName: socket.userInfo.username,
          cards: cards,
          playType: gameState.lastPlay.playType,
          remainingCards: newHand.length,
          message: `${socket.userInfo.username} 出牌`
        });

        socket.emit('play_cards_result', {
          success: true,
          message: '出牌成功'
        });

        // 如果游戏结束
        if (gameResult.finished) {
          gameState.gamePhase = 'finished';
          io.to(roomId).emit('game_finished', {
            winner: gameResult.winner,
            message: `游戏结束！玩家 ${gameResult.winner} 获胜！`
          });
          
          console.log(`游戏结束！玩家 ${gameResult.winner} 获胜！`);
        } else {
          // 在权威验证确认出牌合法之后，调用advanceTurn函数
          const turnResult = gameRoomManager.advanceTurn(roomId);
          
          if (turnResult.success) {
            // 向房间内的所有客户端广播turn_update事件
            io.to(roomId).emit('turn_update', {
              currentPlayerId: turnResult.currentPlayerId,
              message: `轮到玩家 ${turnResult.currentPlayerId} 出牌`
            });

            console.log(`玩家 ${socket.userInfo.username} 出牌成功，回合交给玩家 ${turnResult.currentPlayerId}`);
          }
        }

      } catch (error: any) {
        console.error(`出牌失败: ${error.message}`);
        socket.emit('play_cards_result', {
          success: false,
          message: '出牌失败，请稍后重试'
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

    // 开始游戏的封装函数
    const startGameForRoom = async (roomId: string, initiatorUserId?: number, isAutoStart: boolean = false) => {
      try {
        const result = await gameRoomManager.startGame(roomId, initiatorUserId || 0, isAutoStart);
        
        if (result.success && result.gameState) {
          // 向房间内所有玩家广播游戏开始，包含完整的playOrder数组和初始的currentPlayerId
          io.to(roomId).emit('game_started', {
            success: true,
            message: result.message,
            gameState: {
              roomId: result.gameState.roomId,
              players: result.gameState.players,
              playOrder: result.gameState.playOrder, // 完整的playOrder数组
              currentPlayerId: result.gameState.playOrder[0], // 初始的currentPlayerId
              currentPlayer: result.gameState.currentPlayer,
              gamePhase: result.gameState.gamePhase,
              currentLevel: result.gameState.currentLevel
            }
          });

          // 私密发送每个玩家的手牌
          for (const [playerId, hand] of Array.from(result.gameState.hands.entries())) {
            const playerSocketId = gameRoomManager.getUserSocket(playerId);
            if (playerSocketId) {
              io.to(playerSocketId).emit('your_hand', {
                cards: hand,
                playerCount: hand.length
              });
            }
          }

          console.log(`房间 ${roomId} 游戏自动开始！`);
          return { success: true, message: result.message };
        } else {
          console.error(`房间 ${roomId} 开始游戏失败: ${result.message}`);
          return { success: false, message: result.message };
        }
      } catch (error: any) {
        console.error(`房间 ${roomId} 开始游戏失败: ${error.message}`);
        return { success: false, message: '开始游戏失败，请稍后重试' };
      }
    };

    // 开始游戏事件
    socket.on('start_game', async (data: any) => {
      try {
        const room = gameRoomManager.getPlayerRoom(socket.id);
        if (!room) {
          socket.emit('start_game_result', {
            success: false,
            message: '你不在任何房间中'
          });
          return;
        }

        const result = await startGameForRoom(room.id, socket.userId);
        
        socket.emit('start_game_result', {
          success: result.success,
          message: result.message
        });
      } catch (error: any) {
        console.error(`开始游戏失败: ${error.message}`);
        socket.emit('start_game_result', {
          success: false,
          message: '开始游戏失败，请稍后重试'
        });
      }
    });


    // 断开连接事件
    socket.on('disconnect', async () => {
      console.log(`用户断开连接: ${socket.username}, socket id: ${socket.id}`);
      
      // 处理玩家离开房间
      const room = await gameRoomManager.leaveRoom(socket.id);
      if (room) {
        // 向房间内剩余客户端广播完整房间状态更新
        io.to(room.id).emit('room_update', {
          type: 'player_left',
          roomId: room.id,
          room: room,
          players: room.players,
          status: room.status,
          hostUserId: room.hostUserId,
          playerCount: room.players.length,
          maxPlayers: room.maxPlayers,
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
