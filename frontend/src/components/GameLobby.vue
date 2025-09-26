<template>
  <div class="game-lobby">
    <!-- 页面背景 -->
    <div class="lobby-background"></div>
    
    <!-- 主要内容区域 -->
    <div class="lobby-content">
      <!-- 顶部用户信息栏 -->
      <div class="user-header">
        <div class="user-info">
          <div class="user-avatar">
            <el-icon class="avatar-icon"><User /></el-icon>
          </div>
          <div class="user-details">
            <h2 class="username">{{ userInfo.nickname || userInfo.username }}</h2>
            <p class="user-status">在线</p>
          </div>
        </div>
        <div class="header-actions">
          <el-button type="info" @click="handleLogout" data-testid="button-logout">
            <el-icon><SwitchButton /></el-icon>
            退出登录
          </el-button>
        </div>
      </div>

      <!-- 游戏大厅主体 -->
      <div class="lobby-main">
        <!-- 左侧：房间列表 -->
        <div class="rooms-section">
          <div class="section-header">
            <h3><el-icon><House /></el-icon>游戏房间</h3>
            <el-button type="primary" @click="refreshRooms" data-testid="button-refresh-rooms">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
          
          <div class="rooms-list" v-loading="roomsLoading">
            <div 
              v-for="room in rooms" 
              :key="room.id"
              class="room-card"
              :class="{ 'room-full': room.players >= room.maxPlayers }"
              @click="joinRoom(room.id)"
              :data-testid="`room-card-${room.id}`"
            >
              <div class="room-info">
                <h4 class="room-name">{{ room.name }}</h4>
                <p class="room-details">房主: {{ room.host }}</p>
                <div class="room-status">
                  <span class="player-count">{{ room.players }}/{{ room.maxPlayers }}</span>
                  <span class="room-type">{{ room.gameType }}</span>
                </div>
              </div>
              <div class="room-actions">
                <el-button 
                  v-if="room.players < room.maxPlayers" 
                  type="success" 
                  size="small"
                  :data-testid="`button-join-${room.id}`"
                >
                  加入
                </el-button>
                <el-tag v-else type="info">已满</el-tag>
              </div>
            </div>
            
            <!-- 空状态 -->
            <div v-if="rooms.length === 0 && !roomsLoading" class="empty-rooms">
              <el-icon class="empty-icon"><House /></el-icon>
              <p>暂无房间，创建一个开始游戏吧！</p>
            </div>
          </div>
        </div>

        <!-- 右侧：创建房间 -->
        <div class="create-section">
          <div class="section-header">
            <h3><el-icon><Plus /></el-icon>创建房间</h3>
          </div>
          
          <div class="create-form">
            <el-form :model="createForm" label-width="100px">
              <el-form-item label="房间名称">
                <el-input 
                  v-model="createForm.name" 
                  placeholder="请输入房间名称"
                  maxlength="20"
                  data-testid="input-room-name"
                />
              </el-form-item>
              
              <el-form-item label="游戏类型">
                <el-select v-model="createForm.gameType" placeholder="选择游戏类型" data-testid="select-game-type">
                  <el-option label="经典掼蛋" value="classic" />
                  <el-option label="快速掼蛋" value="quick" />
                  <el-option label="排位赛" value="ranked" />
                </el-select>
              </el-form-item>
              
              <el-form-item label="玩家数量">
                <el-select v-model="createForm.maxPlayers" placeholder="选择玩家数量" data-testid="select-max-players">
                  <el-option label="2人" :value="2" />
                  <el-option label="4人" :value="4" />
                </el-select>
              </el-form-item>
              
              <el-form-item label="房间密码">
                <el-input 
                  v-model="createForm.password" 
                  placeholder="留空为公开房间"
                  type="password"
                  show-password
                  data-testid="input-room-password"
                />
              </el-form-item>
            </el-form>
            
            <div class="create-actions">
              <el-button 
                type="primary" 
                size="large" 
                @click="createRoom"
                :loading="createLoading"
                :disabled="!createForm.name || !createForm.gameType || !createForm.maxPlayers"
                data-testid="button-create-room"
              >
                <el-icon><Plus /></el-icon>
                创建房间
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { 
  User, 
  SwitchButton, 
  House, 
  Refresh, 
  Plus 
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

interface RoomInfo {
  id: string
  name: string
  host: string
  players: number
  maxPlayers: number
  gameType: string
  hasPassword: boolean
}

interface UserInfo {
  username: string
  nickname?: string
}

const router = useRouter()

// 用户信息
const userInfo = ref<UserInfo>({
  username: '玩家',
  nickname: '掼蛋高手'
})

// 房间列表
const rooms = ref<RoomInfo[]>([])
const roomsLoading = ref(false)

// 创建房间表单
const createForm = reactive({
  name: '',
  gameType: 'classic',
  maxPlayers: 4,
  password: ''
})
const createLoading = ref(false)

// 获取用户信息
const getUserInfo = () => {
  // 这里应该从localStorage或API获取用户信息
  const storedUser = localStorage.getItem('user_info')
  if (storedUser) {
    try {
      const parsedUser = JSON.parse(storedUser)
      userInfo.value = parsedUser
    } catch (error) {
      console.error('解析用户信息失败:', error)
    }
  }
}

// 获取房间列表
const fetchRooms = async () => {
  roomsLoading.value = true
  try {
    // 模拟API调用 - 稍后可以替换为真实API
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 模拟房间数据
    rooms.value = [
      {
        id: '1',
        name: '经典对战房',
        host: '玩家A',
        players: 3,
        maxPlayers: 4,
        gameType: '经典掼蛋',
        hasPassword: false
      },
      {
        id: '2', 
        name: '快速模式',
        host: '玩家B',
        players: 4,
        maxPlayers: 4,
        gameType: '快速掼蛋',
        hasPassword: true
      },
      {
        id: '3',
        name: '新手练习',
        host: '玩家C',
        players: 1,
        maxPlayers: 2,
        gameType: '经典掼蛋',
        hasPassword: false
      }
    ]
  } catch (error) {
    console.error('获取房间列表失败:', error)
    ElMessage.error('获取房间列表失败')
  } finally {
    roomsLoading.value = false
  }
}

// 刷新房间列表
const refreshRooms = () => {
  fetchRooms()
}

// 加入房间
const joinRoom = (roomId: string) => {
  const room = rooms.value.find(r => r.id === roomId)
  if (!room) return
  
  if (room.players >= room.maxPlayers) {
    ElMessage.warning('房间已满')
    return
  }
  
  // 如果有密码，需要输入密码验证
  if (room.hasPassword) {
    ElMessage.info('该房间需要密码，功能待实现')
    return
  }
  
  // 跳转到游戏页面
  router.push(`/game?roomId=${roomId}`)
}

// 创建房间
const createRoom = async () => {
  if (!createForm.name.trim()) {
    ElMessage.warning('请输入房间名称')
    return
  }
  
  createLoading.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // 创建成功后直接进入房间
    const newRoomId = Date.now().toString()
    ElMessage.success('房间创建成功')
    
    // 跳转到游戏页面
    router.push(`/game?roomId=${newRoomId}&isHost=true`)
  } catch (error) {
    console.error('创建房间失败:', error)
    ElMessage.error('创建房间失败')
  } finally {
    createLoading.value = false
  }
}

