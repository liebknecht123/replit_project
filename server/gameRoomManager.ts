// 游戏房间管理模块 - TypeScript版本
import { db } from "./db";
import { gameRooms, gameRoomPlayers, users } from "@shared/schema";
import type { User, GameRoom, GameRoomPlayer } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { 
  GameState, 
  Card, 
  PlayedCards,
  GuanDanCardType,
  dealCards, 
  dealCardsToSinglePlayer,
  selectFirstPlayer, 
  createTeams,
  shufflePlayerOrder,
  checkGameFinished,
  calculateLevelChange,
  getNextPlayer,
  shouldResetRound,
  getLevelDisplayName
} from './gameLogic';

interface ConnectedPlayer {
  socketId: string;
  userId: number;
  username: string;
  nickname?: string;
  isHost: boolean;
  joinedAt: Date;
  isConnected: boolean;  // 新增：连接状态字段
}

interface GameLogEntry {
  id: string;
  timestamp: Date;
  message: string;
  type: 'system' | 'game' | 'player';
  playerId?: number;
  playerName?: string;
}

interface ActiveRoom {
  id: string;
  hostUserId: number;
  name: string;
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished' | 'tribute';
  players: ConnectedPlayer[];
  createdAt: Date;
  gameState?: GameState; // 游戏状态
  gameLogs: GameLogEntry[];  // 游戏日志历史
  currentLevel: number; // 当前等级
  gameRound: number; // 第几局游戏
}

export class GameRoomManager {
  private rooms = new Map<string, ActiveRoom>(); // roomId -> room data
  private playerRooms = new Map<string, string>(); // socketId -> roomId
  private userSockets = new Map<number, string>(); // userId -> socketId
  private gameTimers = new Map<string, NodeJS.Timeout>(); // roomId -> 定时器
  private io: any = null; // Socket.IO 实例

