const express = require('express');

const app = express();
const PORT = 3000;

// 根路由 - 返回JSON响应
app.get('/', (req, res) => {
  res.json({ "message": "Backend server is live!" });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`访问 http://localhost:${PORT} 查看服务状态`);
});
