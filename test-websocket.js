// WebSocket连接测试脚本
const io = require('socket.io-client');
const fetch = require('node-fetch');

async function testWebSocket() {
  console.log('开始WebSocket测试...');

  // 第一步：获取JWT token
  try {
    console.log('1. 正在登录获取JWT token...');
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'testuser2',
        password: 'password123'
      })
    });

    const loginResult = await loginResponse.json();
    
    if (!loginResult.success) {
      throw new Error(`登录失败: ${loginResult.message}`);
    }

    const jwtToken = loginResult.data.token;
    const user = loginResult.data.user;
    console.log(`✅ 登录成功: ${user.username} (${user.nickname})`);
    console.log(`JWT Token: ${jwtToken.substring(0, 50)}...`);

    // 第二步：连接WebSocket
    console.log('\n2. 正在连接WebSocket...');
    const socket = io('http://localhost:5000', {
      auth: {
        token: jwtToken
      }
    });

    // 连接事件处理
    socket.on('connect', () => {
      console.log(`✅ WebSocket连接成功! Socket ID: ${socket.id}`);
      
      // 第三步：测试房间功能
      setTimeout(() => {
        console.log('\n3. 开始测试房间功能...');
        
        // 创建房间
        console.log('📝 创建房间...');
        socket.emit('create_room');
        
        // 获取房间列表
        setTimeout(() => {
          console.log('📝 获取房间列表...');
          socket.emit('get_rooms');
        }, 1000);
        
      }, 500);
    });

    socket.on('connect_error', (error) => {
      console.log(`❌ WebSocket连接失败: ${error.message}`);
      process.exit(1);
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 WebSocket连接断开: ${reason}`);
    });

    // 房间事件处理
    socket.on('room_created', (data) => {
      console.log('🏠 房间创建结果:', data);
      if (data.success) {
        console.log(`✅ 房间创建成功: ${data.room.id}`);
        console.log(`房间信息: 玩家数量 ${data.room.players.length}, 房主 ${data.room.players[0].username}`);
        
        // 测试加入房间 (同一用户不能加入自己的房间，但可以测试逻辑)
        setTimeout(() => {
          console.log('\n📝 测试加入房间逻辑...');
          socket.emit('join_room', { roomId: data.room.id });
        }, 1000);
      }
    });

    socket.on('room_joined', (data) => {
      console.log('🚪 房间加入结果:', data);
    });

    socket.on('room_update', (data) => {
      console.log('📢 房间更新广播:', data.message);
      console.log(`当前玩家: ${data.players.map(p => p.username).join(', ')}`);
    });

    socket.on('rooms_list', (data) => {
      console.log('📋 房间列表:', data);
      if (data.success && data.rooms.length > 0) {
        console.log(`当前有 ${data.rooms.length} 个房间:`);
        data.rooms.forEach(room => {
          console.log(`  - ${room.id}: ${room.playerCount}/${room.maxPlayers} 人, 房主: ${room.host}, 状态: ${room.status}`);
        });
      } else {
        console.log('目前没有活跃的房间');
      }
      
      // 5秒后断开连接
      setTimeout(() => {
        console.log('\n✅ 测试完成，断开连接...');
        socket.disconnect();
        process.exit(0);
      }, 2000);
    });

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    process.exit(1);
  }
}

testWebSocket();