  // 设置Socket.IO实例
  setIO(io: any): void {
    this.io = io;
  }

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
    // 检查用户是否已经创建了房间
    const existingHostRoom = Array.from(this.rooms.values()).find(room => room.hostUserId === user.id);
    if (existingHostRoom) {
      throw new Error(`您已经创建了房间 ${existingHostRoom.id}，每个玩家只能创建一个房间`);
    }
    
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
          joinedAt: new Date(),
          isConnected: true  // 新增：初始连接状态为true
        }
      ],
      createdAt: new Date(),
      gameLogs: [],  // 初始化空日志数组
      currentLevel: 2, // 从2开始
      gameRound: 1 // 第1局
    };

    this.rooms.set(roomId, room);
    this.playerRooms.set(socketId, roomId);
    this.registerUserSocket(user.id, socketId);
    
    // 给房主发牌自娱自乐
    const hostCards = dealCardsToSinglePlayer(user.id, room.currentLevel);
    
    // 初始化房间的游戏状态（等待状态下的单人游戏）
    room.gameState = {
      roomId: roomId,
      players: [user.id],
      teams: { team1: [user.id], team2: [] }, // 暂时只有房主在队伍1
      hands: new Map([[user.id, hostCards]]),
      currentPlayer: user.id,
      playOrder: [user.id],
      currentPlayerIndex: 0,
      lastPlay: null,
      tableCards: [],
      gamePhase: 'waiting',
      currentLevel: room.currentLevel,
      levelProgress: { team1: 2, team2: 2 },
      gameRound: room.gameRound,
      finishedPlayers: [],
      passedPlayers: new Set(),
      consecutivePasses: 0,
      isFirstPlay: true
    };
    
    console.log(`房间已创建: ${roomId}, 房主: ${user.username}，已发牌给房主自娱自乐`);
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
      // 如果是重连情况，更新socket信息而不是拒绝
      if (!existingPlayer.isConnected) {
        existingPlayer.isConnected = true;
        existingPlayer.socketId = socketId;
        this.playerRooms.set(socketId, roomId);
        this.registerUserSocket(user.id, socketId);
        console.log(`玩家 ${user.username} 重连到房间: ${roomId}`);
        return { success: true, message: '重连成功', room: room };
      } else {
        return { success: false, message: '您已在该房间中' };
      }
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
      joinedAt: new Date(),
      isConnected: true  // 新增：初始连接状态为true
    });

    this.playerRooms.set(socketId, roomId);
    this.registerUserSocket(user.id, socketId);
    
    // 给新加入的玩家发牌自娱自乐（如果还在等待状态）
    if (room.status === 'waiting' && room.gameState) {
      const playerCards = dealCardsToSinglePlayer(user.id, room.currentLevel);
      room.gameState.hands.set(user.id, playerCards);
      room.gameState.players.push(user.id);
      console.log(`🃏 给新加入的玩家 ${user.username} 发牌自娱自乐，共 ${playerCards.length} 张`);
    }
    
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
        status: room.status as 'waiting' | 'playing' | 'finished' | 'tribute',
        players: playersData.map(p => ({
          socketId: this.userSockets.get(p.userId) || '',
          userId: p.userId,
          username: p.username,
          nickname: p.username,
          isHost: p.isHost === "true",
          joinedAt: p.joinedAt || new Date(),
          isConnected: this.userSockets.has(p.userId)  // 新增：根据是否有socket来判断连接状态
        })),
        createdAt: room.createdAt || new Date(),
        gameLogs: [],  // 从数据库加载时初始化空日志数组
        currentLevel: 2, // 默认从2开始
        gameRound: 1 // 默认第1局
      };

      this.rooms.set(roomId, activeRoom);
      return activeRoom;
    } catch (error) {
      console.error(`从数据库加载房间失败: ${error}`);
      return null;
    }
  }

  // 暂离房间（保留位置，不删除数据库记录）
  async temporaryLeaveRoom(socketId: string): Promise<ActiveRoom | null> {
    const roomId = this.playerRooms.get(socketId);
    if (!roomId) {
      return null;
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      this.playerRooms.delete(socketId);
      return null;
    }

    // 找到玩家并标记为暂离状态
    const player = room.players.find(p => p.socketId === socketId);
    if (player) {
      player.socketId = ''; // 清空socketId表示暂离
      player.isConnected = false;
      this.playerRooms.delete(socketId);
      this.unregisterUserSocket(player.userId);
      console.log(`玩家 ${player.username} 暂离房间: ${roomId}`);
    }

    return room;
  }

  // 离开房间（彻底离开，删除数据库记录）
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

  // 踢出玩家（仅房主可操作，游戏未开始时）
  async kickPlayer(roomId: string, hostUserId: number, targetUserId: number): Promise<{ success: boolean; message: string; room?: ActiveRoom; kickedPlayer?: ConnectedPlayer }> {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, message: '房间不存在' };
    }

    // 检查是否为房主
    if (room.hostUserId !== hostUserId) {
      return { success: false, message: '只有房主可以踢出玩家' };
    }

    // 检查游戏状态
    if (room.status !== 'waiting') {
      return { success: false, message: '游戏已开始，无法踢出玩家' };
    }

    // 不能踢出自己
    if (hostUserId === targetUserId) {
      return { success: false, message: '不能踢出自己' };
    }

    // 查找目标玩家
    const targetPlayerIndex = room.players.findIndex(p => p.userId === targetUserId);
    if (targetPlayerIndex === -1) {
      return { success: false, message: '玩家不在房间中' };
    }

    const kickedPlayer = room.players[targetPlayerIndex];
    
    // 从房间中移除玩家
    room.players.splice(targetPlayerIndex, 1);
    this.playerRooms.delete(kickedPlayer.socketId);
    this.unregisterUserSocket(kickedPlayer.userId);

    // 从数据库中删除
    await db.delete(gameRoomPlayers).where(
      and(
        eq(gameRoomPlayers.roomId, roomId),
        eq(gameRoomPlayers.userId, targetUserId)
      )
    );

    console.log(`玩家 ${kickedPlayer.username} 被房主踢出房间: ${roomId}`);
    return { success: true, message: '玩家已被踢出', room, kickedPlayer };
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

  // 通过用户ID查找房间（包括暂离状态）
  getUserRoom(userId: number): ActiveRoom | null {
    for (const room of this.rooms.values()) {
      const player = room.players.find(p => p.userId === userId);
      if (player) {
        return room;
      }
    }
    return null;
  }

  // 重新连接到房间
  async reconnectToRoom(socketId: string, userId: number): Promise<{ success: boolean; room?: ActiveRoom; message: string }> {
    // 查找用户是否在某个房间中（暂离状态）
    const room = this.getUserRoom(userId);
    if (!room) {
      return { success: false, message: '您没有可重连的房间' };
    }

    const player = room.players.find(p => p.userId === userId);
    if (!player) {
      return { success: false, message: '在房间中找不到您的信息' };
    }

    // 重新连接
    player.socketId = socketId;
    player.isConnected = true;
    this.playerRooms.set(socketId, room.id);
    this.registerUserSocket(userId, socketId);

    console.log(`玩家 ${player.username} 重新连接到房间: ${room.id}`);
    return { success: true, room, message: '重新连接成功' };
  }

  // 获取所有房间列表
  getAllRooms(): Array<{
    id: string;
    name: string;
    playerCount: number;
    maxPlayers: number;
    status: string;
    host: string;
    playerNames: string[];
    createdAt: Date;
  }> {
    // 在返回房间列表前，先清理所有房间的重复用户
    for (const roomId of Array.from(this.rooms.keys())) {
      this.cleanupDuplicatePlayersInRoom(roomId);
    }

    return Array.from(this.rooms.values()).map(room => ({
      id: room.id,
      name: room.name,
      playerCount: room.players.length,
      maxPlayers: room.maxPlayers,
      status: room.status,
      host: room.players.find(p => p.isHost)?.username || 'Unknown',
      playerNames: room.players.map(p => p.username),
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
    
    if (room.players.length !== 4) {
      return { success: false, message: '掼蛋需要恰好4个玩家才能开始游戏' };
    }
    
    if (room.status !== 'waiting') {
      return { success: false, message: '游戏已经开始或结束' };
    }
    
    // 导入游戏逻辑
    const { dealCards, shufflePlayerOrder, selectFirstPlayer } = await import('./gameLogic');
    
    // 创建游戏状态
    const playerIds = room.players.map(p => p.userId);
    console.log(`房间 ${roomId} 开始游戏，玩家列表: [${playerIds.join(', ')}]`);
    
    let hands: Map<number, import('./gameLogic').Card[]>;
    try {
      hands = dealCards(playerIds); // 严格要求4个玩家
      console.log(`房间 ${roomId} 发牌成功，共${hands.size}个玩家获得手牌`);
    } catch (error: any) {
      console.error(`房间 ${roomId} 发牌失败: ${error.message}`);
      return { success: false, message: '发牌失败：' + error.message };
    }
    
    // 在发牌逻辑之后，执行以下操作：
    // 1. 获取房间内所有玩家的ID列表 (必须是4个玩家)
    const allPlayerIds = playerIds;
    // 2. 随机打乱这个ID列表的顺序
    const playOrder = shufflePlayerOrder(allPlayerIds);
    // 3. 随机选择首出玩家
    const firstPlayer = selectFirstPlayer(allPlayerIds);
    // 4. 找到首出玩家在playOrder中的索引
    const currentPlayerIndex = playOrder.indexOf(firstPlayer);
    
    console.log(`房间 ${roomId} 随机选择首出玩家: ${firstPlayer}，在playOrder中的索引: ${currentPlayerIndex}`);
    
    // 创建完整的掼蛋游戏状态
    const teams = createTeams(allPlayerIds);
    const currentLevel = room.currentLevel || 2;
    const gameState: GameState = {
      roomId: roomId,
      players: allPlayerIds,
      teams: teams,
      hands: hands,
      currentPlayer: firstPlayer, // 使用随机选择的首出玩家
      playOrder: playOrder, // 固定的玩家ID顺序
      currentPlayerIndex: currentPlayerIndex, // 指向playOrder数组的当前回合索引
      lastPlay: null,
      tableCards: [],
      gamePhase: 'thinking',
      currentLevel: currentLevel,
      levelProgress: { team1: currentLevel, team2: currentLevel },
      gameRound: room.gameRound || 1,
      finishedPlayers: [],
      passedPlayers: new Set<number>(),
      consecutivePasses: 0,
      isFirstPlay: true
    };
    
    // 更新房间状态
    room.status = 'playing';
    room.gameState = gameState;
    
    // 更新数据库
    await db.update(gameRooms)
      .set({ status: 'playing' })
      .where(eq(gameRooms.id, roomId));

    // 启动60秒思考阶段定时器
    this.startThinkingTimer(roomId);
    
    return { 
      success: true, 
      message: '游戏开始！所有玩家有60秒时间思考策略...', 
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

  // 处理玩家断线（不移除玩家，只设置isConnected=false）
  async handlePlayerDisconnect(socketId: string): Promise<{ room: ActiveRoom | null; player: ConnectedPlayer | null }> {
    const roomId = this.playerRooms.get(socketId);
    if (!roomId) {
      return { room: null, player: null };
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      this.playerRooms.delete(socketId);
      return { room: null, player: null };
    }

    // 找到断线的玩家
    const playerIndex = room.players.findIndex(p => p.socketId === socketId);
    if (playerIndex === -1) {
      return { room: null, player: null };
    }

    const player = room.players[playerIndex];
    
    // 设置玩家为断线状态
    player.isConnected = false;
    
    // 从映射中移除socket连接信息
    this.playerRooms.delete(socketId);
    this.unregisterUserSocket(player.userId);

    console.log(`玩家 ${player.username} 断线，但保留在房间 ${roomId} 中`);
    
    return { room, player };
  }

  // 查找断线的玩家并处理重连
  findDisconnectedPlayerAndReconnect(userId: number, newSocketId: string): { room: ActiveRoom | null; player: ConnectedPlayer | null } {
    // 遍历所有房间查找断线的玩家
    const roomsArray = Array.from(this.rooms.entries());
    for (const [roomId, room] of roomsArray) {
      // 先清理同一用户的重复条目
      this.cleanupDuplicatePlayersInRoom(roomId);
      
      const playerIndex = room.players.findIndex((p: ConnectedPlayer) => p.userId === userId && !p.isConnected);
      
      if (playerIndex !== -1) {
        const player = room.players[playerIndex];
        
        // 重连玩家：更新连接状态和socket ID
        player.isConnected = true;
        player.socketId = newSocketId;
        
        // 更新映射关系
        this.playerRooms.set(newSocketId, roomId);
        this.registerUserSocket(userId, newSocketId);
        
        console.log(`玩家 ${player.username} (ID: ${userId}) 成功重连到房间 ${roomId}`);
        return { room, player };
      }
    }
    
    return { room: null, player: null };
  }

  // 清理房间中的重复玩家（保留最新连接，同步映射表）
  private cleanupDuplicatePlayersInRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const userIdToLatestPlayer = new Map<number, ConnectedPlayer>();
    const oldSocketsToRemove: string[] = [];

    // 找到每个用户的最新连接（保留最后一个）
    for (const player of room.players) {
      const existingPlayer = userIdToLatestPlayer.get(player.userId);
      if (existingPlayer) {
        // 发现重复用户，保留较新的连接
        if (player.joinedAt > existingPlayer.joinedAt) {
          // 当前玩家更新，移除旧的
          oldSocketsToRemove.push(existingPlayer.socketId);
          userIdToLatestPlayer.set(player.userId, player);
          console.log(`🧹 清理重复玩家: ${existingPlayer.username} (旧连接 ${existingPlayer.socketId})`);
        } else {
          // 旧玩家更新，移除当前的
          oldSocketsToRemove.push(player.socketId);
          console.log(`🧹 清理重复玩家: ${player.username} (旧连接 ${player.socketId})`);
        }
      } else {
        userIdToLatestPlayer.set(player.userId, player);
      }
    }

    if (oldSocketsToRemove.length > 0) {
      // 更新玩家列表为去重后的
      room.players = Array.from(userIdToLatestPlayer.values());
      
      // 清理映射表中的旧socket连接
      for (const oldSocketId of oldSocketsToRemove) {
        this.playerRooms.delete(oldSocketId);
      }
      
      console.log(`✅ 房间 ${roomId} 清理完成，玩家数量: ${room.players.length}，清理了 ${oldSocketsToRemove.length} 个重复连接`);
    }
  }

  // 添加游戏日志
  addGameLog(roomId: string, message: string, type: 'system' | 'game' | 'player' = 'system', playerId?: number, playerName?: string): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }

    const logEntry: GameLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      message: message,
      type: type,
      playerId: playerId,
      playerName: playerName
    };

    room.gameLogs.push(logEntry);
    
    // 限制日志条目数量，避免内存泄漏（保留最近100条）
    if (room.gameLogs.length > 100) {
      room.gameLogs = room.gameLogs.slice(-100);
    }
  }

  // 获取房间的游戏日志
  getGameLogs(roomId: string): GameLogEntry[] {
    const room = this.rooms.get(roomId);
    return room ? [...room.gameLogs] : [];
  }

  // 获取玩家昵称（优先使用nickname，回退到username）
  getPlayerDisplayName(roomId: string, playerId: number): string {
    const room = this.rooms.get(roomId);
    if (!room) {
      return `玩家${playerId}`;
    }

    const player = room.players.find(p => p.userId === playerId);
    return player ? (player.nickname || player.username) : `玩家${playerId}`;
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

  // 启动60秒思考阶段定时器
  startThinkingTimer(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room || !room.gameState) return;
    
    // 权威性检查：只有房间满4人且游戏正在进行时才启动计时器
    if (room.players.length !== 4 || room.status !== 'playing') {
      console.log(`房间 ${roomId} 不满足启动思考计时器条件：玩家数=${room.players.length}, 状态=${room.status}`);
      return;
    }

    // 清除之前的定时器
    this.clearTimer(roomId);

    const gameState = room.gameState;
    const startTime = Date.now();

    // 设置思考阶段定时器状态
    gameState.timerState = {
      phase: 'thinking',
      remainingTime: 60,
      startTime: startTime,
      duration: 60
    };

    // 向房间内所有玩家广播思考阶段开始
    this.broadcastTimerUpdate(roomId);

    // 启动倒计时更新
    this.startCountdown(roomId, 60, () => {
      // 60秒后切换到出牌阶段
      this.startPlayingPhase(roomId);
    });

    this.addGameLog(roomId, '🤔 思考阶段开始，60秒后进入出牌阶段', 'system');
    console.log(`房间 ${roomId} 启动60秒思考阶段定时器`);
  }

  // 启动出牌阶段定时器
  startPlayingTimer(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room || !room.gameState) return;
    
    // 权威性检查：只有房间满4人且游戏正在进行时才启动计时器
    if (room.players.length !== 4 || room.status !== 'playing') {
      console.log(`房间 ${roomId} 不满足启动出牌计时器条件：玩家数=${room.players.length}, 状态=${room.status}`);
      return;
    }

    // 清除之前的定时器
    this.clearTimer(roomId);

    const gameState = room.gameState;
    const startTime = Date.now();

    // 设置出牌阶段定时器状态
    gameState.timerState = {
      phase: 'playing',
      remainingTime: 30,
      startTime: startTime,
      duration: 30
    };

    // 立即向房间内所有玩家广播定时器更新
    this.broadcastTimerUpdate(roomId);

    // 启动30秒倒计时
    this.startCountdown(roomId, 30, () => {
      // 30秒后自动过牌
      this.autoPassTurn(roomId);
    });

    const currentPlayerName = this.getPlayerDisplayName(roomId, gameState.currentPlayer);
    this.addGameLog(roomId, `⏰ ${currentPlayerName} 有30秒出牌时间`, 'system');
    console.log(`房间 ${roomId} 启动30秒出牌定时器，当前玩家: ${gameState.currentPlayer}`);
  }

  // 启动倒计时
  startCountdown(roomId: string, seconds: number, onComplete: () => void): void {
    let remainingTime = seconds;
    
    const timer = setInterval(() => {
      remainingTime--;
      
      const room = this.rooms.get(roomId);
      if (!room || !room.gameState || !room.gameState.timerState) {
        clearInterval(timer);
        return;
      }
      
      // 权威性检查：如果房间条件不满足，停止计时器
      if (room.players.length !== 4 || room.status !== 'playing') {
        console.log(`房间 ${roomId} 计时器中止：条件不满足，玩家数=${room.players.length}, 状态=${room.status}`);
        clearInterval(timer);
        this.gameTimers.delete(roomId);
        return;
      }

      // 更新剩余时间
      room.gameState.timerState.remainingTime = remainingTime;
      
      // 每秒广播定时器更新
      this.broadcastTimerUpdate(roomId);

      if (remainingTime <= 0) {
        clearInterval(timer);
        this.gameTimers.delete(roomId);
        onComplete();
      }
    }, 1000);

    this.gameTimers.set(roomId, timer);
  }

  // 广播定时器更新给房间内所有玩家
  broadcastTimerUpdate(roomId: string): void {
    if (!this.io) return;

    const room = this.rooms.get(roomId);
    if (!room || !room.gameState || !room.gameState.timerState) return;
    
    // 权威性检查：只有房间满4人且游戏正在进行时才广播计时器更新
    if (room.players.length !== 4 || room.status !== 'playing') {
      console.log(`房间 ${roomId} 不满足计时器广播条件：玩家数=${room.players.length}, 状态=${room.status}`);
      return;
    }

    this.io.to(roomId).emit('timer_update', {
      phase: room.gameState.timerState.phase,
      remainingTime: room.gameState.timerState.remainingTime,
      duration: room.gameState.timerState.duration,
      currentPlayer: room.gameState.currentPlayer,
      gamePhase: room.gameState.gamePhase
    });
  }

  // 清除房间定时器
  clearTimer(roomId: string): void {
    const timer = this.gameTimers.get(roomId);
    if (timer) {
      clearInterval(timer);
      this.gameTimers.delete(roomId);
    }
  }

  // 切换到出牌阶段
  startPlayingPhase(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room || !room.gameState) return;

    // 更新游戏阶段
    room.gameState.gamePhase = 'playing';
    
    // 启动第一个玩家的出牌定时器
    this.startPlayingTimer(roomId);

    this.addGameLog(roomId, '🎯 思考阶段结束，开始出牌阶段！', 'system');
    
    // 广播游戏阶段更新
    if (this.io) {
      this.io.to(roomId).emit('game_phase_changed', {
        gamePhase: 'playing',
        currentPlayer: room.gameState.currentPlayer,
        message: '思考阶段结束，开始出牌！'
      });
    }

    console.log(`房间 ${roomId} 切换到出牌阶段`);
  }

  // 自动过牌（超时处理）
  autoPassTurn(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room || !room.gameState) return;

    const currentPlayer = room.gameState.currentPlayer;
    const playerName = this.getPlayerDisplayName(roomId, currentPlayer);

    // 添加过牌日志
    this.addGameLog(roomId, `⏰ ${playerName} 超时未出牌，自动过牌`, 'system');

    // 处理过牌逻辑
    room.gameState.passedPlayers.add(currentPlayer);
    room.gameState.consecutivePasses++;

    // 切换到下一个玩家
    const nextPlayerIndex = (room.gameState.currentPlayerIndex + 1) % room.gameState.playOrder.length;
    room.gameState.currentPlayerIndex = nextPlayerIndex;
    room.gameState.currentPlayer = room.gameState.playOrder[nextPlayerIndex];

    // 广播过牌事件
    if (this.io) {
      this.io.to(roomId).emit('turn_passed', {
        passedPlayer: currentPlayer,
        passedPlayerName: playerName,
        nextPlayer: room.gameState.currentPlayer,
        isAutoPass: true,
        message: `${playerName} 超时未出牌，自动过牌`
      });

      this.io.to(roomId).emit('turn_update', {
        currentPlayerId: room.gameState.currentPlayer,
        currentPlayerName: this.getPlayerDisplayName(roomId, room.gameState.currentPlayer)
      });
    }

    // 检查是否所有人都过牌了
    if (room.gameState.consecutivePasses >= 3) {
      // 清空桌面，重新开始
      room.gameState.lastPlay = null;
      room.gameState.passedPlayers.clear();
      room.gameState.consecutivePasses = 0;
      room.gameState.isFirstPlay = true;
      
      this.addGameLog(roomId, '🔄 所有玩家都过牌，重新开始出牌', 'system');
    }

    // 立即为下一个玩家启动30秒定时器
    this.startPlayingTimer(roomId);

    console.log(`房间 ${roomId} 玩家 ${currentPlayer} 自动过牌，下一个玩家: ${room.gameState.currentPlayer}`);
  }

  // 玩家主动出牌时停止定时器
  stopCurrentTimer(roomId: string): void {
    this.clearTimer(roomId);
    
    const room = this.rooms.get(roomId);
    if (room && room.gameState) {
      room.gameState.timerState = undefined;
    }
  }
}