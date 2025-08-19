-- 初始化MariaDB数据库的SQL脚本
-- 这个脚本会在容器启动时自动执行

USE monorepo_db;

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 创建服务表
CREATE TABLE IF NOT EXISTS services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('running', 'stopped', 'error', 'development') DEFAULT 'stopped',
    port INT,
    health ENUM('healthy', 'unhealthy', 'unknown') DEFAULT 'unknown',
    version VARCHAR(100),
    last_build TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 创建项目统计表
CREATE TABLE IF NOT EXISTS project_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    build_status ENUM('passing', 'failing', 'unknown') DEFAULT 'unknown',
    tests_passed INT DEFAULT 0,
    tests_total INT DEFAULT 0,
    coverage DECIMAL(5,2) DEFAULT 0.00,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 插入初始服务数据
INSERT INTO services (name, description, status, port, health, version) VALUES
('backend', 'Node.js Express后端API服务', 'running', 3000, 'healthy', '1.0.0'),
('frontend', 'React前端Web应用', 'running', 3001, 'healthy', '1.0.0'),
('admin-frontend', '管理员仪表盘界面', 'stopped', 3002, 'unknown', '1.0.0'),
('godot-client', 'Godot游戏客户端', 'development', NULL, 'unknown', '4.1.2');

-- 插入初始项目统计数据
INSERT INTO project_stats (build_status, tests_passed, tests_total, coverage) VALUES
('passing', 42, 42, 85.50);

-- 创建测试用户
INSERT INTO users (username, email, password) VALUES
('admin', 'admin@monorepo.local', '$2a$10$example.hash.for.development.only'),
('developer', 'dev@monorepo.local', '$2a$10$example.hash.for.development.only');

-- 创建索引以提高查询性能
CREATE INDEX idx_services_status ON services(status);
CREATE INDEX idx_services_name ON services(name);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- 显示创建结果
SELECT 'MariaDB数据库初始化完成' as status;
SELECT COUNT(*) as service_count FROM services;
SELECT COUNT(*) as user_count FROM users;