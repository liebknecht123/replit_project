// 掼蛋游戏核心逻辑
export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades' | 'joker'; // 红桃、方块、梅花、黑桃、王
  rank: number; // 1-13 (A-K), 14=小王, 15=大王
  value: number; // 实际游戏中的大小值
  displayName: string; // 显示名称，如"红桃A"、"大王"
}

// 掼蛋牌型枚举
export type GuanDanCardType = 
  | 'four_kings'      // 四王（最大）
  | 'bomb_8'          // 8张炸弹
  | 'bomb_7'          // 7张炸弹  
  | 'bomb_6'          // 6张炸弹
  | 'straight_flush'  // 同花顺
  | 'bomb_5'          // 5张炸弹
  | 'bomb_4'          // 4张炸弹
  | 'triple_pair'     // 三连对
  | 'steel_plate'     // 钢板（连续三张）
  | 'straight'        // 顺子
  | 'triple_with_pair' // 三带两
  | 'triple'          // 三张
  | 'pair'            // 对子
  | 'single'          // 单牌
  | 'invalid';        // 无效牌型

export interface PlayedCards {
  cards: Card[];
  playType: GuanDanCardType;
  player: number; // 玩家ID
  canBeBeaten: boolean; // 是否可以被打败
  priority: number; // 牌型优先级，数字越大越大
}

// 游戏结果和排名
export interface GameResult {
  rankings: number[]; // 按排名顺序的玩家ID [头游, 次游, 三游, 末游]
  teams: { team1: number[], team2: number[] }; // 队伍划分
  levelChange: { team1: number, team2: number }; // 升级变化
  tributeInfo?: TributeInfo; // 进贡信息
}

// 进贡信息
export interface TributeInfo {
  type: 'single' | 'double' | 'none' | 'resist'; // 单下、双下、无进贡、抗贡
  tributeCards: { from: number, to: number, card: Card }[]; // 进贡的牌
  returnCards: { from: number, to: number, card: Card }[]; // 还贡的牌
  firstPlayer: number; // 下一局首出玩家
}

export interface GameState {
  roomId: string;
  players: number[]; // 4个玩家ID
  teams: { team1: number[], team2: number[] }; // 队伍配置（对家）
  hands: Map<number, Card[]>; // 每个玩家的手牌
  currentPlayer: number; // 当前出牌玩家
  playOrder: number[]; // 固定的玩家ID顺序
  currentPlayerIndex: number; // 指向playOrder数组的当前回合索引
  lastPlay: PlayedCards | null; // 上一次出牌
  tableCards: Card[]; // 桌面上的牌
  gamePhase: 'waiting' | 'dealing' | 'playing' | 'finished' | 'tribute';
  currentLevel: number; // 当前等级 (2-A，2=2, 3=3...10=10, J=11, Q=12, K=13, A=14)
  levelProgress: { team1: number, team2: number }; // 各队当前等级
  gameRound: number; // 第几局游戏
  finishedPlayers: number[]; // 已出完牌的玩家（按出完顺序）
  passedPlayers: Set<number>; // 当前回合已过牌的玩家
  consecutivePasses: number; // 连续过牌次数
  isFirstPlay: boolean; // 是否为首次出牌
}

// 生成两副完整扑克牌（掼蛋专用）
export function createDeck(currentLevel: number = 2): Card[] {
  const suits: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const deck: Card[] = [];
  
  // 两副普通牌 (A-K)
  for (let deckNum = 0; deckNum < 2; deckNum++) {
    for (const suit of suits) {
      for (let rank = 1; rank <= 13; rank++) {
        const card: Card = {
          suit,
          rank,
          value: calculateCardValue(rank, currentLevel, suit),
          displayName: getCardDisplayName(suit, rank)
        };
        deck.push(card);
      }
    }
    
    // 添加王牌：小王(14)和大王(15)
    deck.push({ 
      suit: 'joker', 
      rank: 14, 
      value: 98, // 小王
      displayName: '小王'
    });
    deck.push({ 
      suit: 'joker', 
      rank: 15, 
      value: 99, // 大王
      displayName: '大王'
    });
  }
  
  return deck;
}

