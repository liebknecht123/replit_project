// 共享的牌型检测和评估逻辑

export interface CardData {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades' | 'joker';
  rank: number | 'small' | 'big';
}

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

// 获取牌的数值
export function getCardValue(card: CardData): number {
  if (card.suit === 'joker') {
    return card.rank === 'small' ? 16 : 17; // 小王16, 大王17
  }
  if (card.rank === 1 || card.rank === 14) return 14; // A = 14
  return typeof card.rank === 'number' ? card.rank : parseInt(card.rank as string);
}

// 按数值分组
function groupByValue(cards: CardData[]): Map<number, CardData[]> {
  const groups = new Map<number, CardData[]>();
  cards.forEach(card => {
    const value = getCardValue(card);
    if (!groups.has(value)) {
      groups.set(value, []);
    }
    groups.get(value)!.push(card);
  });
  return groups;
}

// 检查是否是连续的数值
function isConsecutive(values: number[]): boolean {
  if (values.length < 2) return false;
  const sorted = [...values].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] !== 1) return false;
  }
  return true;
}

// 判断牌型（前端版本）
export function detectCardPattern(cards: CardData[]): GuanDanCardType {
  if (cards.length === 0) return 'invalid';
  
  const sortedCards = [...cards].sort((a, b) => getCardValue(a) - getCardValue(b));
  const groups = groupByValue(sortedCards);
  
  // 四王（四张王牌）
  if (cards.length === 4 && cards.every(card => card.suit === 'joker')) {
    return 'four_kings';
  }
  
  // 炸弹：4-8张相同数值牌
  if (cards.length >= 4 && cards.length <= 8 && groups.size === 1) {
    const count = cards.length;
    switch (count) {
      case 8: return 'bomb_8';
      case 7: return 'bomb_7';
      case 6: return 'bomb_6';
      case 5: return 'bomb_5';
      case 4: return 'bomb_4';
    }
  }
  
  // 同花顺：只能是恰好5张同花色连续牌
  if (cards.length === 5 && cards.every(card => card.suit === sortedCards[0].suit && card.suit !== 'joker')) {
    const values = sortedCards.map(c => getCardValue(c));
    if (isConsecutive(values)) {
      return 'straight_flush';
    }
  }
  
  // 钢板：只能是2副相邻的三条（如AAA222、222333、KKKAAA）
  if (cards.length === 6) {
    const groupArray = Array.from(groups.entries()).sort((a, b) => a[0] - b[0]);
    if (groupArray.length === 2 && groupArray.every(([_, cards]) => cards.length === 3)) {
      const values = groupArray.map(([v]) => v);
      if (isConsecutive(values)) {
        return 'steel_plate';
      }
    }
  }
  
  // 三连对：连续的对子（如223344、778899）
  if (cards.length >= 6 && cards.length % 2 === 0) {
    const groupArray = Array.from(groups.entries()).sort((a, b) => a[0] - b[0]);
    if (groupArray.every(([_, cards]) => cards.length === 2)) {
      const values = groupArray.map(([v]) => v);
      if (isConsecutive(values)) {
        return 'triple_pair';
      }
    }
  }
  
  // 顺子：5+张连续牌（不要求同花色）
  if (cards.length >= 5 && groups.size === cards.length) {
    const values = Array.from(groups.keys()).sort((a, b) => a - b);
    if (isConsecutive(values)) {
      return 'straight';
    }
  }
  
  // 三带二：3张+2张
  if (cards.length === 5 && groups.size === 2) {
    const counts = Array.from(groups.values()).map(g => g.length);
    if (counts.includes(3) && counts.includes(2)) {
      return 'triple_with_pair';
    }
  }
  
  // 三张
  if (cards.length === 3 && groups.size === 1) {
    return 'triple';
  }
  
  // 对子
  if (cards.length === 2 && groups.size === 1) {
    return 'pair';
  }
  
  // 单牌
  if (cards.length === 1) {
    return 'single';
  }
  
  return 'invalid';
}

// 获取牌型优先级（用于排序）
export function getCardTypePriority(cardType: GuanDanCardType): number {
  const priorities = {
    'four_kings': 100,
    'bomb_8': 90,
    'bomb_7': 89,
    'bomb_6': 88,
    'straight_flush': 87,
    'bomb_5': 86,
    'bomb_4': 85,
    'triple_pair': 50,
    'steel_plate': 40,
    'straight': 30,
    'triple_with_pair': 20,
    'triple': 15,
    'pair': 10,
    'single': 5,
    'invalid': 0
  };
  return priorities[cardType] || 0;
}

// 比较两组牌的大小（用于手动理牌时排序）
export function compareCardGroups(group1: CardData[], group2: CardData[]): number {
  const type1 = detectCardPattern(group1);
  const type2 = detectCardPattern(group2);
  
  const priority1 = getCardTypePriority(type1);
  const priority2 = getCardTypePriority(type2);
  
  // 优先级高的在前
  if (priority1 !== priority2) {
    return priority2 - priority1;
  }
  
  // 同类型比较最大牌值
  const maxValue1 = Math.max(...group1.map(c => getCardValue(c)));
  const maxValue2 = Math.max(...group2.map(c => getCardValue(c)));
  return maxValue2 - maxValue1;
}

// 检查牌型是否有效（非invalid和非single）
export function isSpecialPattern(cards: CardData[]): boolean {
  const pattern = detectCardPattern(cards);
  return pattern !== 'invalid' && pattern !== 'single';
}
