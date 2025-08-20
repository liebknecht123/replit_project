// 游戏房间管理模块
class GameRoomManager {
  constructor() {
    this.rooms = new Map(); // roomId -> room data
    this.playerRooms = new Map(); // socketId -> roomId
  }

  // 生成唯一房间ID
  generateRoomId() {
    return 'room_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // 创建新房间
  createRoom(socketId, playerInfo) {
    const roomId = this.generateRoomId();
    const room = {
      id: roomId,
      host: socketId,
      players: [
        {
          socketId: socketId,
          userId: playerInfo.userId,
          username: playerInfo.username,
          nickname: playerInfo.nickname,
          isHost: true,
          joinedAt: new Date()
        }
      ],
      createdAt: new Date(),
      maxPlayers: 4, // 默认最多4人
      status: 'waiting' // waiting, playing, finished
    };

    this.rooms.set(roomId, room);
    this.playerRooms.set(socketId, roomId);
    
    console.log(`房间已创建: ${roomId}, 房主: ${playerInfo.username}`);
    return room;
  }

  // 加入房间
  joinRoom(roomId, socketId, playerInfo) {
    const room = this.rooms.get(roomId);
    
    if (!room) {
      return { success: false, message: '房间不存在' };
    }

    if (room.players.length >= room.maxPlayers) {
      return { success: false, message: '房间已满' };
    }

    if (room.status !== 'waiting') {
      return { success: false, message: '房间已开始游戏，无法加入' };
    }

    // 检查用户是否已在房间中
    const existingPlayer = room.players.find(p => p.userId === playerInfo.userId);
    if (existingPlayer) {
      return { success: false, message: '您已在该房间中' };
    }

    // 添加玩家到房间
    room.players.push({
      socketId: socketId,
      userId: playerInfo.userId,
      username: playerInfo.username,
      nickname: playerInfo.nickname,
      isHost: false,
      joinedAt: new Date()
    });

    this.playerRooms.set(socketId, roomId);
    
    console.log(`玩家 ${playerInfo.username} 加入房间: ${roomId}`);
    return { success: true, room: room };
  }

  // 离开房间
  leaveRoom(socketId) {
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

    console.log(`玩家 ${leavingPlayer.username} 离开房间: ${roomId}`);

    // 如果房间为空，删除房间
    if (room.players.length === 0) {
      this.rooms.delete(roomId);
      console.log(`房间已删除: ${roomId}`);
      return null;
    }

    // 如果房主离开，选择新房主
    if (leavingPlayer.isHost && room.players.length > 0) {
      room.players[0].isHost = true;
      room.host = room.players[0].socketId;
      console.log(`新房主: ${room.players[0].username} 在房间 ${roomId}`);
    }

    return room;
  }

  // 获取房间信息
  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  // 获取玩家所在房间
  getPlayerRoom(socketId) {
    const roomId = this.playerRooms.get(socketId);
    return roomId ? this.rooms.get(roomId) : null;
  }

  // 获取所有房间列表
  getAllRooms() {
    return Array.from(this.rooms.values()).map(room => ({
      id: room.id,
      playerCount: room.players.length,
      maxPlayers: room.maxPlayers,
      status: room.status,
      host: room.players.find(p => p.isHost)?.username || 'Unknown',
      createdAt: room.createdAt
    }));
  }
}

module.exports = GameRoomManager;