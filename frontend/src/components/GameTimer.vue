<template>
  <div class="game-timer" :class="{ 'warning': isWarning, 'danger': isDanger }">
    <div class="timer-bar-container">
      <div class="timer-info">
        <span class="time-display">{{ formattedTime }}</span>
        <span class="timer-label">剩余时间</span>
      </div>
      <div class="timer-bar-background">
        <div 
          class="timer-bar-progress" 
          :style="{ width: progressPercent + '%' }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, ref } from 'vue'

interface Props {
  timeLeft: number // 剩余时间（秒）
  totalTime: number // 总时间（秒）
  isActive?: boolean
  isConnected?: boolean // WebSocket连接状态
}

const props = withDefaults(defineProps<Props>(), {
  isActive: false,
  isConnected: true
})

const progressPercent = computed(() => {
  return (props.timeLeft / props.totalTime) * 100
})

const formattedTime = computed(() => {
  const minutes = Math.floor(props.timeLeft / 60)
  const seconds = props.timeLeft % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

const isWarning = computed(() => props.timeLeft <= props.totalTime * 0.3 && props.timeLeft > props.totalTime * 0.1)
const isDanger = computed(() => props.timeLeft <= props.totalTime * 0.1)

// 倒计时音效提示
const playWarningSound = () => {
  // 这里可以添加音效 - 暂时移除console.log避免噪音
  // console.log('Warning: Time running out!')
}

const playDangerSound = () => {
  // 这里可以添加紧急音效 - 暂时移除console.log避免噪音
  // console.log('Danger: Critical time!')
}

watch(() => props.timeLeft, (newTime, oldTime) => {
  // 只有在连接正常且游戏活跃时才播放警告音
  if (!props.isConnected || !props.isActive || newTime <= 0) return
  
  if (newTime <= props.totalTime * 0.3 && oldTime > props.totalTime * 0.3) {
    playWarningSound()
  }
  if (newTime <= props.totalTime * 0.1 && oldTime > props.totalTime * 0.1) {
    playDangerSound()
  }
})
</script>

<style scoped>
.game-timer {
  display: flex;
  justify-content: center;
  transition: all 0.3s ease;
  z-index: 10;
}

.timer-bar-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.timer-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
}

.time-display {
  font-size: 35px;
  font-weight: bold;
  font-family: 'Courier New', monospace;
}

.timer-label {
  font-size: 18px;
  opacity: 0.8;
}

.timer-bar-background {
  width: 200px;
  height: 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  overflow: hidden;
}

.timer-bar-progress {
  height: 100%;
  background: #4ade80;
  transition: width 1s linear, background-color 0.3s ease;
  border-radius: 3px;
}

.warning .timer-bar-progress {
  background: #fbbf24;
}

.danger .timer-bar-progress {
  background: #ef4444;
  animation: pulse-danger 0.5s infinite alternate;
}

.warning .time-display {
  color: #fbbf24;
}

.danger .time-display {
  color: #ef4444;
  animation: pulse-text 0.5s infinite alternate;
}

@keyframes pulse-danger {
  from {
    box-shadow: 0 0 5px rgba(239, 68, 68, 0.5);
  }
  to {
    box-shadow: 0 0 10px rgba(239, 68, 68, 0.8);
  }
}

@keyframes pulse-text {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(1.1);
  }
}
</style>