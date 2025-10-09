export interface CardData {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades' | 'joker'
  rank: string | number
  id?: string
  groupId?: string  // 特殊牌型分组ID
}

export interface Player {
  id: string
  name: string
  cardCount: number
  position: 'me' | 'top' | 'left' | 'right'
  isCurrentPlayer: boolean
  isHost: boolean
  avatar?: string
}

export interface GameState {
  players: Player[]
  myHand: CardData[]
  tableCards: CardData[]
  currentPlayerId: string
  timeLeft: number
  totalTime: number
  gameStatus: 'waiting' | 'playing' | 'finished'
  lastPlay?: {
    playerId: string
    cards: CardData[]
    playType: string
  }
}

export interface PlayedCards {
  playerId: string
  cards: CardData[]
  playType: string
  timestamp: number
}