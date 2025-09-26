<template>
  <div class="player-avatar" :class="`position-${position}`">
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
  </div>
</template>

<script setup lang="ts">
interface Props {
  playerName: string
  cardCount: number
  position: 'top' | 'left' | 'right'
  isCurrentPlayer?: boolean
  avatar?: string
}

withDefaults(defineProps<Props>(), {
  isCurrentPlayer: false
})
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
</style>