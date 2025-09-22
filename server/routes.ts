import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
import { GameRoomManager } from "./gameRoomManager";
import jwt from "jsonwebtoken";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { 
  isPlayValid, 
  removeCardsFromHand, 
  getPlayType, 
  canBeatLastPlay, 
  checkGameFinished,
  calculateLevelChange,
  getNextPlayer,
  shouldResetRound,
  type PlayedCards,
  type Card
} from './gameLogic';

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

  // 创建startGame函数：包含所有开始游戏的逻辑
  const startGame = async (roomId: string) => {
    try {
      const result = await gameRoomManager.startGame(roomId, 0, true); // isAutoStart = true
      
      if (result.success && result.gameState) {
        // 将房间状态设为playing
        const room = gameRoomManager.getRoom(roomId);
        if (room) {
          room.status = 'playing';
        }

        // 为所有玩家私密发送手牌
        const gameState = result.gameState;
        const handsEntries = Array.from(gameState.hands.entries());
        for (const [playerId, hand] of handsEntries) {
          const playerSocketId = gameRoomManager.getUserSocket(playerId);
          if (playerSocketId) {
            io.to(playerSocketId).emit('your_hand', {
              cards: hand,
              playerCount: hand.length
            });
          }
        }

        console.log(`房间 ${roomId} 游戏开始！playOrder: ${JSON.stringify(gameState.playOrder)}, currentPlayerId: ${gameState.currentPlayer}`);
        return { success: true, message: result.message, gameState: gameState };
      } else {
        console.error(`房间 ${roomId} 开始游戏失败: ${result.message}`);
        return { success: false, message: result.message };
      }
    } catch (error: any) {
      console.error(`房间 ${roomId} 开始游戏失败: ${error.message}`);
      return { success: false, message: '开始游戏失败，请稍后重试' };
    }
  };

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

    // 断线重连逻辑：在JWT认证成功后立即检查是否有断线的玩家需要重连
    const { room: reconnectRoom, player: reconnectPlayer } = gameRoomManager.findDisconnectedPlayerAndReconnect(socket.userId, socket.id);
    
    if (reconnectRoom && reconnectPlayer) {
      // 让新的socket加入房间
      socket.join(reconnectRoom.id);
      
      // 获取当前游戏状态
      const gameState = gameRoomManager.getGameState(reconnectRoom.id);
      
      // 向重连的玩家发送reconnect_success事件，包含完整的游戏状态
      socket.emit('reconnect_success', {
        success: true,
        message: '重连成功！',
        room: reconnectRoom,
        gameState: gameState,
        yourCards: gameState ? gameState.hands.get(socket.userId) || [] : []
      });
      
      // 如果游戏已经开始，单独发送手牌给重连的玩家
      if (gameState && gameState.hands && gameState.hands.has(socket.userId)) {
        const playerHand = gameState.hands.get(socket.userId) || [];
        console.log(`🃏 向重连玩家 ${reconnectPlayer.username} 发送手牌，共 ${playerHand.length} 张`);
        socket.emit('your_hand', {
          cards: playerHand,
          playerCount: playerHand.length
        });
      }
      
      // 同步游戏日志给重连的玩家
      const gameLogs = gameRoomManager.getGameLogs(reconnectRoom.id);
      if (gameLogs && gameLogs.length > 0) {
        console.log(`📋 向重连玩家 ${reconnectPlayer.username} 同步游戏日志，共 ${gameLogs.length} 条`);
        socket.emit('game_logs_sync', {
          logs: gameLogs
        });
      }
      
      // 向房间内所有玩家广播player_reconnected事件
      io.to(reconnectRoom.id).emit('player_reconnected', {
        playerId: reconnectPlayer.userId,
        playerName: reconnectPlayer.username,
        message: `${reconnectPlayer.username} 重新连接了`
      });
      
      console.log(`玩家 ${reconnectPlayer.username} 成功重连到房间 ${reconnectRoom.id}`);
    }

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

        // 向所有连接的客户端广播房间列表更新
        const allRooms = gameRoomManager.getAllRooms();
        io.emit('global_rooms_update', {
          type: 'room_created',
          rooms: allRooms,
          message: `新房间 "${room.name}" 已创建`
        });

        console.log(`房间创建成功: ${room.id}, 创建者: ${socket.username}`);
      } catch (error: any) {
        console.error(`创建房间失败: ${error.message}`);
        socket.emit('room_created', {
          success: false,
          message: error.message || '创建房间失败，请稍后重试'
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
          
          console.log(`玩家 ${socket.username} 成功加入房间: ${roomId}`);

          // 获取该房间更新后的玩家数量
          const room = result.room;
          const currentPlayerCount = room.players.length;

          // 检查房间是否已满
          if (currentPlayerCount === room.maxPlayers) {
            console.log(`房间 ${room.id} 已满! 立即开始游戏...`);
            
            // 房间满员，立即调用startGame函数
            const gameStartResult = await startGame(roomId);
            
            if (gameStartResult.success && gameStartResult.gameState) {
              // 添加游戏开始日志
              const playOrderNames = gameStartResult.gameState.playOrder.map((id: number) => 
                gameRoomManager.getPlayerDisplayName(roomId, id)
              ).join(' -> ');
              const firstPlayerName = gameRoomManager.getPlayerDisplayName(roomId, gameStartResult.gameState.currentPlayer);
              
              gameRoomManager.addGameLog(roomId, `🎮 游戏开始！出牌顺序：${playOrderNames}`, 'system');
              gameRoomManager.addGameLog(roomId, `🎯 轮到 ${firstPlayerName} 先出牌`, 'system');
              
              // 向房间内所有玩家广播游戏开始
              console.log(`🚀 开始广播game_started事件到房间 ${roomId}，房间内玩家数量: ${room.players.length}`);
              io.to(roomId).emit('game_started', {
                success: true,
                message: '房间满员，游戏自动开始！',
                gameState: {
                  roomId: gameStartResult.gameState.roomId,
                  players: gameStartResult.gameState.players,
                  playOrder: gameStartResult.gameState.playOrder,
                  currentPlayerId: gameStartResult.gameState.currentPlayer,
                  currentPlayer: gameStartResult.gameState.currentPlayer,
                  gamePhase: gameStartResult.gameState.gamePhase,
                  currentLevel: gameStartResult.gameState.currentLevel
                }
              });
              console.log(`✅ game_started事件已广播到房间 ${roomId}`);
              
              // 向每个玩家单独发送他们的手牌
              room.players.forEach(player => {
                const playerHand = gameStartResult.gameState.hands.get(player.userId) || [];
                if (player.socketId) {
                  io.to(player.socketId).emit('your_hand', {
                    cards: playerHand,
                    playerCount: playerHand.length
                  });
                  console.log(`🃏 向玩家 ${player.username} 发送手牌，共 ${playerHand.length} 张`);
                }
              });
              
              // 广播房间状态更新，确保所有玩家看到房间已满且游戏开始
              console.log(`🔄 广播房间状态更新: status=playing, playerCount=${room.players.length}`);
              io.to(roomId).emit('room_update', {
                type: 'auto_game_started',
                roomId: room.id,
                room: {
                  ...room,
                  status: 'playing' // 确保状态为playing
                },
                players: room.players,
                status: 'playing',
                hostUserId: room.hostUserId,
                playerCount: room.players.length,
                maxPlayers: room.maxPlayers,
                message: '游戏已开始！'
              });

              // 向所有连接的客户端广播房间列表更新（游戏开始）
              const allRooms = gameRoomManager.getAllRooms();
              io.emit('global_rooms_update', {
                type: 'game_started',
                rooms: allRooms,
                message: `房间 "${room.name}" 的游戏已开始`
              });
              
              console.log(`房间 ${roomId} 游戏自动开始！`);
            } else {
              console.error(`房间 ${roomId} 开始游戏失败: ${gameStartResult.message}`);
            }
          } else {
            // 房间未满，广播房间状态更新
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

            // 向所有连接的客户端广播房间列表更新
            const allRooms = gameRoomManager.getAllRooms();
            io.emit('global_rooms_update', {
              type: 'player_joined',
              rooms: allRooms,
              message: `${socket.userInfo.username} 加入了房间 "${room.name}"`
            });
          }
        } else {
          // 加入失败时不再发送单独的socket.emit，统一记录日志即可
          console.log(`玩家 ${socket.username} 加入房间失败: ${result.message}`);
        }
      } catch (error: any) {
        console.error(`加入房间失败: ${error.message}`);
      }
    });

    // 过牌事件 - 将回合交给下一位玩家
    socket.on('pass_turn', async (data: any) => {
      try {
        const playerRoom = gameRoomManager.getPlayerRoom(socket.id);
        const roomId = playerRoom ? (typeof playerRoom === 'string' ? playerRoom : playerRoom.id) : null;
        
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

        // 添加过牌玩家到已过牌列表
        gameState.passedPlayers.add(socket.userInfo.id);
        gameState.consecutivePasses++;
        
        // 检查是否需要重置回合（其他玩家都过牌了）
        if (shouldResetRound(gameState.passedPlayers, gameState.playOrder, gameState.lastPlay?.player || -1)) {
          gameState.lastPlay = null;
          gameState.passedPlayers.clear();
          gameState.consecutivePasses = 0;
          gameState.isFirstPlay = true;
        }

        // 推进到下一个玩家
        const nextPlayer = getNextPlayer(gameState.currentPlayer, gameState.playOrder);
        gameState.currentPlayer = nextPlayer;
        gameState.currentPlayerIndex = gameState.playOrder.indexOf(nextPlayer);
        
        // 向房间内的所有客户端广播turn_update事件
        // 获取下一个玩家的昵称
        const nextPlayerName = gameRoomManager.getPlayerDisplayName(roomId!, gameState.currentPlayer);
        const passMessage = `${socket.userInfo.username} 选择过牌，轮到 ${nextPlayerName}`;
        
        // 添加游戏日志
        gameRoomManager.addGameLog(roomId!, passMessage, 'game', socket.userId, socket.userInfo.username);
        
        io.to(roomId!).emit('turn_update', {
          currentPlayerId: gameState.currentPlayer,
          message: passMessage
        });

        console.log(`玩家 ${socket.userInfo.username} 过牌，回合交给 ${nextPlayerName}`);
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
        const playerRoom = gameRoomManager.getPlayerRoom(socket.id);
        const roomId = playerRoom ? (typeof playerRoom === 'string' ? playerRoom : playerRoom.id) : null;
        
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
        const playerHand = gameState.hands.get(socket.userInfo.id) || [];
        
        // 使用掼蛋规则验证出牌
        const validation = isPlayValid(cards, gameState.lastPlay, playerHand, gameState.currentLevel || 2);

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
        
        const playType = getPlayType(cards, gameState.currentLevel || 2);
        gameState.lastPlay = {
          cards: cards,
          playType: playType,
          player: socket.userInfo.id,
          canBeBeaten: playType !== 'four_kings', // 四王不能被打败
          priority: 1 // 临时设置，稍后会被正确计算"
        } as PlayedCards;
        gameState.tableCards = cards;
        
        // 重置过牌状态
        gameState.passedPlayers.clear();
        gameState.consecutivePasses = 0;
        gameState.isFirstPlay = false;

        // 检查游戏是否结束
        const gameResult = checkGameFinished(gameState.hands, gameState.finishedPlayers);

        // 格式化牌面信息
        const cardsDisplay = cards.map((card: Card) => {
          const suitSymbols: { [key: string]: string } = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠', joker: '🃏' };
          const rankNames = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', '小王', '大王'];
          return `${suitSymbols[card.suit] || '?'}${rankNames[card.rank] || card.rank}`;
        }).join(' ');

        // 添加游戏日志
        gameRoomManager.addGameLog(roomId!, 
          `${socket.userInfo.username} 出牌: ${cardsDisplay} (${playType})，剩余${newHand.length}张`, 
          'game', socket.userId, socket.userInfo.username);

        // 广播出牌结果
        io.to(roomId!).emit('cards_played', {
          playerId: socket.userInfo.id,
          playerName: socket.userInfo.username,
          cards: cards,
          cardsDisplay: cardsDisplay,
          playType: gameState.lastPlay.playType,
          remainingCards: newHand.length,
          message: `${socket.userInfo.username} 出牌: ${cardsDisplay} (${playType})`
        });

        socket.emit('play_cards_result', {
          success: true,
          message: '出牌成功'
        });

        // 更新完成的玩家列表
        if (gameResult.newFinishedPlayers.length > gameState.finishedPlayers.length) {
          gameState.finishedPlayers = gameResult.newFinishedPlayers;
        }

        // 如果游戏结束
        if (gameResult.finished && gameResult.rankings) {
          gameState.gamePhase = 'finished';
          
          // 计算升级结果
          const levelResult = calculateLevelChange(gameResult.rankings, gameState.teams);
          
          io.to(roomId!).emit('game_finished', {
            rankings: gameResult.rankings,
            levelChange: levelResult,
            message: `游戏结束！${levelResult.winningTeam === 1 ? '队伍1' : '队伍2'} 获胜，升 ${levelResult.levelChange} 级！`
          });
          
          console.log(`游戏结束！排名: ${gameResult.rankings.join(' > ')}`);
        } else {
          // 推进到下一个玩家
          const nextPlayer = getNextPlayer(gameState.currentPlayer, gameState.playOrder);
          gameState.currentPlayer = nextPlayer;
          gameState.currentPlayerIndex = gameState.playOrder.indexOf(nextPlayer);
          
          // 向房间内的所有客户端广播turn_update事件
          // 获取下一个玩家的昵称
          const nextPlayerName = gameRoomManager.getPlayerDisplayName(roomId!, gameState.currentPlayer);
          const turnMessage = `轮到 ${nextPlayerName} 出牌`;
          
          // 添加游戏日志
          gameRoomManager.addGameLog(roomId!, `${socket.userInfo.username} 出牌成功，${turnMessage}`, 'game', socket.userId, socket.userInfo.username);
          
          io.to(roomId!).emit('turn_update', {
            currentPlayerId: gameState.currentPlayer,
            message: turnMessage
          });

          console.log(`玩家 ${socket.userInfo.username} 出牌成功，回合交给 ${nextPlayerName}`);
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
          // 添加游戏开始日志
          const playOrderNames = result.gameState.playOrder.map((id: number) => 
            gameRoomManager.getPlayerDisplayName(roomId, id)
          ).join(' -> ');
          const firstPlayerName = gameRoomManager.getPlayerDisplayName(roomId, result.gameState.playOrder[0]);
          
          gameRoomManager.addGameLog(roomId, `🎮 游戏开始！出牌顺序：${playOrderNames}`, 'system');
          gameRoomManager.addGameLog(roomId, `🎯 轮到 ${firstPlayerName} 先出牌`, 'system');
          
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
      
      // 处理玩家断线（不移除玩家，只设置isConnected=false）
      const { room, player } = await gameRoomManager.handlePlayerDisconnect(socket.id);
      if (room && player) {
        // 向房间内其他玩家广播断线事件
        io.to(room.id).emit('player_disconnected', {
          playerId: player.userId,
          playerName: player.username,
          message: `${player.username} 断线了，但仍在房间中等待重连`
        });
        
        // 向所有连接的客户端广播房间列表更新（玩家断线）
        const allRooms = gameRoomManager.getAllRooms();
        io.emit('global_rooms_update', {
          type: 'player_disconnected',
          rooms: allRooms,
          message: `${player.username} 从房间 "${room.name}" 断线`
        });
        
        console.log(`玩家 ${player.username} 断线，房间 ${room.id} 中其他玩家已收到通知`);
      }
    });

    // 处理游戏日志同步请求
    socket.on('request_game_logs', (data: any) => {
      try {
        const { roomId } = data;
        if (!roomId) {
          socket.emit('error', { message: '房间ID不能为空' });
          return;
        }

        const gameLogs = gameRoomManager.getGameLogs(roomId);
        
        socket.emit('game_logs_sync', {
          success: true,
          roomId: roomId,
          logs: gameLogs
        });

        console.log(`发送游戏日志给玩家 ${socket.username}，房间 ${roomId}，共 ${gameLogs.length} 条`);
      } catch (error: any) {
        console.error(`游戏日志同步失败: ${error.message}`);
        socket.emit('game_logs_sync', {
          success: false,
          message: '获取游戏日志失败'
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
