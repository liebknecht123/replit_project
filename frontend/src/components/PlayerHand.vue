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
  // 直接按花色优先排序，花色内按点数排序
  const sortedCards = [...props.cards].sort((a, b) => {
    // 先按花色排序
    const suitOrderA = getSuitOrder(a.suit)
    const suitOrderB = getSuitOrder(b.suit)
    
    if (suitOrderA !== suitOrderB) {
      return suitOrderA - suitOrderB
    }
    
    // 同花色内按点数排序
    const rankA = typeof a.rank === 'string' ? (a.rank === 'small' ? 100 : 101) : a.rank
    const rankB = typeof b.rank === 'string' ? (b.rank === 'small' ? 100 : 101) : b.rank
    return rankA - rankB
  })
  
  return sortedCards
})

const getCardStyle = (index: number) => {
  const totalCards = props.cards.length
  const maxWidth = 1400 // 增加最大宽度以适应更大的卡牌
  const cardWidth = 67.5 // 卡牌宽度增大1.5倍
  
  // 计算直列排列的参数 - 严格确保80%可见度
  // 80%可见度意味着间距必须至少是卡牌宽度的80%
  const minSpacing = cardWidth * 0.8 // 最小间距确保80%可见度
  const idealSpacing = cardWidth * 0.85 // 理想间距为85%，稍微更宽松
  
  // 计算可用宽度下的理论间距
  const availableSpacing = totalCards > 1 ? (maxWidth - cardWidth) / (totalCards - 1) : cardWidth
  
  // 确保间距绝不低于80%，优先选择理想间距
  const cardSpacing = Math.max(minSpacing, Math.min(idealSpacing, availableSpacing))
  
  // 计算整体手牌宽度
  const totalHandWidth = totalCards === 1 ? cardWidth : (totalCards - 1) * cardSpacing + cardWidth
  const startOffset = -totalHandWidth / 2 + cardWidth / 2
  
  // 计算当前卡牌的水平位置
  const cardX = startOffset + index * cardSpacing
  
  // 直列形排列：无旋转角度，无垂直偏移
  const rotationAngle = 0
  const verticalOffset = 0
  
  return {
    '--card-x': `${cardX}px`,
    '--card-y': `${verticalOffset}px`,
    '--card-rotation': `${rotationAngle}deg`,
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
  height: 150px;
  align-items: flex-end;
  justify-content: center;
  width: 100%;
  min-width: 800px;
  max-width: 1600px;
}

.hand-card {
  position: absolute;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.hand-info {
  display: flex;
  gap: 16px;
  color: white;
  font-size: 25.2px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  backdrop-filter: blur(10px);
}
</style>