// 计算牌的实际大小值（掼蛋规则）
export function calculateCardValue(rank: number, currentLevel: number, suit: Card['suit']): number {
  // 大王和小王固定值
  if (rank === 15) return 99; // 大王
  if (rank === 14) return 98; // 小王
  
  // 当前等级的红桃牌（逢人配）
  const levelRank = currentLevel === 14 ? 1 : currentLevel; // A对应rank=1
  if (rank === levelRank && suit === 'hearts') {
    return 97; // 逢人配
  }
  
  // 当前等级的其他花色牌
  if (rank === levelRank) {
    return 96;
  }
  
  // 按掼蛋顺序：A > K > Q > J > 9 > 8 > 7 > 6 > 5 > 4 > 3 > 2
  // 注意：当前等级的牌已经在上面处理了
  const order = [2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 1]; // J=11, Q=12, K=13, A=1
  const index = order.indexOf(rank);
  return index >= 0 ? index + 10 : 0; // 从10开始，避免和等级牌冲突
}

// 获取牌的显示名称
export function getCardDisplayName(suit: Card['suit'], rank: number): string {
  const suitNames = {
    'hearts': '红桃',
    'diamonds': '方块', 
    'clubs': '梅花',
    'spades': '黑桃',
    'joker': ''
  };
  
  if (suit === 'joker') {
    return rank === 15 ? '大王' : '小王';
  }
  
  const rankNames = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  return `${suitNames[suit]}${rankNames[rank]}`;
}

