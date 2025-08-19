# Backend Service

Node.js Express API服务，为Monorepo项目提供后端支持。

## 功能特性

- RESTful API端点
- MariaDB数据库集成
- 健康检查监控
- CORS跨域支持
- Helmet安全头设置
- Morgan请求日志记录
- 服务状态管理
- 项目统计数据

## 技术栈

- **框架**: Express.js
- **数据库**: MariaDB 10.11
- **ORM**: mysql2
- **安全**: helmet, cors
- **日志**: morgan
- **环境配置**: dotenv

## API端点

### 基础端点
- `GET /` - 返回后端运行状态
- `GET /health` - 健康检查，包含数据库连接状态
- `GET /api/info` - 服务信息

### 数据端点
- `GET /api/services` - 获取所有服务状态
- `GET /api/stats` - 获取项目统计信息
- `PUT /api/services/:name/status` - 更新服务状态

## 环境变量配置

复制 `.env.example` 到 `.env` 并配置以下变量：

```bash
# 服务器配置
PORT=3000
NODE_ENV=development

# MariaDB数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=monorepo_db
DB_USER=monorepo_user
DB_PASSWORD=monorepo_password
```

## 快速开始

### 方法一：使用Docker Compose（推荐）

1. 在根目录运行：
```bash
# 启动MariaDB和Backend服务
docker-compose up mariadb backend

# 后台运行
docker-compose up -d mariadb backend
```

### 方法二：本地开发

1. 确保MariaDB正在运行
2. 安装依赖：
```bash
npm install
```

3. 配置环境变量：
```bash
cp .env.example .env
# 编辑 .env 文件中的数据库配置
```

4. 启动服务：
```bash
# 开发模式（热重载）
npm run dev

# 生产模式
npm start
```

## 数据库结构

系统会自动创建以下表：

- **users** - 用户账户信息
- **services** - 服务状态和配置
- **project_stats** - 项目统计数据

初始化脚本位于 `../database/init.sql`

## 测试API端点

```bash
# 检查服务状态
curl http://localhost:3000/

# 健康检查
curl http://localhost:3000/health

# 获取服务列表
curl http://localhost:3000/api/services

# 获取项目统计
curl http://localhost:3000/api/stats

# 更新服务状态
curl -X PUT http://localhost:3000/api/services/backend/status \
  -H "Content-Type: application/json" \
  -d '{"status":"running","health":"healthy"}'
```

## Docker配置

Backend服务在Docker环境中的配置：
- **端口**: 3000
- **网络**: monorepo-network
- **依赖**: mariadb服务必须健康
- **卷挂载**: 开发模式下代码热重载

## 故障排除

### 数据库连接失败
1. 确认MariaDB服务正在运行
2. 检查环境变量配置
3. 验证网络连接（Docker网络）

### API请求失败
1. 检查服务健康状态：`GET /health`
2. 查看日志输出
3. 确认CORS配置正确
