import { io, Socket } from 'socket.io-client'
import { useGameStore } from '@/stores/gameStore'
import type { CardData, Player } from '@/types/game'

class SocketService {
  private socket: Socket | null = null
  private gameStore = useGameStore()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectInterval = 3000

  constructor() {
    // 延迟连接，等待组件初始化
    setTimeout(() => {
      this.connect()
    }, 1000)
  }

  connect() {
    const token = localStorage.getItem('auth_token')
    
    // 如果没有token，不要尝试连接WebSocket
    if (!token) {
      console.warn('缺少认证token，无法连接WebSocket')
      return
    }
    
    const serverUrl = window.location.origin || 'http://localhost:5000'
    
    this.socket = io(serverUrl, {
      auth: {
        token: token
      },
      transports: ['websocket'],
      forceNew: true,
      path: '/ws' // 使用正确的WebSocket路径
    })

    this.setupEventListeners()
  }

  private setupEventListeners() {
    if (!this.socket) return

    // 连接事件
    this.socket.on('connect', () => {
      console.log('✅ WebSocket连接成功')
      this.reconnectAttempts = 0
    })

    this.socket.on('disconnect', () => {
      console.log('❌ WebSocket连接断开')
      // 连接断开时清除游戏计时器状态
      this.gameStore.clearTimer()
      this.handleReconnect()
    })

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket连接错误:', error.message)
      // 连接错误时清除游戏计时器状态
      this.gameStore.clearTimer()
      this.handleReconnect()
    })

    // 房间事件
    this.socket.on('room_joined', (data) => {
      console.log('加入房间成功:', data)
      this.gameStore.setRoomId(data.roomId)
      // 确保设置当前用户ID
      if (data.currentUserId) {
        this.gameStore.setMyPlayerId(data.currentUserId.toString())
      }
      this.gameStore.updatePlayers(data.players)
      this.gameStore.updateGameStatus('waiting')
    })

    this.socket.on('player_joined', (data) => {
      console.log('新玩家加入:', data)
      this.gameStore.addPlayer(data.player)
    })

    this.socket.on('player_left', (data) => {
      console.log('玩家离开:', data)
      this.gameStore.removePlayer(data.playerId)
    })

    // 房间状态更新事件（玩家加入/离开/踢出等）
    this.socket.on('room_update', (data) => {
      console.log('房间状态更新:', data)
      if (data.players) {
        // 确保设置当前用户ID（如果还没有设置）
        if (data.currentUserId) {
          this.gameStore.setMyPlayerId(data.currentUserId.toString())
        }
        this.gameStore.updatePlayers(data.players)
      }
    })

    // 游戏事件
    this.socket.on('game_started', (data) => {
      console.log('游戏开始:', data)
      this.gameStore.updateGameStatus('playing')
      this.gameStore.updatePlayers(data.players)
      this.gameStore.updateCurrentPlayer(data.currentPlayer)
      this.gameStore.setTotalTime(data.timeLimit || 30)
    })

    this.socket.on('your_hand', (data) => {
      console.log('收到手牌:', data)
      this.gameStore.updateMyHand(data.cards)
    })

    this.socket.on('turn_update', (data) => {
      console.log('轮次更新:', data)
      this.gameStore.updateCurrentPlayer(data.currentPlayerId || data.currentPlayer)
      // 只有在游戏正在进行且房间满员时才更新倒计时
      if (this.gameStore.gameStatus === 'playing' && 
          this.gameStore.players.length === 4 && 
          data.timeLeft !== undefined) {
        this.gameStore.updateTimer(data.timeLeft)
      }
    })

    this.socket.on('timer_update', (data) => {
      // 只有在WebSocket连接正常、游戏正在进行且房间满员时才更新倒计时
      if (this.isConnected() && 
          this.gameStore.gameStatus === 'playing' && 
          this.gameStore.players.length === 4) {
        this.gameStore.updateTimer(data.remainingTime || data.timeLeft)
      }
    })

    this.socket.on('card_played', (data) => {
      console.log('玩家出牌:', data)
      this.gameStore.updateLastPlay({
        playerId: data.playerId,
        cards: data.cards,
        playType: data.playType,
        timestamp: Date.now()
      })
      this.gameStore.updatePlayerCardCount(data.playerId, data.remainingCards)
    })

    this.socket.on('turn_passed', (data) => {
      console.log('玩家不出:', data)
      // 可以在这里添加特殊处理
    })

    this.socket.on('game_finished', (data) => {
      console.log('游戏结束:', data)
      this.gameStore.updateGameStatus('finished')
    })

    // 踢人相关事件
    this.socket.on('kick_result', (data) => {
      console.log('踢人结果:', data)
      if (data.success) {
        console.log(`成功踢出玩家: ${data.kickedPlayerName}`)
      } else {
        console.error(`踢人失败: ${data.message}`)
      }
    })

    this.socket.on('kicked_from_room', (data) => {
      console.log('被踢出房间:', data)
      // 可以在这里添加被踢出的UI提示
      alert(`${data.message}`)
      // 返回到游戏大厅（使用路由而不是直接跳转）
      // 这里应该使用Vue Router来导航，避免破坏SPA状态
      // 暂时使用alert提示，让用户手动返回大厅
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    })

    this.socket.on('reconnect_success', (data) => {
      console.log('重连成功:', data)
      this.gameStore.initializeGame(data)
      if (data.yourCards) {
        this.gameStore.updateMyHand(data.yourCards)
      }
    })

    // 错误处理
    this.socket.on('error', (data) => {
      console.error('游戏错误:', data)
      this.showError(data.message || '发生未知错误')
    })

    this.socket.on('room_error', (data) => {
      console.error('房间错误:', data)
      this.showError(data.message || '房间操作失败')
    })
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`尝试重连... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      
      setTimeout(() => {
        this.connect()
      }, this.reconnectInterval)
    } else {
      console.error('重连失败，已达到最大尝试次数')
      this.showError('连接断开，请刷新页面重试')
    }
  }

  private showError(message: string) {
    // 这里可以集成Element Plus的消息提示
    console.error('游戏提示:', message)
    // ElMessage.error(message)
  }

  // 房间操作
  createRoom(roomName: string) {
    if (this.socket) {
      this.socket.emit('create_room', { name: roomName })
    }
  }

  joinRoom(roomId: string) {
    if (this.socket) {
      this.socket.emit('join_room', { roomId })
    }
  }

  leaveRoom() {
    if (this.socket) {
      this.socket.emit('leave_room')
    }
  }

  temporaryLeaveRoom() {
    if (this.socket) {
      this.socket.emit('temporary_leave_room')
    }
  }

  startGame() {
    if (this.socket) {
      this.socket.emit('start_game')
    }
  }

  // 游戏操作
  playCards(cards: CardData[]) {
    if (this.socket) {
      this.socket.emit('play_cards', { cards })
    }
  }

  passTurn() {
    if (this.socket) {
      this.socket.emit('pass_turn')
    }
  }

  // 踢出玩家
  kickPlayer(targetUserId: number) {
    if (this.socket) {
      this.socket.emit('kick_player', { targetUserId })
    }
  }

  // 辅助方法
  isConnected(): boolean {
    return this.socket?.connected || false
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  // 设置用户ID（从登录后获取）
  setUserId(userId: string) {
    this.gameStore.setMyPlayerId(userId)
  }
}

// 创建单例实例
export const socketService = new SocketService()
export default socketService