// 退出登录
const handleLogout = () => {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('user_info')
  ElMessage.success('已退出登录')
  router.push('/')
}

onMounted(() => {
  getUserInfo()
  fetchRooms()
})
</script>

<style scoped>
.game-lobby {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
}

.lobby-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at center, #065f46 0%, #064e3b 70%, #022c22 100%);
  z-index: -1;
}

.lobby-content {
  width: 100%;
  height: 100%;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.user-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 20px 30px;
  margin-bottom: 20px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.user-avatar {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-icon {
  font-size: 28px;
  color: white;
}

.user-details h2 {
  color: white;
  margin: 0 0 5px 0;
  font-size: 24px;
}

.user-details p {
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  font-size: 14px;
}

.lobby-main {
  flex: 1;
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  overflow: hidden;
}

.rooms-section,
.create-section {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 20px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  flex-direction: column;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h3 {
  color: white;
  font-size: 20px;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.rooms-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.room-card {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.room-card:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
}

.room-card.room-full {
  opacity: 0.6;
  cursor: not-allowed;
}

.room-card.room-full:hover {
  transform: none;
  box-shadow: none;
}

.room-info h4 {
  color: white;
  margin: 0 0 8px 0;
  font-size: 18px;
}

.room-info p {
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 8px 0;
  font-size: 14px;
}

.room-status {
  display: flex;
  gap: 12px;
  align-items: center;
}

.player-count {
  background: rgba(34, 197, 94, 0.3);
  color: #4ade80;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: bold;
}

.room-type {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
}

.empty-rooms {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.create-form {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.create-actions {
  margin-top: auto;
  padding-top: 20px;
}

.create-actions .el-button {
  width: 100%;
  height: 50px;
  font-size: 16px;
  font-weight: bold;
}

/* Element Plus 样式覆盖 */
:deep(.el-form-item__label) {
  color: white !important;
  font-weight: bold;
}

:deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.1) !important;
  border: 1px solid rgba(255, 255, 255, 0.3) !important;
  border-radius: 8px;
}

:deep(.el-input__wrapper:hover) {
  border-color: rgba(255, 255, 255, 0.5) !important;
}

:deep(.el-input__wrapper.is-focus) {
  border-color: #4ade80 !important;
  box-shadow: 0 0 0 2px rgba(74, 222, 128, 0.2) !important;
}

:deep(.el-input__inner) {
  color: white !important;
}

:deep(.el-input__inner::placeholder) {
  color: rgba(255, 255, 255, 0.5) !important;
}

:deep(.el-select .el-input.is-focus .el-input__wrapper) {
  border-color: #4ade80 !important;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .lobby-main {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr auto;
  }
  
  .user-header {
    padding: 15px 20px;
  }
  
  .user-details h2 {
    font-size: 20px;
  }
}
</style>