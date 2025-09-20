// 掼蛋游戏核心逻辑
export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades' | 'joker'; // 红桃、方块、梅花、黑桃、王
  rank: number; // 1-13 (A-K), 14=小王, 15=大王
  value: number; // 实际游戏中的大小值
}

export interface PlayedCards {
  cards: Card[];
  playType: 'single' | 'pair' | 'triple' | 'bomb' | 'straight' | 'flush' | 'invalid';
  player: number; // 玩家ID
}

export interface GameState {
  roomId: string;
  players: number[]; // 4个玩家ID
  hands: Map<number, Card[]>; // 每个玩家的手牌
  currentPlayer: number; // 当前出牌玩家
  playOrder: number[]; // 固定的玩家ID顺序
  currentPlayerIndex: number; // 指向playOrder数组的当前回合索引
  lastPlay: PlayedCards | null; // 上一次出牌
  tableCards: Card[]; // 桌面上的牌
  gamePhase: 'waiting' | 'dealing' | 'playing' | 'finished';
  currentLevel: number; // 当前等级 (A=1, 2-10, J=11, Q=12, K=13)
}

// 生成两副完整扑克牌
export function createDeck(): Card[] {
  const suits: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const deck: Card[] = [];
  
  // 两副普通牌 (A-K)
  for (let deckNum = 0; deckNum < 2; deckNum++) {
    for (const suit of suits) {
      for (let rank = 1; rank <= 13; rank++) {
        deck.push({
          suit,
          rank,
          value: rank === 1 ? 14 : rank // A在掼蛋中是14
        });
      }
    }
    
    // 添加王牌：小王(14)和大王(15)
    deck.push({ suit: 'joker', rank: 14, value: 16 }); // 小王
    deck.push({ suit: 'joker', rank: 15, value: 17 }); // 大王
  }
  
  return deck;
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

// 发牌给玩家 (支持2-4个玩家)
export function dealCards(playerIds: number[]): Map<number, Card[]> {
  if (playerIds.length < 2 || playerIds.length > 4) {
    throw new Error(`掼蛋需要2-4个玩家，当前有${playerIds.length}个玩家`);
  }
  
  const deck = createDeck();
  const shuffledDeck = shuffleDeck(deck);
  const hands = new Map<number, Card[]>();
  
  console.log(`开始发牌给${playerIds.length}个玩家: [${playerIds.join(', ')}]`);
  
  // 初始化每个玩家的手牌
  playerIds.forEach(playerId => {
    hands.set(playerId, []);
  });
  
  // 计算每个玩家应该分到的牌数
  const cardsPerPlayer = Math.floor(108 / playerIds.length);
  const totalCardsToDistribute = cardsPerPlayer * playerIds.length;
  
  console.log(`每个玩家将获得${cardsPerPlayer}张牌，总共分发${totalCardsToDistribute}张牌`);
  
  // 轮流发牌
  for (let i = 0; i < totalCardsToDistribute; i++) {
    const playerIndex = i % playerIds.length;
    const playerId = playerIds[playerIndex];
    const playerHand = hands.get(playerId)!;
    playerHand.push(shuffledDeck[i]);
  }
  
  // 对每个玩家的手牌进行排序并记录
  hands.forEach((hand, playerId) => {
    hand.sort((a, b) => a.value - b.value);
    console.log(`玩家${playerId}分到${hand.length}张牌`);
  });
  
  console.log('发牌完成！');
  return hands;
}

// 判断牌型
export function getPlayType(cards: Card[]): PlayedCards['playType'] {
  if (cards.length === 0) return 'invalid';
  if (cards.length === 1) return 'single';
  if (cards.length === 2 && cards[0].value === cards[1].value) return 'pair';
  if (cards.length === 3 && cards[0].value === cards[1].value && cards[1].value === cards[2].value) return 'triple';
  
  // 炸弹：4张或以上相同点数
  if (cards.length >= 4 && cards.every(card => card.value === cards[0].value)) return 'bomb';
  
  // 顺子：连续的单张 (至少5张)
  if (cards.length >= 5 && isSequential(cards)) return 'straight';
  
  return 'invalid';
}

// 检查是否为连续序列
function isSequential(cards: Card[]): boolean {
  const sortedCards = [...cards].sort((a, b) => a.value - b.value);
  for (let i = 1; i < sortedCards.length; i++) {
    if (sortedCards[i].value !== sortedCards[i-1].value + 1) {
      return false;
    }
  }
  return true;
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

// 比较两次出牌的大小
export function canBeatLastPlay(newPlay: Card[], lastPlay: PlayedCards | null): boolean {
  // 如果没有上一次出牌，任何有效牌型都可以出
  if (!lastPlay) return true;
  
  const newPlayType = getPlayType(newPlay);
  
  // 无效牌型不能出
  if (newPlayType === 'invalid') return false;
  
  // 炸弹可以打败任何非炸弹牌型
  if (newPlayType === 'bomb' && lastPlay.playType !== 'bomb') return true;
  
  // 炸弹vs炸弹：比较牌数和点数
  if (newPlayType === 'bomb' && lastPlay.playType === 'bomb') {
    if (newPlay.length > lastPlay.cards.length) return true;
    if (newPlay.length === lastPlay.cards.length) {
      return newPlay[0].value > lastPlay.cards[0].value;
    }
    return false;
  }
  
  // 同类型牌型比较
  if (newPlayType === lastPlay.playType && newPlay.length === lastPlay.cards.length) {
    return comparePlayValue(newPlay, lastPlay.cards);
  }
  
  return false;
}

// 比较相同牌型的大小 (单张、对子等)
function comparePlayValue(newPlay: Card[], lastPlay: Card[]): boolean {
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
  playerHand: Card[]
): { valid: boolean; error?: string } {
  
  // 1. 检查玩家是否真的有这些牌
  if (!playerHasCards(playerHand, playedCards)) {
    return { valid: false, error: '玩家手里没有这些牌' };
  }
  
  // 2. 检查牌型是否有效
  const playType = getPlayType(playedCards);
  if (playType === 'invalid') {
    return { valid: false, error: '无效的牌型' };
  }
  
  // 3. 检查是否能大过桌面上的牌
  if (!canBeatLastPlay(playedCards, lastPlay)) {
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

// 检查游戏是否结束 (某个玩家手牌为空)
export function isGameFinished(hands: Map<number, Card[]>): { finished: boolean; winner?: number } {
  const entries = Array.from(hands.entries());
  for (const [playerId, hand] of entries) {
    if (hand.length === 0) {
      return { finished: true, winner: playerId };
    }
  }
  return { finished: false };
}