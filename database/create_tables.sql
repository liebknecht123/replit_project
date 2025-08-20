-- 创建users表的SQL代码
-- 适用于MySQL/MariaDB

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nickname VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引以提高查询性能
CREATE INDEX idx_username ON users(username);
CREATE INDEX idx_created_at ON users(created_at);

-- 插入示例数据（可选）
-- INSERT INTO users (username, password_hash, nickname) VALUES 
-- ('testuser', 'hashed_password_here', '测试用户');

-- ====================================
-- PostgreSQL版本的建表语句
-- ====================================

-- PostgreSQL表结构
CREATE TABLE IF NOT EXISTS users_pg (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nickname VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PostgreSQL索引
CREATE INDEX IF NOT EXISTS idx_users_username ON users_pg(username);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users_pg(created_at);