import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CardData, Player, GameState, PlayedCards } from '@/types/game'

export const useGameStore = defineStore('game', () => {
  // 状态
  const players = ref<Player[]>([])
  const myHand = ref<CardData[]>([])
  const tableCards = ref<CardData[]>([])
  const currentPlayerId = ref<string>('')
  const timeLeft = ref<number>(30)
  const totalTime = ref<number>(30)
  const gameStatus = ref<'waiting' | 'playing' | 'finished'>('waiting')
  const roomId = ref<string>('')
  const myPlayerId = ref<string>('')
  const lastPlay = ref<PlayedCards | undefined>()
  const gameHistory = ref<PlayedCards[]>([])
  
  // 计算属性
  const myPlayer = computed(() => players.value.find(p => p.id === myPlayerId.value))
  const currentPlayer = computed(() => players.value.find(p => p.id === currentPlayerId.value))
  const isMyTurn = computed(() => currentPlayerId.value === myPlayerId.value)
  const topPlayer = computed(() => players.value.find(p => p.position === 'top'))
  const leftPlayer = computed(() => players.value.find(p => p.position === 'left'))
  const rightPlayer = computed(() => players.value.find(p => p.position === 'right'))
  
  // Actions
  const initializeGame = (initialData: Partial<GameState>) => {
    if (initialData.players) players.value = initialData.players
    if (initialData.myHand) myHand.value = initialData.myHand
    if (initialData.tableCards) tableCards.value = initialData.tableCards
    if (initialData.currentPlayerId) currentPlayerId.value = initialData.currentPlayerId
    if (initialData.timeLeft !== undefined) timeLeft.value = initialData.timeLeft
    if (initialData.totalTime !== undefined) totalTime.value = initialData.totalTime
    if (initialData.gameStatus) gameStatus.value = initialData.gameStatus
  }
  
  const setMyPlayerId = (id: string) => {
    myPlayerId.value = id
  }
  
  const setRoomId = (id: string) => {
    roomId.value = id
  }
  
  const updatePlayers = (newPlayers: Player[]) => {
    players.value = newPlayers
  }
  
  const updateMyHand = (cards: CardData[]) => {
    myHand.value = cards
  }
  
  const removeCardsFromHand = (cardIndices: number[]) => {
    myHand.value = myHand.value.filter((_, index) => !cardIndices.includes(index))
  }
  
  const updateCurrentPlayer = (playerId: string) => {
    // 更新当前玩家状态
    players.value.forEach(player => {
      player.isCurrentPlayer = player.id === playerId
    })
    currentPlayerId.value = playerId
  }
  
  const updateTimer = (time: number) => {
    timeLeft.value = time
  }

  const clearTimer = () => {
    timeLeft.value = 0
    totalTime.value = 30
  }

  // 检查游戏是否处于活跃的计时状态
  const isTimerActive = computed(() => {
    return gameStatus.value === 'playing' && 
           players.value.length === 4 && 
           timeLeft.value > 0
  })
  
  const setTotalTime = (time: number) => {
    totalTime.value = time
  }
  
  const updateGameStatus = (status: 'waiting' | 'playing' | 'finished') => {
    gameStatus.value = status
  }
  
  const updateLastPlay = (play: PlayedCards) => {
    lastPlay.value = play
    gameHistory.value.push(play)
  }
  
  const clearLastPlay = () => {
    lastPlay.value = undefined
  }
  
  const updatePlayerCardCount = (playerId: string, count: number) => {
    const player = players.value.find(p => p.id === playerId)
    if (player) {
      player.cardCount = count
    }
  }
  
  const addPlayer = (player: Player) => {
    const existingIndex = players.value.findIndex(p => p.id === player.id)
    if (existingIndex >= 0) {
      players.value[existingIndex] = player
    } else {
      players.value.push(player)
    }
  }
  
  const removePlayer = (playerId: string) => {
    players.value = players.value.filter(p => p.id !== playerId)
  }
  
  const resetGame = () => {
    players.value = []
    myHand.value = []
    tableCards.value = []
    currentPlayerId.value = ''
    timeLeft.value = 30
    totalTime.value = 30
    gameStatus.value = 'waiting'
    lastPlay.value = undefined
    gameHistory.value = []
  }
  
  // 游戏逻辑辅助方法
  const canPlay = (selectedCards: CardData[]) => {
    if (!isMyTurn.value || selectedCards.length === 0) return false
    
    // 如果没有上家出牌，可以出任意牌
    if (!lastPlay.value) return true
    
    // 这里应该实现掼蛋规则检查
    // 暂时返回 true，后续可以添加具体规则
    return true
  }
  
  const canPass = () => {
    return isMyTurn.value && lastPlay.value !== undefined
  }
  
  const getPlayType = (cards: CardData[]): string => {
    if (cards.length === 0) return ''
    if (cards.length === 1) return '单牌'
    if (cards.length === 2) return '对子'
    if (cards.length === 3) return '三张'
    if (cards.length === 4) return '炸弹'
    if (cards.length === 5) return '顺子'
    return `${cards.length}张牌`
  }
  
  return {
    // 状态
    players,
    myHand,
    tableCards,
    currentPlayerId,
    timeLeft,
    totalTime,
    gameStatus,
    roomId,
    myPlayerId,
    lastPlay,
    gameHistory,
    
    // 计算属性
    myPlayer,
    currentPlayer,
    isMyTurn,
    topPlayer,
    leftPlayer,
    rightPlayer,
    
    // Actions
    initializeGame,
    setMyPlayerId,
    setRoomId,
    updatePlayers,
    updateMyHand,
    removeCardsFromHand,
    updateCurrentPlayer,
    updateTimer,
    clearTimer,
    setTotalTime,
    isTimerActive,
    updateGameStatus,
    updateLastPlay,
    clearLastPlay,
    updatePlayerCardCount,
    addPlayer,
    removePlayer,
    resetGame,
    
    // 游戏逻辑
    canPlay,
    canPass,
    getPlayType
  }
})