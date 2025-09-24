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

const getCardStyle = (index: number) => {
  const totalCards = props.cards.length
  const maxWidth = 900 // 增加最大宽度
  const cardWidth = 45 // 更新卡牌宽度
  const cardSpacing = 50 // 卡牌间距，不重叠显示
  
  // 计算是否需要缩小间距来适应屏幕
  const totalNeededWidth = (totalCards - 1) * cardSpacing + cardWidth
  let spacing = cardSpacing
  
  if (totalNeededWidth > maxWidth) {
    spacing = Math.max(cardWidth + 5, (maxWidth - cardWidth) / (totalCards - 1))
  }
  
  if (totalCards === 1) spacing = 0
  
  return {
    '--card-x': `${index * spacing}px`,
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
  height: 85px; /* 调整高度适配更小的卡牌 */
  align-items: flex-end;
  justify-content: center;
  min-width: 400px; /* 增加最小宽度以适应不重叠的卡牌 */
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