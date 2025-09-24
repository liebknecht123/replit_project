<template>
  <div class="game-timer" :class="{ 'warning': isWarning, 'danger': isDanger }">
    <div class="timer-circle">
      <svg class="timer-svg" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="45"
          class="timer-background"
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          class="timer-progress"
          :style="{ strokeDashoffset: strokeDashoffset }"
        />
      </svg>
      <div class="timer-content">
        <div class="time-display">{{ formattedTime }}</div>
        <div class="timer-label">剩余时间</div>
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
}

const props = withDefaults(defineProps<Props>(), {
  isActive: false
})

const circumference = 2 * Math.PI * 45 // 半径45的圆周长

const strokeDashoffset = computed(() => {
  const progress = props.timeLeft / props.totalTime
  return circumference - (progress * circumference)
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
  // 这里可以添加音效
  console.log('Warning: Time running out!')
}

const playDangerSound = () => {
  // 这里可以添加紧急音效
  console.log('Danger: Critical time!')
}

watch(() => props.timeLeft, (newTime, oldTime) => {
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
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.timer-circle {
  position: relative;
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.timer-svg {
  position: absolute;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.timer-background {
  fill: none;
  stroke: rgba(255, 255, 255, 0.1);
  stroke-width: 8;
}

.timer-progress {
  fill: none;
  stroke: #4ade80;
  stroke-width: 8;
  stroke-linecap: round;
  stroke-dasharray: 283; /* 2 * π * 45 */
  transition: stroke-dashoffset 1s linear, stroke 0.3s ease;
}

.warning .timer-progress {
  stroke: #fbbf24;
}

.danger .timer-progress {
  stroke: #ef4444;
  animation: pulse-danger 0.5s infinite alternate;
}

.timer-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: white;
}

.time-display {
  font-size: 24px;
  font-weight: bold;
  font-family: 'Courier New', monospace;
  line-height: 1;
}

.timer-label {
  font-size: 12px;
  opacity: 0.8;
  margin-top: 4px;
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
    stroke-width: 8;
  }
  to {
    stroke-width: 12;
  }
}

@keyframes pulse-text {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(1.05);
  }
}

@media (max-width: 768px) {
  .timer-circle {
    width: 80px;
    height: 80px;
  }
  
  .time-display {
    font-size: 18px;
  }
  
  .timer-label {
    font-size: 10px;
  }
}
</style>