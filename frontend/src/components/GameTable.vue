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
            :is-active="gameStore.isTimerActive"
            :is-connected="socketService.isConnected()"
          />
        </div>

        <!-- 操作面板 -->
        <div class="center-action-area">
          <ActionPanel
            :can-play="canPlay"
            :can-pass="canPass"
            :can-auto-sort="true"
            :can-restore="canRestore"
            :show-restore="showRestore"
            :is-my-turn="isMyTurn"
            @play="handlePlay"
            @pass="handlePass"
            @hint="handleHint"
            @auto-sort="handleAutoSort"
            @restore="handleRestore"
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

// 原始牌型状态管理
const originalHand = ref<CardData[]>([])
const hasSorted = ref(false)

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

// 恢复功能相关计算属性
const canRestore = computed(() => hasSorted.value && originalHand.value.length > 0)
const showRestore = computed(() => hasSorted.value)

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

const handleAutoSort = () => {
  console.log('智能整理')
  
  // 保存原始牌型（仅在第一次整理时）
  if (!hasSorted.value) {
    originalHand.value = [...gameStore.myHand]
  }
  
  // 第一步：数据预处理
  const cards = [...gameStore.myHand]
  const usedCards = new Set<number>() // 记录已使用的牌的索引
  const sortedHand: CardData[] = []
  
  // 定义牌值映射
  const getCardValue = (card: CardData): number => {
    if (card.suit === 'joker') {
      return card.rank === 'small' ? 16 : 17 // 小王16, 大王17
    }
    if (card.rank === 1 || card.rank === 14) return 14 // A = 14
    return typeof card.rank === 'number' ? card.rank : parseInt(card.rank)
  }
  
  // 按数量分组：得到按点数分类的牌组映射
  const getAvailableCards = () => {
    return cards.filter((_, index) => !usedCards.has(index))
  }
  
  const groupByValue = (availableCards: CardData[]) => {
    const groups = new Map<number, CardData[]>()
    availableCards.forEach(card => {
      const value = getCardValue(card)
      if (!groups.has(value)) {
        groups.set(value, [])
      }
      groups.get(value)!.push(card)
    })
    return groups
  }
  
  // 优先级 1: 提取天王炸 (Joker Bomb)
  const extractJokerBomb = () => {
    const availableCards = getAvailableCards()
    const bigJokers = availableCards.filter(card => card.suit === 'joker' && card.rank !== 'small')
    const smallJokers = availableCards.filter(card => card.suit === 'joker' && card.rank === 'small')
    
    if (bigJokers.length >= 2 && smallJokers.length >= 2) {
      // 找到天王炸
      const jokerBomb = [...bigJokers.slice(0, 2), ...smallJokers.slice(0, 2)]
      jokerBomb.forEach(card => {
        const index = cards.findIndex((c, i) => !usedCards.has(i) && c.suit === card.suit && c.rank === card.rank)
        if (index !== -1) usedCards.add(index)
      })
      sortedHand.push(...jokerBomb)
      console.log('找到天王炸!')
    }
  }
  
  // 优先级 2: 提取同花顺 (Straight Flushes)
  const extractStraightFlushes = () => {
    const availableCards = getAvailableCards()
    const suitGroups = new Map<string, CardData[]>()
    
    availableCards.forEach(card => {
      if (card.suit !== 'joker') {
        if (!suitGroups.has(card.suit)) {
          suitGroups.set(card.suit, [])
        }
        suitGroups.get(card.suit)!.push(card)
      }
    })
    
    suitGroups.forEach(suitCards => {
      suitCards.sort((a, b) => getCardValue(b) - getCardValue(a))
      
      // 寻找连续序列
      let currentSequence: CardData[] = []
      let lastValue = -1
      
      suitCards.forEach(card => {
        const value = getCardValue(card)
        if (lastValue === -1 || lastValue - value === 1) {
          currentSequence.push(card)
          lastValue = value
        } else {
          // 检查当前序列是否>=5张
          if (currentSequence.length >= 5) {
            currentSequence.forEach(c => {
              const index = cards.findIndex((card, i) => !usedCards.has(i) && card.suit === c.suit && card.rank === c.rank)
              if (index !== -1) usedCards.add(index)
            })
            sortedHand.push(...currentSequence)
            console.log(`找到同花顺: ${currentSequence.length}张`)
          }
          currentSequence = [card]
          lastValue = value
        }
      })
      
      // 检查最后一个序列
      if (currentSequence.length >= 5) {
        currentSequence.forEach(c => {
          const index = cards.findIndex((card, i) => !usedCards.has(i) && card.suit === c.suit && card.rank === c.rank)
          if (index !== -1) usedCards.add(index)
        })
        sortedHand.push(...currentSequence)
        console.log(`找到同花顺: ${currentSequence.length}张`)
      }
    })
  }
  
  // 优先级 3: 提取炸弹 (Regular Bombs)
  const extractBombs = () => {
    const availableCards = getAvailableCards()
    const groups = groupByValue(availableCards)
    
    Array.from(groups.entries())
      .filter(([_, cards]) => cards.length >= 4)
      .sort(([a], [b]) => b - a) // 按牌值从大到小
      .forEach(([value, bombCards]) => {
        bombCards.forEach(card => {
          const index = cards.findIndex((c, i) => !usedCards.has(i) && getCardValue(c) === value)
          if (index !== -1) usedCards.add(index)
        })
        sortedHand.push(...bombCards)
        console.log(`找到炸弹: ${bombCards.length}张${value}`)
      })
  }
  
  // 优先级 4: 提取钢板 (Consecutive Triplets) - 不限花色
  const extractConsecutiveTriplets = () => {
    const availableCards = getAvailableCards()
    const groups = groupByValue(availableCards)
    
    const triplets = Array.from(groups.entries())
      .filter(([_, cards]) => cards.length >= 3)
      .map(([value, cards]) => ({ value, cards: cards.slice(0, 3) }))
      .sort((a, b) => b.value - a.value)
    
    // 寻找连续的三张（跨花色）
    let currentSequence: { value: number, cards: CardData[] }[] = []
    let lastValue = -1
    
    triplets.forEach(triplet => {
      if (lastValue === -1 || lastValue - triplet.value === 1) {
        currentSequence.push(triplet)
        lastValue = triplet.value
      } else {
        // 处理当前序列
        if (currentSequence.length >= 2) {
          currentSequence.forEach(t => {
            t.cards.forEach(card => {
              const index = cards.findIndex((c, i) => !usedCards.has(i) && getCardValue(c) === t.value)
              if (index !== -1) usedCards.add(index)
            })
            sortedHand.push(...t.cards)
          })
          console.log(`找到钢板: ${currentSequence.length}组连续三张`)
        }
        currentSequence = [triplet]
        lastValue = triplet.value
      }
    })
    
    // 处理最后一个序列
    if (currentSequence.length >= 2) {
      currentSequence.forEach(t => {
        t.cards.forEach(card => {
          const index = cards.findIndex((c, i) => !usedCards.has(i) && getCardValue(c) === t.value)
          if (index !== -1) usedCards.add(index)
        })
        sortedHand.push(...t.cards)
      })
      console.log(`找到钢板: ${currentSequence.length}组连续三张`)
    }
  }
  
  // 优先级 5: 提取顺子 (Straights) - 不限花色
  const extractStraights = () => {
    const availableCards = getAvailableCards()
    const groups = groupByValue(availableCards)
    
    const sortedValues = Array.from(groups.keys()).sort((a, b) => b - a)
    let currentSequence: CardData[] = []
    let lastValue = -1
    
    sortedValues.forEach(value => {
      if (groups.get(value)!.length > 0) {
        if (lastValue === -1 || lastValue - value === 1) {
          currentSequence.push(groups.get(value)![0]) // 取一张（跨花色）
          lastValue = value
        } else {
          // 检查当前序列是否>=5张
          if (currentSequence.length >= 5) {
            currentSequence.forEach(card => {
              const index = cards.findIndex((c, i) => !usedCards.has(i) && getCardValue(c) === getCardValue(card))
              if (index !== -1) usedCards.add(index)
            })
            sortedHand.push(...currentSequence)
            console.log(`找到顺子: ${currentSequence.length}张`)
          }
          currentSequence = groups.get(value)!.length > 0 ? [groups.get(value)![0]] : []
          lastValue = value
        }
      }
    })
    
    // 检查最后一个序列
    if (currentSequence.length >= 5) {
      currentSequence.forEach(card => {
        const index = cards.findIndex((c, i) => !usedCards.has(i) && getCardValue(c) === getCardValue(card))
        if (index !== -1) usedCards.add(index)
      })
      sortedHand.push(...currentSequence)
      console.log(`找到顺子: ${currentSequence.length}张`)
    }
  }
  
  // 优先级 6: 提取三连对 (Consecutive Pairs) - 不限花色
  const extractConsecutivePairs = () => {
    const availableCards = getAvailableCards()
    const groups = groupByValue(availableCards)
    
    const pairs = Array.from(groups.entries())
      .filter(([_, cards]) => cards.length >= 2)
      .map(([value, cards]) => ({ value, cards: cards.slice(0, 2) }))
      .sort((a, b) => b.value - a.value)
    
    // 寻找连续的对子（跨花色）
    let currentSequence: { value: number, cards: CardData[] }[] = []
    let lastValue = -1
    
    pairs.forEach(pair => {
      if (lastValue === -1 || lastValue - pair.value === 1) {
        currentSequence.push(pair)
        lastValue = pair.value
      } else {
        // 处理当前序列
        if (currentSequence.length >= 3) { // 至少3连对
          currentSequence.forEach(p => {
            p.cards.forEach(card => {
              const index = cards.findIndex((c, i) => !usedCards.has(i) && getCardValue(c) === p.value)
              if (index !== -1) usedCards.add(index)
            })
            sortedHand.push(...p.cards)
          })
          console.log(`找到连对: ${currentSequence.length}连对`)
        }
        currentSequence = [pair]
        lastValue = pair.value
      }
    })
    
    // 处理最后一个序列
    if (currentSequence.length >= 3) {
      currentSequence.forEach(p => {
        p.cards.forEach(card => {
          const index = cards.findIndex((c, i) => !usedCards.has(i) && getCardValue(c) === p.value)
          if (index !== -1) usedCards.add(index)
        })
        sortedHand.push(...p.cards)
      })
      console.log(`找到连对: ${currentSequence.length}连对`)
    }
  }
  
  // 收尾 (优先级 7, 8, 9): 处理剩余的三张、对子、单张 - 不限花色
  const extractRemaining = () => {
    const availableCards = getAvailableCards()
    const groups = groupByValue(availableCards)
    
    // 按牌值从大到小处理（跨花色）
    const sortedValues = Array.from(groups.keys()).sort((a, b) => b - a)
    
    sortedValues.forEach(value => {
      const valueCards = groups.get(value)!
      if (valueCards.length >= 3) {
        // 三张（跨花色）
        const triplet = valueCards.slice(0, 3)
        triplet.forEach(card => {
          const index = cards.findIndex((c, i) => !usedCards.has(i) && getCardValue(c) === value)
          if (index !== -1) usedCards.add(index)
        })
        sortedHand.push(...triplet)
      } else if (valueCards.length >= 2) {
        // 对子（跨花色）
        const pair = valueCards.slice(0, 2)
        pair.forEach(card => {
          const index = cards.findIndex((c, i) => !usedCards.has(i) && getCardValue(c) === value)
          if (index !== -1) usedCards.add(index)
        })
        sortedHand.push(...pair)
      } else if (valueCards.length === 1) {
        // 单张
        const single = valueCards[0]
        const index = cards.findIndex((c, i) => !usedCards.has(i) && getCardValue(c) === value)
        if (index !== -1) usedCards.add(index)
        sortedHand.push(single)
      }
    })
  }
  
  // 第二步：按绝对优先级执行终极贪心算法
  extractJokerBomb()       // 优先级 1: 天王炸
  extractStraightFlushes() // 优先级 2: 同花顺
  extractBombs()           // 优先级 3: 炸弹
  extractConsecutiveTriplets() // 优先级 4: 钢板
  extractStraights()       // 优先级 5: 顺子
  extractConsecutivePairs() // 优先级 6: 三连对
  extractRemaining()       // 优先级 7,8,9: 三张、对子、单张
  
  // 第三步：更新状态
  gameStore.updateMyHand(sortedHand)
  hasSorted.value = true
  console.log('智能整理完成！手牌已按专业级牌型优先级重新排列')
}

const handleRestore = () => {
  console.log('恢复牌型')
  if (originalHand.value.length > 0) {
    gameStore.updateMyHand([...originalHand.value])
    hasSorted.value = false
    console.log('手牌已恢复到原始顺序')
  }
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