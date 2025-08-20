#!/bin/bash
# 启动服务脚本

echo "正在启动数据库服务..."

# 启动docker-compose（如果需要使用MariaDB）
if [ "$USE_MARIADB" = "true" ]; then
    echo "启动MariaDB容器..."
    docker-compose up -d database
    
    # 等待数据库启动
    echo "等待MariaDB启动..."
    sleep 10
    
    # 检查数据库是否可用
    until docker-compose exec database mysqladmin ping --silent; do
        echo "等待MariaDB可用..."
        sleep 3
    done
    echo "MariaDB已启动"
fi

echo "启动backend服务..."
cd backend
node server.js