# 项目启动配置修复文档

## 问题描述
之前点击'Run'按钮启动的是前端开发服务器(Vite/React)，而不是我们需要的后端Express服务器。

## 解决方案
已经创建了专门的启动脚本来确保只运行backend服务器。

## 当前运行状态
✅ **Backend Express服务器正在运行**
- 端口: 3000
- 数据库: 已连接到PostgreSQL
- 状态: 正常运行并返回JSON响应

## 启动方式

### 方法1: 使用启动脚本 (推荐)
```bash
./start-backend.sh
```

### 方法2: 手动启动
```bash
# 停止前端服务器
pkill -f "tsx server/index.ts"

# 启动backend服务器
cd backend
node server.js
```

## 验证服务器运行状态

### 检查服务状态
```bash
curl http://localhost:3000/
# 预期输出: {"message":"Backend server is live!","database":"Connected to postgresql"}
```

### 检查数据库连接
```bash
curl http://localhost:3000/db-status
# 预期输出: {"status":"connected","type":"postgresql","timestamp":"2025-08-20T10:30:09.497Z"}
```

### 检查运行进程
```bash
ps aux | grep "node server.js"
```

## 端口配置
- **Backend Express服务器**: 端口 3000
- **前端开发服务器** (如果需要): 端口 5000

## 重要提醒
- 现在backend服务器已经正常运行并连接到数据库
- API端点返回正确的JSON响应，不再是HTML
- 如果需要同时运行前端和后端，请分别在不同的终端启动
- 工作流配置的问题已通过专用启动脚本解决