// 洗牌算法 (Fisher-Yates)
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// 随机打乱玩家顺序
export function shufflePlayerOrder(playerIds: number[]): number[] {
  const shuffled = [...playerIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// 随机选择首出玩家
export function selectFirstPlayer(playerIds: number[]): number {
  const randomIndex = Math.floor(Math.random() * playerIds.length);
  return playerIds[randomIndex];
}

// 发牌给4个玩家 (每人27张)
export function dealCards(playerIds: number[]): Map<number, Card[]> {
  if (playerIds.length !== 4) {
    throw new Error('掼蛋需要恰好4个玩家');
  }
  
  const deck = createDeck();
  const shuffledDeck = shuffleDeck(deck);
  const hands = new Map<number, Card[]>();
  
  console.log(`开始发牌给4个玩家: [${playerIds.join(', ')}]`);
  
  // 初始化每个玩家的手牌
  playerIds.forEach(playerId => {
    hands.set(playerId, []);
  });
  
  // 轮流发牌，每人27张
  for (let i = 0; i < 108; i++) {
    const playerIndex = i % 4;
    const playerId = playerIds[playerIndex];
    const playerHand = hands.get(playerId)!;
    playerHand.push(shuffledDeck[i]);
  }
  
  // 对每个玩家的手牌进行排序
  hands.forEach((hand, playerId) => {
    hand.sort((a, b) => a.value - b.value);
    console.log(`玩家${playerId}分到${hand.length}张牌`);
  });
  
  console.log('发牌完成！');
  return hands;
}

// 判断牌型（掼蛋完整规则）
export function getPlayType(cards: Card[], currentLevel: number = 2): GuanDanCardType {
  if (cards.length === 0) return 'invalid';
  
  const sortedCards = [...cards].sort((a, b) => a.value - b.value);
  
  // 四王（四张王牌）
  if (cards.length === 4 && cards.every(card => card.suit === 'joker')) {
    return 'four_kings';
  }
  
  // 炸弹：4-8张相同数值牌
  if (cards.length >= 4 && cards.length <= 8 && 
      cards.every(card => card.rank === cards[0].rank)) {
    switch (cards.length) {
      case 8: return 'bomb_8';
      case 7: return 'bomb_7';
      case 6: return 'bomb_6';
      case 5: return 'bomb_5';
      case 4: return 'bomb_4';
    }
  }
  
  // 同花顺：相同花色的连续5张牌
  if (cards.length === 5 && isSameSuit(cards) && isSequential(cards, currentLevel)) {
    return 'straight_flush';
  }
  
  // 顺子：连续5张牌，不分花色
  if (cards.length === 5 && isSequential(cards, currentLevel)) {
    return 'straight';
  }
  
  // 三连对：三对连续对牌
  if (cards.length === 6 && isTriplePair(cards, currentLevel)) {
    return 'triple_pair';
  }
  
  // 钢板：两个连续三张牌
  if (cards.length === 6 && isSteelPlate(cards, currentLevel)) {
    return 'steel_plate';
  }
  
  // 三带两：三张+一对
  if (cards.length === 5 && isTripleWithPair(cards)) {
    return 'triple_with_pair';
  }
  
  // 三张牌：相同数值的三张牌
  if (cards.length === 3 && cards.every(card => card.rank === cards[0].rank)) {
    return 'triple';
  }
  
  // 对牌：相同数值的两张牌
  if (cards.length === 2 && cards[0].rank === cards[1].rank) {
    return 'pair';
  }
  
  // 单牌
  if (cards.length === 1) {
    return 'single';
  }
  
  return 'invalid';
}

// 检查是否为相同花色
function isSameSuit(cards: Card[]): boolean {
  return cards.every(card => card.suit === cards[0].suit && card.suit !== 'joker');
}

// 检查是否为三连对
function isTriplePair(cards: Card[], currentLevel: number): boolean {
  if (cards.length !== 6) return false;
  
  // 按rank分组
  const groups = new Map<number, number>();
  cards.forEach(card => {
    groups.set(card.rank, (groups.get(card.rank) || 0) + 1);
  });
  
  // 必须是3个不同的rank，每个2张
  const ranks = Array.from(groups.keys()).sort((a, b) => a - b);
  if (ranks.length !== 3 || !groups.values().every(count => count === 2)) {
    return false;
  }
  
  // 检查是否连续
  return isRankSequential(ranks, currentLevel);
}

// 检查是否为钢板
function isSteelPlate(cards: Card[], currentLevel: number): boolean {
  if (cards.length !== 6) return false;
  
  // 按rank分组
  const groups = new Map<number, number>();
  cards.forEach(card => {
    groups.set(card.rank, (groups.get(card.rank) || 0) + 1);
  });
  
  // 必须是2个不同的rank，每个3张
  const ranks = Array.from(groups.keys()).sort((a, b) => a - b);
  if (ranks.length !== 2 || !groups.values().every(count => count === 3)) {
    return false;
  }
  
  // 检查是否连续
  return isRankSequential(ranks, currentLevel);
}

// 检查是否为三带两
function isTripleWithPair(cards: Card[]): boolean {
  if (cards.length !== 5) return false;
  
  const groups = new Map<number, number>();
  cards.forEach(card => {
    groups.set(card.rank, (groups.get(card.rank) || 0) + 1);
  });
  
  const counts = Array.from(groups.values()).sort();
  return counts.length === 2 && counts[0] === 2 && counts[1] === 3;
}

// 检查rank是否连续（考虑逢人配）
function isRankSequential(ranks: number[], currentLevel: number): boolean {
  // 掼蛋中的顺序：2,3,4,5,6,7,8,9,10,J,Q,K,A，但当前等级不参与连续
  const sequence = [2,3,4,5,6,7,8,9,10,11,12,13,1]; // A=1
  const levelRank = currentLevel === 14 ? 1 : currentLevel;
  const filteredSequence = sequence.filter(r => r !== levelRank);
  
  for (let i = 1; i < ranks.length; i++) {
    const prevIndex = filteredSequence.indexOf(ranks[i-1]);
    const currIndex = filteredSequence.indexOf(ranks[i]);
    if (prevIndex === -1 || currIndex === -1 || currIndex !== prevIndex + 1) {
      return false;
    }
  }
  return true;
}

// 检查是否为连续序列（掼蛋规则）
function isSequential(cards: Card[], currentLevel: number): boolean {
  if (cards.length !== 5) return false;
  
  const ranks = cards.map(card => card.rank).sort((a, b) => a - b);
  return isRankSequential(ranks, currentLevel);
}

// 服务器端权威验证：检查玩家是否有这些牌
export function playerHasCards(playerHand: Card[], playedCards: Card[]): boolean {
  const handCopy = [...playerHand];
  
  for (const playedCard of playedCards) {
    const cardIndex = handCopy.findIndex(card => 
      card.suit === playedCard.suit && card.rank === playedCard.rank
    );
    
    if (cardIndex === -1) {
      return false; // 玩家手里没有这张牌
    }
    
    handCopy.splice(cardIndex, 1); // 移除已匹配的牌
  }
  
  return true;
}

// 比较两次出牌的大小（掼蛋规则）
export function canBeatLastPlay(newPlay: Card[], lastPlay: PlayedCards | null, currentLevel: number = 2): boolean {
  // 如果没有上一次出牌，任何有效牌型都可以出
  if (!lastPlay) return true;
  
  const newPlayType = getPlayType(newPlay, currentLevel);
  
  // 无效牌型不能出
  if (newPlayType === 'invalid') return false;
  
  const newPriority = getCardTypePriority(newPlayType);
  const lastPriority = getCardTypePriority(lastPlay.playType);
  
  // 更高优先级的牌型可以打败低优先级的
  if (newPriority > lastPriority) return true;
  if (newPriority < lastPriority) return false;
  
  // 同类型牌型比较
  if (newPlayType === lastPlay.playType && newPlay.length === lastPlay.cards.length) {
    return comparePlayValue(newPlay, lastPlay.cards, currentLevel);
  }
  
  return false;
}

// 获取牌型优先级（数字越大越大）
export function getCardTypePriority(cardType: GuanDanCardType): number {
  const priorities = {
    'four_kings': 100,      // 四王（最大）
    'bomb_8': 90,
    'bomb_7': 89, 
    'bomb_6': 88,
    'straight_flush': 87,   // 同花顺
    'bomb_5': 86,
    'bomb_4': 85,
    'triple_pair': 10,      // 其他牌型
    'steel_plate': 10,
    'straight': 10,
    'triple_with_pair': 10,
    'triple': 10,
    'pair': 10,
    'single': 10,
    'invalid': 0
  };
  return priorities[cardType] || 0;
}

// 比较相同牌型的大小 (单张、对子等)
function comparePlayValue(newPlay: Card[], lastPlay: Card[], currentLevel: number): boolean {
  // 对于单张、对子、三张等，比较主要牌的点数
  const newValue = getMainCardValue(newPlay);
  const lastValue = getMainCardValue(lastPlay);
  
  return newValue > lastValue;
}

// 获取牌型的主要点数
function getMainCardValue(cards: Card[]): number {
  // 对于相同点数的牌，返回该点数
  return cards[0].value;
}

// 核心验证函数：验证出牌是否有效
export function isPlayValid(
  playedCards: Card[], 
  lastPlay: PlayedCards | null, 
  playerHand: Card[],
  currentLevel: number = 2
): { valid: boolean; error?: string } {
  
  // 1. 检查玩家是否真的有这些牌
  if (!playerHasCards(playerHand, playedCards)) {
    return { valid: false, error: '玩家手里没有这些牌' };
  }
  
  // 2. 检查牌型是否有效
  const playType = getPlayType(playedCards, currentLevel);
  if (playType === 'invalid') {
    return { valid: false, error: '无效的牌型' };
  }
  
  // 3. 检查是否能大过桌面上的牌
  if (!canBeatLastPlay(playedCards, lastPlay, currentLevel)) {
    return { valid: false, error: '无法大过桌面上的牌' };
  }
  
  return { valid: true };
}

// 从玩家手牌中移除指定的牌
export function removeCardsFromHand(playerHand: Card[], playedCards: Card[]): Card[] {
  const newHand = [...playerHand];
  
  for (const playedCard of playedCards) {
    const cardIndex = newHand.findIndex(card => 
      card.suit === playedCard.suit && card.rank === playedCard.rank
    );
    
    if (cardIndex !== -1) {
      newHand.splice(cardIndex, 1);
    }
  }
  
  return newHand;
}

// 获取下一个玩家ID
export function getNextPlayer(currentPlayer: number, playOrder: number[]): number {
  const currentIndex = playOrder.indexOf(currentPlayer);
  if (currentIndex === -1) {
    throw new Error(`当前玩家 ${currentPlayer} 不在游戏顺序中`);
  }
  const nextIndex = (currentIndex + 1) % playOrder.length;
  return playOrder[nextIndex];
}

// 检查游戏回合是否应该重置（所有人都过牌）
export function shouldResetRound(passedPlayers: Set<number>, playOrder: number[], lastPlayPlayer: number): boolean {
  // 如果除了上次出牌的玩家外，其他人都过牌了，则重置回合
  const otherPlayers = playOrder.filter(id => id !== lastPlayPlayer);
  return otherPlayers.every(playerId => passedPlayers.has(playerId));
}

// 验证是否轮到某个玩家出牌
export function isPlayerTurn(playerId: number, currentPlayer: number): boolean {
  return playerId === currentPlayer;
}