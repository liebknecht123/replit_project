# WebSocket 游戏房间功能实现文档

## 概述

本项目实现了基于 Socket.IO 的实时游戏房间管理系统，支持房间创建、加入、离开等功能，并包含完整的用户认证机制。

## 技术栈

- **后端**: Node.js + Express + TypeScript
- **WebSocket**: Socket.IO 4.x
- **数据库**: PostgreSQL + Drizzle ORM
- **认证**: JWT (JSON Web Tokens)

## 核心功能

### 1. 用户认证系统

#### JWT认证流程
- 用户通过 `/api/auth/login` 端点登录
- 成功登录后获得JWT token
- WebSocket连接时需要在握手阶段传递token进行认证

#### 认证中间件
```typescript
io.use(async (socket: any, next) => {
  // JWT token验证
  // 用户信息注入到socket对象
});
```

### 2. 游戏房间管理

#### 房间数据结构
```typescript
interface ActiveRoom {
  id: string;          // 唯一房间ID
  hostUserId: number;  // 房主用户ID
  name: string;        // 房间名称
  maxPlayers: number;  // 最大玩家数
  status: string;      // 房间状态: waiting, playing, finished
  players: ConnectedPlayer[]; // 当前玩家列表
  createdAt: Date;     // 创建时间
}

interface ConnectedPlayer {
  socketId: string;    // Socket连接ID
  userId: number;      // 用户ID
  username: string;    // 用户名
  nickname?: string;   // 昵称
  isHost: boolean;     // 是否为房主
  joinedAt: Date;      // 加入时间
}
```

### 3. WebSocket事件

#### 客户端发送事件
- `create_room`: 创建新房间
- `join_room`: 加入房间
- `get_rooms`: 获取房间列表

#### 服务器发送事件
- `room_created`: 房间创建结果
- `room_joined`: 加入房间结果
- `room_update`: 房间状态更新（玩家加入/离开）
- `rooms_list`: 房间列表

## 数据库设计

### 表结构

#### users 表
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  nickname VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### game_rooms 表
```sql
CREATE TABLE game_rooms (
  id VARCHAR(255) PRIMARY KEY,
  host_user_id INTEGER REFERENCES users(id) NOT NULL,
  name TEXT NOT NULL,
  max_players TEXT NOT NULL DEFAULT '4',
  status TEXT NOT NULL DEFAULT 'waiting',
  settings JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### game_room_players 表
```sql
CREATE TABLE game_room_players (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id VARCHAR(255) REFERENCES game_rooms(id) NOT NULL,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  is_host TEXT NOT NULL DEFAULT 'false',
  joined_at TIMESTAMP DEFAULT NOW()
);
```

## 文件结构

```
server/
├── index.ts                 # 主服务器入口
├── routes.ts                # 路由和WebSocket处理
├── gameRoomManager.ts       # 游戏房间管理器
├── storage.ts               # 数据存储层
└── db.ts                    # 数据库连接配置

shared/
└── schema.ts               # 数据模型定义

test-websocket-client.html  # WebSocket测试客户端
```

## API接口

### 用户认证

#### POST /api/auth/login
登录并获取JWT token

**请求体:**
```json
{
  "username": "testuser",
  "password": "testpass"
}
```

**响应:**
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "user": {
      "id": 1,
      "username": "testuser"
    },
    "token": "jwt.token.here",
    "expiresIn": "24h"
  }
}
```

## WebSocket连接示例

### 客户端连接
```javascript
const socket = io('/ws', {
  auth: {
    token: 'jwt.token.here'
  }
});

socket.on('connect', () => {
  console.log('WebSocket连接成功');
});
```

### 创建房间
```javascript
socket.emit('create_room', { name: '我的房间' });

socket.on('room_created', (data) => {
  if (data.success) {
    console.log('房间创建成功:', data.room);
  }
});
```

### 加入房间
```javascript
socket.emit('join_room', { roomId: 'room_123' });

socket.on('room_joined', (data) => {
  if (data.success) {
    console.log('成功加入房间:', data.room);
  }
});
```

## 测试

### 测试环境设置

1. **创建测试用户:**
```sql
INSERT INTO users (username, password_hash, nickname) 
VALUES ('testuser', 'testpass', 'Test User');
```

2. **访问测试客户端:**
打开浏览器访问: `http://localhost:5000/test-websocket-client.html`

3. **测试流程:**
   - 使用 testuser/testpass 登录
   - 连接WebSocket
   - 创建房间
   - 测试房间功能

### 功能测试清单

- [x] 用户登录认证
- [x] JWT token生成和验证
- [x] WebSocket连接认证
- [x] 房间创建功能
- [x] 房间加入功能
- [x] 房间列表获取
- [x] 实时玩家列表更新
- [x] 玩家离开处理
- [x] 房主转移机制
- [x] 数据库持久化

## 部署注意事项

1. **环境变量配置:**
   - `DATABASE_URL`: PostgreSQL连接字符串
   - `JWT_SECRET`: JWT签名密钥（生产环境必须设置）

2. **端口配置:**
   - 服务器运行在端口 5000
   - Socket.IO使用 `/ws` 路径，避免与Vite HMR冲突

3. **CORS配置:**
   - 当前配置允许所有域名连接，生产环境应限制来源

## 扩展功能建议

1. **房间密码保护**
2. **房间观察者模式**
3. **私聊功能**
4. **游戏状态同步**
5. **断线重连机制**
6. **房间历史记录**
7. **玩家等级系统**

---

## 更新日志

**2025-08-20**: 初始版本完成
- 实现基础WebSocket房间管理功能
- 完成JWT认证系统
- 创建测试客户端界面
- 数据库持久化支持