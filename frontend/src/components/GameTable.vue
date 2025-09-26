<template>
  <div class="game-container">
    <div ref="gameTableRef" class="game-table">
    <!-- 顶部玩家 -->
    <div class="top-area">
      <PlayerAvatar
        v-if="topPlayer"
        :player-name="topPlayer.name"
        :card-count="topPlayer.cardCount"
        :is-current-player="topPlayer.isCurrentPlayer"
        position="top"
      />
    </div>

    <!-- 中间区域 -->
    <div class="middle-area">
      <!-- 左侧玩家 -->
      <div class="left-area">
        <PlayerAvatar
          v-if="leftPlayer"
          :player-name="leftPlayer.name"
          :card-count="leftPlayer.cardCount"
          :is-current-player="leftPlayer.isCurrentPlayer"
          position="left"
        />
      </div>

      <!-- 牌桌中心区域 -->
      <div class="table-center">
        <div class="played-cards-area">
          <div v-if="lastPlayedCards.length > 0" class="last-played">
            <div class="player-info">{{ lastPlayerName }} 出牌:</div>
            <div class="played-cards">
              <Card
                v-for="(card, index) in lastPlayedCards"
                :key="`played-${index}`"
                :suit="card.suit"
                :rank="card.rank"
                :style="{ marginRight: index < lastPlayedCards.length - 1 ? '8px' : '0' }"
                class="played-card"
              />
            </div>
            <div class="play-type">{{ lastPlayType }}</div>
          </div>
          <div v-else class="no-cards">
            <div class="waiting-text">等待出牌...</div>
          </div>
        </div>

        <!-- 游戏计时器 -->
        <div class="timer-area">
          <GameTimer
            :time-left="gameStore.timeLeft"
            :total-time="gameStore.totalTime"
            :is-active="gameStore.gameStatus === 'playing'"
          />
        </div>

        <!-- 操作面板 -->
        <div class="center-action-area">
          <ActionPanel
            :can-play="canPlay"
            :can-pass="canPass"
            :is-my-turn="isMyTurn"
            @play="handlePlay"
            @pass="handlePass"
            @hint="handleHint"
            @auto-play="handleAutoPlay"
          />
        </div>
      </div>

      <!-- 右侧玩家 -->
      <div class="right-area">
        <PlayerAvatar
          v-if="rightPlayer"
          :player-name="rightPlayer.name"
          :card-count="rightPlayer.cardCount"
          :is-current-player="rightPlayer.isCurrentPlayer"
          position="right"
        />
      </div>
    </div>

    <!-- 底部区域 - 我的区域 -->
    <div class="bottom-area">
      <div class="my-area">
        <!-- 我的手牌 -->
        <div class="hand-area">
          <PlayerHand
            ref="playerHandRef"
            :cards="gameStore.myHand"
            @selection-change="handleSelectionChange"
          />
        </div>
      </div>
    </div>

    <!-- 游戏状态提示 -->
    <div v-if="gameStore.gameStatus !== 'playing'" class="game-status-overlay">
      <div class="status-message">
        <div v-if="gameStore.gameStatus === 'waiting'" class="waiting-status">
          <el-icon class="status-icon"><Loading /></el-icon>
          <div>等待游戏开始...</div>
        </div>
        <div v-else-if="gameStore.gameStatus === 'finished'" class="finished-status">
          <el-icon class="status-icon"><SuccessFilled /></el-icon>
          <div>游戏结束</div>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Loading, SuccessFilled } from '@element-plus/icons-vue'
import PlayerAvatar from './PlayerAvatar.vue'
import PlayerHand from './PlayerHand.vue'
import Card from './Card.vue'
import ActionPanel from './ActionPanel.vue'
import GameTimer from './GameTimer.vue'
import { useGameStore } from '@/stores/gameStore'
import socketService from '@/services/socketService'
import type { CardData } from '@/types/game'

// 使用状态管理
const gameStore = useGameStore()
const playerHandRef = ref()
const selectedCards = ref<CardData[]>([])

// 计算属性 - 从store获取数据
const topPlayer = computed(() => gameStore.topPlayer)
const leftPlayer = computed(() => gameStore.leftPlayer)
const rightPlayer = computed(() => gameStore.rightPlayer)
const isMyTurn = computed(() => gameStore.isMyTurn)
const canPlay = computed(() => gameStore.canPlay(selectedCards.value))
const canPass = computed(() => gameStore.canPass())

