# 数据库集成配置文档

## 概述
项目已成功集成数据库功能，支持PostgreSQL和MariaDB两种数据库系统。

## 数据库配置

### 1. PostgreSQL (推荐，已配置)
- 使用Replit提供的PostgreSQL数据库
- 自动连接，无需额外配置
- 连接信息通过环境变量 `DATABASE_URL` 提供

### 2. MariaDB (可选)
- 通过Docker容器运行
- 配置信息：
  - 数据库名: `guandan_db`
  - 用户名: `user`
  - 密码: `password`
  - Root密码: `rootpassword`
  - 端口: `3306`

## 启动方式

### 使用PostgreSQL (默认)
```bash
cd backend
node server.js
```

### 使用MariaDB
```bash
# 启动MariaDB容器
docker-compose up -d database

# 启动backend服务
cd backend
USE_MARIADB=true node server.js
```

## API端点

### 1. 服务状态
- **GET /** - 返回服务状态和数据库连接信息
```json
{
  "message": "Backend server is live!",
  "database": "Connected to postgresql"
}
```

### 2. 数据库状态
- **GET /db-status** - 返回详细的数据库连接状态
```json
{
  "status": "connected",
  "type": "postgresql",
  "timestamp": "2025-01-20T09:55:00.000Z"
}
```

## 数据表结构

### users表
| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | SERIAL/AUTO_INCREMENT | PRIMARY KEY | 用户ID |
| username | VARCHAR(50) | UNIQUE, NOT NULL | 用户名 |
| password_hash | VARCHAR(255) | NOT NULL | 密码哈希 |
| nickname | VARCHAR(100) | - | 昵称 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

### SQL创建语句

#### PostgreSQL版本
```sql
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nickname VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### MySQL/MariaDB版本
```sql
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nickname VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 文件结构
```
backend/
├── server.js              # 主服务器文件
├── src/
│   ├── db.js              # 数据库连接模块
│   └── database.js        # 数据表管理模块
├── package.json           # 依赖配置
└── Dockerfile             # Docker构建文件

database/
└── create_tables.sql      # 建表SQL脚本

docker-compose.yml         # Docker Compose配置
scripts/
└── start-services.sh      # 服务启动脚本
```

## 状态验证
项目当前状态：
- ✅ PostgreSQL数据库已连接
- ✅ users表已创建
- ✅ Backend服务运行在端口3000
- ✅ API端点正常响应
- ✅ 数据库状态检查功能正常