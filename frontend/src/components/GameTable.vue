<template>
  <div class="game-container">
    <div ref="gameTableRef" class="game-table">
    
    <!-- 左上角回到大厅和退出房间按钮 -->
    <div class="corner-buttons">
      <button 
        v-if="shouldShowBackButton"
        class="corner-btn back-to-lobby-btn"
        @click="handleBackToLobby"
        data-testid="button-back-to-lobby"
        title="暂时离开房间"
      >
        <el-icon><ArrowLeft /></el-icon>
        <span>回到大厅</span>
      </button>
      
      <!-- 退出房间按钮始终显示 -->
      <button 
        class="corner-btn exit-room-btn"
        @click="handleExitRoom"
        data-testid="button-exit-room"
        title="永久退出房间"
      >
        <el-icon><Close /></el-icon>
        <span>退出房间</span>
      </button>
    </div>
    
    <!-- 顶部玩家 -->
    <div class="top-area">
      <PlayerAvatar
        v-if="topPlayer"
        :player-name="topPlayer.name"
        :card-count="topPlayer.cardCount"
        :is-current-player="topPlayer.isCurrentPlayer"
        :player-id="topPlayer.id"
        :can-kick="!topPlayer.isHost && topPlayer.id !== currentUserId"
        :is-current-user-host="isCurrentUserHost"
        :game-status="gameStore.gameStatus"
        position="top"
        @kick="handleKickPlayer"
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
          :player-id="leftPlayer.id"
          :can-kick="!leftPlayer.isHost && leftPlayer.id !== currentUserId"
          :is-current-user-host="isCurrentUserHost"
          :game-status="gameStore.gameStatus"
          position="left"
          @kick="handleKickPlayer"
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
            :can-manual-sort="canManualSort"
            :can-restore="canRestore"
            :show-restore="showRestore"
            :is-my-turn="isMyTurn"
            @play="handlePlay"
            @pass="handlePass"
            @hint="handleHint"
            @auto-sort="handleAutoSort"
            @manual-sort="handleManualSort"
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
          :player-id="rightPlayer.id"
          :can-kick="!rightPlayer.isHost && rightPlayer.id !== currentUserId"
          :is-current-user-host="isCurrentUserHost"
          :game-status="gameStore.gameStatus"
          position="right"
          @kick="handleKickPlayer"
        />
      </div>
    </div>

    <!-- 底部区域 - 我的区域 -->
    <div class="bottom-area">
      <div class="my-area">
        <!-- 控制按钮区域已移到左上角 -->
        
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

    <!-- 游戏状态提示 - 仅保留游戏结束状态 -->
    <div v-if="gameStore.gameStatus === 'finished'" class="game-status-overlay">
      <div class="status-message">
        <div class="finished-status">
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
import { Loading, SuccessFilled, ArrowLeft, Close } from '@element-plus/icons-vue'
import PlayerAvatar from './PlayerAvatar.vue'
import PlayerHand from './PlayerHand.vue'
import Card from './Card.vue'
import ActionPanel from './ActionPanel.vue'
import GameTimer from './GameTimer.vue'
import { useGameStore } from '@/stores/gameStore'
import socketService from '@/services/socketService'
import type { CardData } from '@/types/game'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { detectCardPattern, isSpecialPattern, compareCardGroups } from '@/../../shared/cards'

// 使用状态管理
const gameStore = useGameStore()
const router = useRouter()
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

// 手动理牌功能相关计算属性
const canManualSort = computed(() => {
  // 必须有选中的牌
  if (selectedCards.value.length === 0) return false
  // 选中的牌必须是特殊牌型
  return isSpecialPattern(selectedCards.value)
})

// 踢人功能相关计算属性
const currentUserId = computed(() => gameStore.myPlayerId)
const isCurrentUserHost = computed(() => {
  const myPlayer = gameStore.players.find(p => p.id === currentUserId.value)
  return myPlayer?.isHost || false
})

// 回到大厅按钮显示逻辑
const shouldShowBackButton = computed(() => {
  // 等待玩家阶段：人数不足4人时显示
  if (gameStore.gameStatus === 'waiting') {
    return gameStore.players.length < 4
  }
  
  // 游戏进行中：总是显示，让玩家可以暂离
  if (gameStore.gameStatus === 'playing') {
    return true
  }
  
  // 其他状态（如游戏结束）不显示
  return false
})