const lastPlayedCards = computed(() => gameStore.lastPlay?.cards || [])
const lastPlayerName = computed(() => {
  if (!gameStore.lastPlay) return ''
  const player = gameStore.players.find(p => p.id === gameStore.lastPlay?.playerId)
  return player?.name || ''
})
const lastPlayType = computed(() => gameStore.lastPlay?.playType || '')

// 生成模拟手牌数据（用于演示）
function generateMockHand(): CardData[] {
  const suits: CardData['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades']
  const cards: CardData[] = []
  
  // 生成27张牌
  for (let i = 0; i < 27; i++) {
    const suit = suits[Math.floor(Math.random() * suits.length)]
    const rank = Math.floor(Math.random() * 13) + 2 // 2-14
    cards.push({ suit, rank })
  }
  
  // 添加一张小王
  if (Math.random() > 0.7) {
    cards[cards.length - 1] = { suit: 'joker', rank: 'small' }
  }
  
  return cards.sort((a, b) => {
    // 简单排序：先按花色，再按点数 - 方块、梅花、红桃、黑桃
    if (a.suit !== b.suit) {
      const suitOrder = { diamonds: 1, clubs: 2, hearts: 3, spades: 4, joker: 5 }
      return suitOrder[a.suit] - suitOrder[b.suit]
    }
    return Number(a.rank) - Number(b.rank)
  })
}

// 全局缩放逻辑
const gameTableRef = ref<HTMLElement>()
const scale = ref(1)

const calculateScale = () => {
  if (!gameTableRef.value) return
  
  const gameTable = gameTableRef.value
  const container = gameTable.parentElement
  if (!container) return
  
  // 游戏桌面的设计尺寸（基于1920x1080设计）
  const designWidth = 1920
  const designHeight = 1080
  
  // 获取实际可用空间
  const availableWidth = container.clientWidth
  const availableHeight = container.clientHeight
  
  // 计算缩放比例
  const scaleX = availableWidth / designWidth
  const scaleY = availableHeight / designHeight
  
  // 使用较小的缩放比例确保内容完全显示
  const newScale = Math.min(scaleX, scaleY, 1) // 最大不超过1（不放大）
  
  scale.value = newScale
  
  // 计算缩放后的实际尺寸
  const scaledWidth = designWidth * newScale
  const scaledHeight = designHeight * newScale
  
  // 计算居中偏移量
  const offsetX = (availableWidth - scaledWidth) / 2
  const offsetY = (availableHeight - scaledHeight) / 2
  
  // 应用缩放和偏移
  gameTable.style.transform = `scale(${newScale}) translate(${offsetX / newScale}px, ${offsetY / newScale}px)`
  gameTable.style.transformOrigin = 'top left'
}

// 事件处理
const handleSelectionChange = (indices: number[], cards: CardData[]) => {
  selectedCards.value = cards
}

const handlePlay = () => {
  if (selectedCards.value.length === 0) return
  
  // 通过WebSocket发送出牌信息
  socketService.playCards(selectedCards.value)
  
  // 清空选择
  playerHandRef.value?.clearSelection()
  selectedCards.value = []
}

const handlePass = () => {
  // 通过WebSocket发送不出
  socketService.passTurn()
}

const handleHint = () => {
  console.log('提示')
  // 这里可以实现智能提示逻辑
}

const handleAutoPlay = () => {
  console.log('智能托管')
  // 这里可以实现托管逻辑
}


// 初始化模拟数据（用于演示）
const initMockData = () => {
  // 初始化模拟玩家数据
  const mockPlayers = [
    { id: 'me', name: '我', cardCount: 27, position: 'me' as const, isCurrentPlayer: true },
    { id: 'top', name: '玩家A', cardCount: 27, position: 'top' as const, isCurrentPlayer: false },
    { id: 'left', name: '玩家B', cardCount: 27, position: 'left' as const, isCurrentPlayer: false },
    { id: 'right', name: '玩家C', cardCount: 27, position: 'right' as const, isCurrentPlayer: false }
  ]
  
  gameStore.updatePlayers(mockPlayers)
  gameStore.setMyPlayerId('me')
  gameStore.updateMyHand(generateMockHand())
  gameStore.updateCurrentPlayer('me')
  gameStore.updateGameStatus('playing')
  gameStore.setTotalTime(30)
  gameStore.updateTimer(30)
}

