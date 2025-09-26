<template>
  <div class="player-avatar" :class="`position-${position}`" @click="handleClick">
    <div class="avatar-circle">
      <div class="avatar-image">{{ playerName.charAt(0) }}</div>
    </div>
    <div class="player-info">
      <div class="player-name">{{ playerName }}</div>
      <div class="card-count">剩余: {{ cardCount }} 张</div>
    </div>
    <div v-if="isCurrentPlayer" class="current-player-indicator">
      <div class="pulse"></div>
    </div>
    
    <!-- 踢人按钮 - 仅房主且游戏未开始时显示 -->
    <div v-if="showKickButton" class="kick-button" @click.stop="handleKick">
      <el-button type="danger" size="small" data-testid="button-kick-player">
        踢出玩家
      </el-button>
    </div>
    
    <!-- 可点击提示（仅房主且游戏未开始时显示） -->
    <div v-if="isCurrentUserHost && gameStatus === 'waiting' && canKick" class="clickable-hint">
      点击管理
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  playerName: string
  cardCount: number
  position: 'top' | 'left' | 'right'
  isCurrentPlayer?: boolean
  avatar?: string
  playerId?: string
  canKick?: boolean  // 是否可以被踢出
  isCurrentUserHost?: boolean  // 当前用户是否为房主
  gameStatus?: string  // 游戏状态
}

const props = withDefaults(defineProps<Props>(), {
  isCurrentPlayer: false,
  canKick: false,
  isCurrentUserHost: false,
  gameStatus: 'waiting'
})

const emit = defineEmits<{
  kick: [playerId: string]
}>()

const showKickButton = ref(false)

// 点击玩家头像
const handleClick = () => {
  // 只有房主在游戏未开始时可以踢人
  if (props.isCurrentUserHost && props.gameStatus === 'waiting' && props.canKick && props.playerId) {
    showKickButton.value = !showKickButton.value
  }
}

// 踢出玩家
const handleKick = () => {
  if (props.playerId) {
    emit('kick', props.playerId)
    showKickButton.value = false
  }
}
</script>

<style scoped>
.player-avatar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  position: relative;
}

.position-top {
  flex-direction: column;
  text-align: center;
}

.position-left,
.position-right {
  flex-direction: row;
}

.avatar-circle {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.avatar-image {
  color: white;
  font-size: 24px;
  font-weight: bold;
}

.player-info {
  color: white;
}

.player-name {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 4px;
}

.card-count {
  font-size: 21px;
  opacity: 0.8;
}

.current-player-indicator {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 20px;
  height: 20px;
}

.pulse {
  width: 100%;
  height: 100%;
  background: #00ff88;
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(0.8);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.7;
  }
  100% {
    transform: scale(0.8);
    opacity: 1;
  }
}

.position-top .player-info {
  text-align: center;
}

.position-left {
  flex-direction: column;
  align-items: flex-start;
}

.position-right {
  flex-direction: column;
  align-items: flex-end;
}

/* 踢人功能样式 */
.player-avatar {
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.player-avatar:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
}

.kick-button {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 8px;
  z-index: 10;
  animation: slideDown 0.3s ease;
}

.clickable-hint {
  position: absolute;
  bottom: -30px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  opacity: 0.8;
  white-space: nowrap;
  z-index: 5;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
</style>