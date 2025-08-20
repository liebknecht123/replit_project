#!/bin/bash
# Backend服务器启动脚本

echo "正在停止所有运行中的服务..."
pkill -f "tsx server/index.ts" 2>/dev/null || true
pkill -f "node server.js" 2>/dev/null || true

echo "等待服务完全停止..."
sleep 2

echo "正在启动Backend Express服务器..."
cd backend

echo "检查依赖..."
if [ ! -d "node_modules" ]; then
    echo "正在安装依赖..."
    npm install
fi

echo "启动服务器..."
node server.js