onMounted(() => {
  // 初始化模拟数据用于演示
  initMockData()
  
  // 启动模拟倒计时器
  startMockTimer()
  
  // 初始化缩放 - 需要延迟到DOM渲染完成
  setTimeout(() => {
    calculateScale()
  }, 100)
  
  // 监听窗口大小变化
  window.addEventListener('resize', calculateScale)
  
  // 如果有认证token，尝试连接WebSocket
  const token = localStorage.getItem('auth_token')
  if (token) {
    // WebSocket已在service中自动连接
    console.log('尝试连接WebSocket...')
  } else {
    console.log('使用模拟数据演示界面')
  }
})

// 模拟计时器功能（用于演示）
let timerInterval: number | null = null
const startMockTimer = () => {
  if (timerInterval) clearInterval(timerInterval)
  
  timerInterval = setInterval(() => {
    if (gameStore.gameStatus === 'playing' && gameStore.timeLeft > 0) {
      gameStore.updateTimer(gameStore.timeLeft - 1)
      
      // 时间到了自动切换到下个玩家
      if (gameStore.timeLeft === 0) {
        simulateNextPlayer()
      }
    }
  }, 1000)
}

const simulateNextPlayer = () => {
  const players = ['me', 'top', 'left', 'right']
  const currentIndex = players.indexOf(gameStore.currentPlayerId)
  const nextIndex = (currentIndex + 1) % players.length
  const nextPlayerId = players[nextIndex]
  
  gameStore.updateCurrentPlayer(nextPlayerId)
  gameStore.updateTimer(30) // 重置计时器
}

onUnmounted(() => {
  // 组件销毁时清理定时器
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  
  // 清理resize监听器
  window.removeEventListener('resize', calculateScale)
})
</script>

<style scoped>
.game-container {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background: radial-gradient(ellipse at center, #065f46 0%, #064e3b 70%, #022c22 100%);
}

.game-table {
  width: 1920px;
  height: 1080px;
  background: radial-gradient(ellipse at center, #065f46 0%, #064e3b 70%, #022c22 100%);
  display: flex;
  flex-direction: column;
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  transition: transform 0.3s ease;
}

.top-area {
  height: 120px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  transform: translateY(20px);
}

.middle-area {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 0 20px;
}

.left-area,
.right-area {
  width: 200px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.table-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 40px;
  min-height: 300px;
}

.played-cards-area {
  background: transparent;
  border-radius: 20px;
  border: none;
  padding: 40px;
  min-width: 600px;
  min-height: 300px;
  width: 80%;
  max-width: 800px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transform: translateY(50px);
}

.last-played {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.player-info {
  color: white;
  font-size: 16px;
  font-weight: bold;
}

.played-cards {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.played-card {
  transform: scale(0.9);
}

.play-type {
  color: #fbbf24;
  font-size: 14px;
  font-weight: bold;
}

.no-cards {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.waiting-text {
  color: rgba(255, 255, 255, 0.6);
  font-size: 36px;
  font-style: italic;
  transform: translateY(40px);
}

.timer-area {
  display: flex;
  justify-content: center;
  transform: translateY(100px);
}

.center-action-area {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  transform: translateY(100px);
}

.bottom-area {
  height: 250px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 20px;
}

.my-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  width: 100%;
  max-width: 1200px;
}

.hand-area {
  display: flex;
  justify-content: center;
  width: 100%;
  max-width: 900px;
}

.action-area {
  display: flex;
  justify-content: center;
  flex-shrink: 0;
}

.game-status-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(5px);
}

.status-message {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 40px;
  text-align: center;
  color: white;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.status-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.waiting-status .status-icon {
  animation: spin 2s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.finished-status .status-icon {
  color: #4ade80;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .left-area,
  .right-area {
    width: 150px;
  }
  
  .bottom-area {
    height: 220px;
  }
  
  .my-area {
    gap: 15px;
  }
  
  .played-cards-area {
    min-width: 300px;
    padding: 20px;
  }
}

@media (max-width: 768px) {
  .middle-area {
    padding: 0 10px;
  }
  
  .table-center {
    gap: 20px;
  }
  
  .played-cards-area {
    min-width: 250px;
    min-height: 150px;
    padding: 15px;
  }
  
  .left-area,
  .right-area {
    width: 100px;
  }
  
  .bottom-area {
    height: 200px;
    padding: 15px;
  }
  
  .my-area {
    gap: 12px;
  }
}
</style>