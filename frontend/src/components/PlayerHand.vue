<template>
  <div class="player-hand">
    <div class="hand-container">
      <Card
        v-for="(card, index) in cards"
        :key="`${card.suit}-${card.rank}-${index}`"
        :suit="card.suit"
        :rank="card.rank"
        :is-selected="selectedCards.includes(index)"
        :style="getCardStyle(index)"
        @click="toggleCard(index)"
        class="hand-card"
      />
    </div>
    <div class="hand-info">
      <span>手牌: {{ cards.length }} 张</span>
      <span v-if="selectedCards.length > 0">已选: {{ selectedCards.length }} 张</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Card from './Card.vue'

interface CardData {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades' | 'joker'
  rank: string | number
}

interface Props {
  cards: CardData[]
  maxSelection?: number
}

const props = withDefaults(defineProps<Props>(), {
  maxSelection: 99
})

const selectedCards = ref<number[]>([])

const emit = defineEmits<{
  'selection-change': [selectedCards: number[], cardData: CardData[]]
}>()

const toggleCard = (index: number) => {
  const currentIndex = selectedCards.value.indexOf(index)
  
  if (currentIndex > -1) {
    // 取消选中
    selectedCards.value.splice(currentIndex, 1)
  } else {
    // 选中卡牌
    if (selectedCards.value.length < props.maxSelection) {
      selectedCards.value.push(index)
    }
  }
  
  // 发送选中状态变化事件
  const selectedCardData = selectedCards.value.map(i => props.cards[i])
  emit('selection-change', [...selectedCards.value], selectedCardData)
}

// 按花色排序：方块、梅花、红桃、黑桃
const getSuitOrder = (suit: string): number => {
  const order = { diamonds: 0, clubs: 1, hearts: 2, spades: 3, joker: 4 }
  return order[suit as keyof typeof order] ?? 4
}

// 缓存的分组排序结果，避免每次重新计算
const groupedAndSortedCards = computed(() => {
  // 先按点数分组
  const groups = new Map<string | number, CardData[]>()
  
  props.cards.forEach(card => {
    const key = card.rank
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(card)
  })
  
  // 对每组内的卡牌按花色排序
  for (const group of groups.values()) {
    group.sort((a, b) => getSuitOrder(a.suit) - getSuitOrder(b.suit))
  }
  
  // 按点数排序分组，然后展平
  const sortedGroups = Array.from(groups.entries()).sort((a, b) => {
    const rankA = typeof a[0] === 'string' ? (a[0] === 'small' ? 100 : 101) : a[0]
    const rankB = typeof b[0] === 'string' ? (b[0] === 'small' ? 100 : 101) : b[0]
    return rankA - rankB
  })
  
  return sortedGroups.flatMap(([_, cards]) => cards)
})

const getCardStyle = (index: number) => {
  const sortedCards = groupedAndSortedCards.value
  const currentCard = props.cards[index]
  
  const totalCards = sortedCards.length
  const maxWidth = 900
  const cardWidth = 45
  const cardSpacing = 50
  const cardHeight = 63 // CSS定义的卡牌高度
  const overlapRatio = 0.2 // 重叠20%，露出80%
  const stackOffset = cardHeight * overlapRatio // 约12.6px的重叠
  
  // 计算是否需要缩小间距
  const totalNeededWidth = (totalCards - 1) * cardSpacing + cardWidth
  let spacing = cardSpacing
  
  if (totalNeededWidth > maxWidth) {
    spacing = Math.max(cardWidth + 5, (maxWidth - cardWidth) / (totalCards - 1))
  }
  
  // 重新按点数分组来计算位置
  const groups = new Map<string | number, CardData[]>()
  sortedCards.forEach(card => {
    const key = card.rank
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(card)
  })
  
  const groupEntries = Array.from(groups.entries())
  let groupStartIndex = 0
  
  for (let i = 0; i < groupEntries.length; i++) {
    const [rank, cards] = groupEntries[i]
    const cardIndexInGroup = cards.findIndex(card => 
      card.suit === currentCard.suit && card.rank === currentCard.rank
    )
    
    if (cardIndexInGroup >= 0) {
      const cardX = groupStartIndex * spacing
      
      // 计算垂直偏移：第一张卡保持y=0，后续卡向上堆叠
      const cardY = cardIndexInGroup === 0 ? 0 : -stackOffset * cardIndexInGroup
      
      // 整体居中
      const totalHandWidth = (groupEntries.length - 1) * spacing + cardWidth
      const startOffset = -totalHandWidth / 2 + cardWidth / 2
      
      // z-index：同组内后续卡牌在上方
      const zIndex = groupStartIndex * 100 + cardIndexInGroup + 1
      
      return {
        '--card-x': `${startOffset + cardX}px`,
        '--card-y': `${cardY}px`,
        zIndex
      }
    }
    groupStartIndex++
  }
  
  // 默认返回
  return {
    '--card-x': '0px',
    '--card-y': '0px',
    zIndex: index + 1
  }
}

// 清空选择
const clearSelection = () => {
  selectedCards.value = []
  emit('selection-change', [], [])
}

// 选择所有
const selectAll = () => {
  selectedCards.value = props.cards.map((_, index) => index).slice(0, props.maxSelection)
  const selectedCardData = selectedCards.value.map(i => props.cards[i])
  emit('selection-change', [...selectedCards.value], selectedCardData)
}

defineExpose({
  clearSelection,
  selectAll,
  selectedCards: computed(() => selectedCards.value)
})
</script>

<style scoped>
.player-hand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.hand-container {
  display: flex;
  position: relative;
  height: 120px; /* 适中的高度，足够容纳少量堆叠 */
  align-items: flex-end;
  justify-content: center;
  width: 100%; /* 使用全宽度 */
  min-width: 400px; /* 最小宽度 */
  max-width: 1000px; /* 最大宽度 */
}

.hand-card {
  position: absolute;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.hand-info {
  display: flex;
  gap: 16px;
  color: white;
  font-size: 14px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  backdrop-filter: blur(10px);
}
</style>