// 踢人处理方法
const handleKickPlayer = (playerId: string) => {
  console.log('准备踢出玩家:', playerId)
  socketService.kickPlayer(parseInt(playerId))
}

// 回到大厅功能
const handleBackToLobby = () => {
  console.log('回到大厅')
  
  // 暂离房间（保留位置）
  socketService.temporaryLeaveRoom()
  
  // 导航回大厅
  router.push('/')
}

// 退出房间
const handleExitRoom = () => {
  console.log('退出房间')
  
  // 显示确认对话框
  ElMessageBox.confirm(
    '确定要退出房间吗？退出后将失去房间位置，如果您是房主，房间可能会转移给其他玩家或关闭。',
    '确认退出',
    {
      confirmButtonText: '确定退出',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
  .then(() => {
    // 永久退出房间
    socketService.leaveRoom()
    
    // 导航回大厅
    router.push('/')
    ElMessage.success('已退出房间')
  })
  .catch(() => {
    // 用户取消
    console.log('用户取消退出房间')
  })
}

// 手牌数据现在从WebSocket服务器获取

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

const handleManualSort = () => {
  console.log('手动理牌')
  
  // 检查是否有选中的牌
  if (selectedCards.value.length === 0) {
    ElMessage.warning('请先选择要理牌的牌')
    return
  }
  
  // 验证选中的牌是否为特殊牌型
  const pattern = detectCardPattern(selectedCards.value)
  if (!isSpecialPattern(selectedCards.value)) {
    ElMessage.warning('您所选择的牌无法组成特定样式')
    return
  }
  
  // 保存原始牌型（仅在第一次整理时）
  if (!hasSorted.value) {
    originalHand.value = [...gameStore.myHand]
  }
  
  // 获取当前手牌（权威来源）
  const currentHand = [...gameStore.myHand]
  
  // 统计选中牌的数量
  const selectedCount = new Map<string, number>()
  selectedCards.value.forEach(card => {
    const key = `${card.suit}-${card.rank}`
    selectedCount.set(key, (selectedCount.get(key) || 0) + 1)
  })
  
  // 生成唯一的分组ID
  const groupId = `manual-${Date.now()}`
  
  // 从当前手牌中提取选中的牌，其他牌保留原状
  const selectedGroup: CardData[] = []
  const otherCards: CardData[] = []
  const toExtract = new Map(selectedCount)
  
  currentHand.forEach(card => {
    const key = `${card.suit}-${card.rank}`
    const needed = toExtract.get(key) || 0
    if (needed > 0) {
      // 提取选中的牌并添加新的分组ID
      selectedGroup.push({ ...card, groupId })
      toExtract.set(key, needed - 1)
    } else {
      // 保留其他牌（包括已分组的和未分组的）
      otherCards.push(card)
    }
  })
  
  // 验证是否成功提取了所有选中的牌
  if (selectedGroup.length !== selectedCards.value.length) {
    ElMessage.error('选中的牌在当前手牌中不存在，无法理牌')
    return
  }
  
  // 将其他牌按是否有groupId分类，以保持已分组牌在前
  const groupedOthers = otherCards.filter(card => card.groupId)
  const ungroupedOthers = otherCards.filter(card => !card.groupId)
  
  // 重新组合手牌：已有分组 + 新分组 + 未分组的牌
  const newHand = [...groupedOthers, ...selectedGroup, ...ungroupedOthers]
  
  // 验证手牌数量没有变化
  if (newHand.length !== currentHand.length) {
    console.error('手动理牌错误：手牌数量不匹配', {
      original: currentHand.length,
      new: newHand.length
    })
    ElMessage.error('手动理牌失败，请重试')
    return
  }
  
  // 更新手牌
  gameStore.updateMyHand(newHand)
  hasSorted.value = true
  
  // 清空选择
  playerHandRef.value?.clearSelection()
  selectedCards.value = []
  
  ElMessage.success(`已将${pattern}移至手牌前方`)
}

const handleAutoSort = () => {
  console.log('智能整理')
  
  // 保存原始牌型（仅在第一次整理时）
  if (!hasSorted.value) {
    originalHand.value = [...gameStore.myHand]
  }
  
  // 第一步：数据预处理 - 清除所有旧的groupId
  const cards = gameStore.myHand.map(card => {
    const { groupId: _, ...cardWithoutGroup } = card
    return cardWithoutGroup as CardData
  })
  const usedCards = new Set<number>() // 记录已使用的牌的索引
  const sortedHand: CardData[] = []
  let groupCounter = 0 // 分组计数器
  
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
      const groupId = `auto-joker-${Date.now()}`
      jokerBomb.forEach(card => {
        const index = cards.findIndex((c, i) => !usedCards.has(i) && c.suit === card.suit && c.rank === card.rank)
        if (index !== -1) usedCards.add(index)
      })
      sortedHand.push(...jokerBomb.map(card => ({ ...card, groupId })))
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
            const groupId = `auto-sf-${groupCounter++}`
            currentSequence.forEach(c => {
              const index = cards.findIndex((card, i) => !usedCards.has(i) && card.suit === c.suit && card.rank === c.rank)
              if (index !== -1) usedCards.add(index)
            })
            sortedHand.push(...currentSequence.map(card => ({ ...card, groupId })))
            console.log(`找到同花顺: ${currentSequence.length}张`)
          }
          currentSequence = [card]
          lastValue = value
        }
      })
      
      // 检查最后一个序列
      if (currentSequence.length >= 5) {
        const groupId = `auto-sf-${groupCounter++}`
        currentSequence.forEach(c => {
          const index = cards.findIndex((card, i) => !usedCards.has(i) && card.suit === c.suit && card.rank === c.rank)
          if (index !== -1) usedCards.add(index)
        })
        sortedHand.push(...currentSequence.map(card => ({ ...card, groupId })))
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
        const groupId = `auto-bomb-${groupCounter++}`
        bombCards.forEach(card => {
          const index = cards.findIndex((c, i) => !usedCards.has(i) && getCardValue(c) === value)
          if (index !== -1) usedCards.add(index)
        })
        sortedHand.push(...bombCards.map(card => ({ ...card, groupId })))
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
        // 处理当前序列 - 钢板只能是2副相邻的三条
        if (currentSequence.length === 2) {
          const groupId = `auto-steel-${groupCounter++}`
          currentSequence.forEach(t => {
            t.cards.forEach(card => {
              const index = cards.findIndex((c, i) => !usedCards.has(i) && getCardValue(c) === t.value)
              if (index !== -1) usedCards.add(index)
            })
            sortedHand.push(...t.cards.map(card => ({ ...card, groupId })))
          })
          console.log(`找到钢板: 2组连续三张`)
        }
        currentSequence = [triplet]
        lastValue = triplet.value
      }
    })
    
    // 处理最后一个序列 - 钢板只能是2副相邻的三条
    if (currentSequence.length === 2) {
      const groupId = `auto-steel-${groupCounter++}`
      currentSequence.forEach(t => {
        t.cards.forEach(card => {
          const index = cards.findIndex((c, i) => !usedCards.has(i) && getCardValue(c) === t.value)
          if (index !== -1) usedCards.add(index)
        })
        sortedHand.push(...t.cards.map(card => ({ ...card, groupId })))
      })
      console.log(`找到钢板: 2组连续三张`)
    }
  }
  
  // 辅助函数：逐个组成权重最大的5张顺子
  const findBestStraight = (availableCards: CardData[]): CardData[] | null => {
    if (availableCards.length < 5) return null
    
    const groups = groupByValue(availableCards)
    const values = Array.from(groups.keys()).sort((a, b) => b - a) // 从大到小排序
    
    // 寻找最高权重的5张连续牌
    for (let startIdx = 0; startIdx <= values.length - 5; startIdx++) {
      const candidateValues = values.slice(startIdx, startIdx + 5)
      
      // 检查是否连续
      let isConsecutive = true
      for (let i = 1; i < candidateValues.length; i++) {
        if (candidateValues[i-1] - candidateValues[i] !== 1) {
          isConsecutive = false
          break
        }
      }
      
      if (isConsecutive) {
        // 找到连续的5张，选择对应的牌
        const straight: CardData[] = []
        candidateValues.forEach(value => {
          const cardsOfValue = groups.get(value) || []
          if (cardsOfValue.length > 0) {
            straight.push(cardsOfValue[0]) // 取第一张（跨花色）
          }
        })
        return straight.length === 5 ? straight : null
      }
    }
    
    return null
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
          currentSequence = groups.get(value)!.length > 0 ? [groups.get(value)![0]] : []
          lastValue = value
        }
      }
    })
    
    // 逐个寻找权重最大的5张顺子
    let straightCount = 0
    while (true) {
      const availableCards = getAvailableCards()
      const bestStraight = findBestStraight(availableCards)
      
      if (!bestStraight) break // 没有更多顺子可组成
      
      // 标记使用的牌
      const groupId = `auto-straight-${groupCounter++}`
      bestStraight.forEach(card => {
        const index = cards.findIndex((c, i) => !usedCards.has(i) && getCardValue(c) === getCardValue(card))
        if (index !== -1) usedCards.add(index)
      })
      sortedHand.push(...bestStraight.map(card => ({ ...card, groupId })))
      straightCount++
    }
    
    if (straightCount > 0) {
      console.log(`找到顺子: ${straightCount}个5张顺子（逐个组成最大权重顺子）`)
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
          const groupId = `auto-pairs-${groupCounter++}`
          currentSequence.forEach(p => {
            p.cards.forEach(card => {
              const index = cards.findIndex((c, i) => !usedCards.has(i) && getCardValue(c) === p.value)
              if (index !== -1) usedCards.add(index)
            })
            sortedHand.push(...p.cards.map(card => ({ ...card, groupId })))
          })
          console.log(`找到连对: ${currentSequence.length}连对`)
        }
        currentSequence = [pair]
        lastValue = pair.value
      }
    })
    
    // 处理最后一个序列
    if (currentSequence.length >= 3) {
      const groupId = `auto-pairs-${groupCounter++}`
      currentSequence.forEach(p => {
        p.cards.forEach(card => {
          const index = cards.findIndex((c, i) => !usedCards.has(i) && getCardValue(c) === p.value)
          if (index !== -1) usedCards.add(index)
        })
        sortedHand.push(...p.cards.map(card => ({ ...card, groupId })))
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
        // 三张（跨花色）- 添加分组ID实现竖状排列
        const groupId = `auto-triple-${groupCounter++}`
        const triplet = valueCards.slice(0, 3)
        triplet.forEach(card => {
          const index = cards.findIndex((c, i) => !usedCards.has(i) && getCardValue(c) === value)
          if (index !== -1) usedCards.add(index)
        })
        sortedHand.push(...triplet.map(card => ({ ...card, groupId })))
      } else if (valueCards.length >= 2) {
        // 对子（跨花色）- 添加分组ID实现竖状排列
        const groupId = `auto-pair-${groupCounter++}`
        const pair = valueCards.slice(0, 2)
        pair.forEach(card => {
          const index = cards.findIndex((c, i) => !usedCards.has(i) && getCardValue(c) === value)
          if (index !== -1) usedCards.add(index)
        })
        sortedHand.push(...pair.map(card => ({ ...card, groupId })))
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


// 初始化真实游戏数据
const initRealGameData = () => {
  // 从localStorage获取用户信息
  const userInfo = localStorage.getItem('user_info')
  if (userInfo) {
    try {
      const user = JSON.parse(userInfo)
      gameStore.setMyPlayerId(String(user.id))
    } catch (error) {
      console.error('解析用户信息失败:', error)
    }
  }
  
  // 不再使用模拟数据，等待WebSocket传来真实数据
  gameStore.updateGameStatus('waiting')
}

onMounted(() => {
  // 初始化真实游戏数据
  initRealGameData()
  
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
    console.warn('缺少认证token，无法连接游戏服务器')
  }
})

// 清理函数
const cleanup = () => {
  // 清理resize监听器
  window.removeEventListener('resize', calculateScale)
}

onUnmounted(() => {
  // 组件销毁时清理资源
  cleanup()
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

/* 控制按钮样式 */
.control-buttons {
  display: flex;
  justify-content: flex-start;
  padding: 10px 0;
  margin-bottom: 10px;
}

/* 左上角按钮容器 */
.corner-buttons {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 通用按钮样式 */
.corner-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 104px;
  height: 52px;
  border: none;
  border-radius: 13px;
  color: white;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
}

/* 回到大厅按钮 */
.back-to-lobby-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.back-to-lobby-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
  background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
}

.back-to-lobby-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
}

/* 退出房间按钮 */
.exit-room-btn {
  background: linear-gradient(135deg, #f56565 0%, #c53030 100%);
  box-shadow: 0 4px 12px rgba(245, 101, 101, 0.4);
}

.exit-room-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(245, 101, 101, 0.6);
  background: linear-gradient(135deg, #e53e3e 0%, #9b2c2c 100%);
}

.exit-room-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(245, 101, 101, 0.4);
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