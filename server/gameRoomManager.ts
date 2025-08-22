// 游戏房间管理模块 - TypeScript版本
import { db } from "./db";
import { gameRooms, gameRoomPlayers, users } from "@shared/schema";
import type { User, GameRoom, GameRoomPlayer } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

interface ConnectedPlayer {
  socketId: string;
  userId: number;
  username: string;
  nickname?: string;
  isHost: boolean;
  joinedAt: Date;
}

interface ActiveRoom {
  id: string;
  hostUserId: number;
  name: string;
  maxPlayers: number;
  status: string;
  players: ConnectedPlayer[];
  createdAt: Date;
  gameState?: import('./gameLogic').GameState; // 游戏状态
}

export class GameRoomManager {
  private rooms = new Map<string, ActiveRoom>(); // roomId -> room data
  private playerRooms = new Map<string, string>(); // socketId -> roomId
  private userSockets = new Map<number, string>(); // userId -> socketId

  // 生成唯一房间ID
  generateRoomId(): string {
    return 'room_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // 注册用户socket连接
  registerUserSocket(userId: number, socketId: string): void {
    this.userSockets.set(userId, socketId);
    console.log(`用户 ${userId} 的socket ${socketId} 已注册`);
  }

  // 注销用户socket连接
  unregisterUserSocket(userId: number): void {
    this.userSockets.delete(userId);
    console.log(`用户 ${userId} 的socket连接已注销`);
  }

  // 创建新房间
  async createRoom(socketId: string, user: User, roomName?: string): Promise<ActiveRoom> {
    const roomId = this.generateRoomId();
    const displayName = roomName || `${user.username}的房间`;
    
    // 存储到数据库
    await db.insert(gameRooms).values({
      id: roomId,
      hostUserId: user.id,
      name: displayName,
      maxPlayers: "4",
      status: "waiting"
    });

    // 添加房主为第一个玩家
    await db.insert(gameRoomPlayers).values({
      roomId: roomId,
      userId: user.id,
      isHost: "true"
    });

    // 创建内存中的房间
    const room: ActiveRoom = {
      id: roomId,
      hostUserId: user.id,
      name: displayName,
      maxPlayers: 4,
      status: 'waiting',
      players: [
        {
          socketId: socketId,
          userId: user.id,
          username: user.username,
          nickname: user.username,
          isHost: true,
          joinedAt: new Date()
        }
      ],
      createdAt: new Date()
    };

    this.rooms.set(roomId, room);
    this.playerRooms.set(socketId, roomId);
    this.registerUserSocket(user.id, socketId);
    
    console.log(`房间已创建: ${roomId}, 房主: ${user.username}`);
    return room;
  }

  // 加入房间
  async joinRoom(roomId: string, socketId: string, user: User): Promise<{ success: boolean; message: string; room?: ActiveRoom }> {
    let room = this.rooms.get(roomId);
    
    // 如果内存中没有房间，尝试从数据库加载
    if (!room) {
      const loadedRoom = await this.loadRoomFromDatabase(roomId);
      if (!loadedRoom) {
        return { success: false, message: '房间不存在' };
      }
      room = loadedRoom;
    }

    if (room.players.length >= room.maxPlayers) {
      return { success: false, message: '房间已满' };
    }

    if (room.status !== 'waiting') {
      return { success: false, message: '房间已开始游戏，无法加入' };
    }

    // 检查用户是否已在房间中
    const existingPlayer = room.players.find(p => p.userId === user.id);
    if (existingPlayer) {
      return { success: false, message: '您已在该房间中' };
    }

    // 添加到数据库
    await db.insert(gameRoomPlayers).values({
      roomId: roomId,
      userId: user.id,
      isHost: "false"
    });

    // 添加玩家到内存房间
    room.players.push({
      socketId: socketId,
      userId: user.id,
      username: user.username,
      nickname: user.username,
      isHost: false,
      joinedAt: new Date()
    });

    this.playerRooms.set(socketId, roomId);
    this.registerUserSocket(user.id, socketId);
    
    console.log(`玩家 ${user.username} 加入房间: ${roomId}`);
    return { success: true, message: '加入成功', room: room };
  }

  // 从数据库加载房间
  private async loadRoomFromDatabase(roomId: string): Promise<ActiveRoom | null> {
    try {
      // 获取房间基本信息
      const roomData = await db
        .select()
        .from(gameRooms)
        .where(eq(gameRooms.id, roomId))
        .limit(1);

      if (roomData.length === 0) {
        return null;
      }

      const room = roomData[0];

      // 获取房间成员
      const playersData = await db
        .select({
          userId: gameRoomPlayers.userId,
          username: users.username,
          isHost: gameRoomPlayers.isHost,
          joinedAt: gameRoomPlayers.joinedAt,
        })
        .from(gameRoomPlayers)
        .innerJoin(users, eq(gameRoomPlayers.userId, users.id))
        .where(eq(gameRoomPlayers.roomId, roomId));

      // 构建房间对象（注意：socketId在加载时为空，需要后续更新）
      const activeRoom: ActiveRoom = {
        id: room.id,
        hostUserId: room.hostUserId,
        name: room.name,
        maxPlayers: parseInt(room.maxPlayers),
        status: room.status,
        players: playersData.map(p => ({
          socketId: this.userSockets.get(p.userId) || '',
          userId: p.userId,
          username: p.username,
          nickname: p.username,
          isHost: p.isHost === "true",
          joinedAt: p.joinedAt || new Date()
        })),
        createdAt: room.createdAt || new Date()
      };

      this.rooms.set(roomId, activeRoom);
      return activeRoom;
    } catch (error) {
      console.error(`从数据库加载房间失败: ${error}`);
      return null;
    }
  }

  // 离开房间
  async leaveRoom(socketId: string): Promise<ActiveRoom | null> {
    const roomId = this.playerRooms.get(socketId);
    if (!roomId) {
      return null;
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      this.playerRooms.delete(socketId);
      return null;
    }

    // 从房间中移除玩家
    const playerIndex = room.players.findIndex(p => p.socketId === socketId);
    if (playerIndex === -1) {
      return null;
    }

    const leavingPlayer = room.players[playerIndex];
    room.players.splice(playerIndex, 1);
    this.playerRooms.delete(socketId);
    this.unregisterUserSocket(leavingPlayer.userId);

    // 从数据库中删除
    await db.delete(gameRoomPlayers).where(
      and(
        eq(gameRoomPlayers.roomId, roomId),
        eq(gameRoomPlayers.userId, leavingPlayer.userId)
      )
    );

    console.log(`玩家 ${leavingPlayer.username} 离开房间: ${roomId}`);

    // 如果房间为空，删除房间
    if (room.players.length === 0) {
      this.rooms.delete(roomId);
      await db.delete(gameRooms).where(eq(gameRooms.id, roomId));
      console.log(`房间已删除: ${roomId}`);
      return null;
    }

    // 如果房主离开，选择新房主
    if (leavingPlayer.isHost && room.players.length > 0) {
      room.players[0].isHost = true;
      room.hostUserId = room.players[0].userId;
      
      // 更新数据库
      await db.update(gameRooms)
        .set({ hostUserId: room.players[0].userId })
        .where(eq(gameRooms.id, roomId));
      
      await db.update(gameRoomPlayers)
        .set({ isHost: "true" })
        .where(
          and(
            eq(gameRoomPlayers.roomId, roomId),
            eq(gameRoomPlayers.userId, room.players[0].userId)
          )
        );
      
      console.log(`新房主: ${room.players[0].username} 在房间 ${roomId}`);
    }

    return room;
  }

  // 获取房间信息
  getRoom(roomId: string): ActiveRoom | undefined {
    return this.rooms.get(roomId);
  }

  // 获取玩家所在房间
  getPlayerRoom(socketId: string): ActiveRoom | null {
    const roomId = this.playerRooms.get(socketId);
    return roomId ? this.rooms.get(roomId) || null : null;
  }

  // 获取所有房间列表
  getAllRooms(): Array<{
    id: string;
    name: string;
    playerCount: number;
    maxPlayers: number;
    status: string;
    host: string;
    createdAt: Date;
  }> {
    return Array.from(this.rooms.values()).map(room => ({
      id: room.id,
      name: room.name,
      playerCount: room.players.length,
      maxPlayers: room.maxPlayers,
      status: room.status,
      host: room.players.find(p => p.isHost)?.username || 'Unknown',
      createdAt: room.createdAt
    }));
  }

  // 更新玩家的socketId（重连时使用）
  updatePlayerSocket(userId: number, newSocketId: string): void {
    // 找到用户所在的房间并更新socketId
    const roomsArray = Array.from(this.rooms.values());
    for (const room of roomsArray) {
      const player = room.players.find((p: ConnectedPlayer) => p.userId === userId);
      if (player) {
        // 删除旧的socket映射
        if (player.socketId) {
          this.playerRooms.delete(player.socketId);
        }
        
        // 设置新的socket映射
        player.socketId = newSocketId;
        this.playerRooms.set(newSocketId, room.id);
        this.registerUserSocket(userId, newSocketId);
        
        console.log(`用户 ${userId} 的socket已更新: ${newSocketId}`);
        break;
      }
    }
  }

  // 开始游戏 (需要4个玩家，房主触发或系统自动触发)
  async startGame(roomId: string, hostUserId: number, isAutoStart: boolean = false): Promise<{ success: boolean; message: string; gameState?: import('./gameLogic').GameState }> {
    const room = this.rooms.get(roomId);
    
    if (!room) {
      return { success: false, message: '房间不存在' };
    }
    
    // 如果不是自动开始，需要验证房主权限
    if (!isAutoStart && room.hostUserId !== hostUserId) {
      return { success: false, message: '只有房主可以开始游戏' };
    }
    
    if (room.players.length < 2) {  // 暂时用2个玩家测试
      return { success: false, message: '至少需要2个玩家才能开始游戏' };
    }
    
    if (room.status !== 'waiting') {
      return { success: false, message: '游戏已经开始或结束' };
    }
    
    // 导入游戏逻辑
    const { dealCards, shufflePlayerOrder } = await import('./gameLogic');
    
    // 创建游戏状态
    const playerIds = room.players.map(p => p.userId);
    const hands = dealCards(playerIds.slice(0, 4)); // 确保最多4个玩家
    
    // 在发牌逻辑之后，执行以下操作：
    // 1. 获取房间内所有玩家的ID列表
    const allPlayerIds = playerIds.slice(0, 4);
    // 2. 随机打乱这个ID列表的顺序
    const playOrder = shufflePlayerOrder(allPlayerIds);
    // 3. 将currentPlayerIndex初始化为0
    const currentPlayerIndex = 0;
    
    const gameState: import('./gameLogic').GameState = {
      roomId: roomId,
      players: allPlayerIds,
      hands: hands,
      currentPlayer: playOrder[currentPlayerIndex], // 使用playOrder[0]作为当前玩家
      playOrder: playOrder, // 固定的玩家ID顺序
      currentPlayerIndex: currentPlayerIndex, // 指向playOrder数组的当前回合索引
      lastPlay: null,
      tableCards: [],
      gamePhase: 'playing',
      currentLevel: 2 // 从2开始
    };
    
    // 更新房间状态
    room.status = 'playing';
    room.gameState = gameState;
    
    // 更新数据库
    await db.update(gameRooms)
      .set({ status: 'playing' })
      .where(eq(gameRooms.id, roomId));
    
    return { 
      success: true, 
      message: '游戏开始！', 
      gameState: gameState 
    };
  }

  // 获取房间的游戏状态
  getGameState(roomId: string): import('./gameLogic').GameState | null {
    const room = this.rooms.get(roomId);
    return room?.gameState || null;
  }

  // 更新房间的游戏状态
  updateGameState(roomId: string, gameState: import('./gameLogic').GameState): boolean {
    const room = this.rooms.get(roomId);
    if (room) {
      room.gameState = gameState;
      return true;
    }
    return false;
  }

  // 获取用户的Socket ID
  getUserSocket(userId: number): string | undefined {
    return this.userSockets.get(userId);
  }

  // 回合推进函数
  advanceTurn(roomId: string): { success: boolean; currentPlayerId?: number; message?: string } {
    const room = this.rooms.get(roomId);
    
    if (!room || !room.gameState) {
      return { success: false, message: '房间或游戏状态不存在' };
    }
    
    const gameState = room.gameState;
    
    // 将currentPlayerIndex加1，如果等于4就重置为0
    gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % 4;
    
    // 更新当前玩家
    gameState.currentPlayer = gameState.playOrder[gameState.currentPlayerIndex];
    
    return { 
      success: true, 
      currentPlayerId: gameState.currentPlayer 
    };
  }
}