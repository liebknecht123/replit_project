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
  const cardHeight = 100 // 卡牌高度
  
  const currentCard = props.cards[index]
  const currentGroupId = currentCard.groupId
  
  // 检查当前牌是否有分组
  if (currentGroupId) {
    // 找到同组的所有牌
    const groupCards = props.cards.filter(card => card.groupId === currentGroupId)
    const groupStartIndex = props.cards.findIndex(card => card.groupId === currentGroupId)
    const indexInGroup = index - groupStartIndex
    
    // 计算分组的基础X位置（整个分组作为一个单元）
    const groupsInfo: { groupId: string; startIndex: number; count: number }[] = []
    let currentGroup: { groupId: string; startIndex: number; count: number } | null = null
    
    props.cards.forEach((card, idx) => {
      if (card.groupId) {
        if (!currentGroup || currentGroup.groupId !== card.groupId) {
          currentGroup = { groupId: card.groupId, startIndex: idx, count: 1 }
          groupsInfo.push(currentGroup)
        } else {
          currentGroup.count++
        }
      } else {
        currentGroup = null
      }
    })
    
    // 计算所有单元（分组+单牌）的布局
    const units: { type: 'group' | 'single'; startIndex: number; count: number }[] = []
    let i = 0
    while (i < totalCards) {
      const card = props.cards[i]
      if (card.groupId) {
        const group = groupsInfo.find(g => g.startIndex === i)
        if (group) {
          units.push({ type: 'group', startIndex: i, count: group.count })
          i += group.count
        } else {
          i++
        }
      } else {
        units.push({ type: 'single', startIndex: i, count: 1 })
        i++
      }
    }
    
    // 计算当前牌所属单元的索引
    let unitIndex = 0
    for (let j = 0; j < units.length; j++) {
      if (index >= units[j].startIndex && index < units[j].startIndex + units[j].count) {
        unitIndex = j
        break
      }
    }
    
    // 计算单元的水平布局
    const minSpacing = cardWidth * 0.8
    const idealSpacing = cardWidth * 0.85
    const availableSpacing = units.length > 1 ? (maxWidth - cardWidth) / (units.length - 1) : cardWidth
    const unitSpacing = Math.max(minSpacing, Math.min(idealSpacing, availableSpacing))
    
    const totalHandWidth = units.length === 1 ? cardWidth : (units.length - 1) * unitSpacing + cardWidth
    const startOffset = -totalHandWidth / 2 + cardWidth / 2
    
    // 分组单元的基础X位置
    const groupBaseX = startOffset + unitIndex * unitSpacing
    
    // 竖向堆叠：每张牌只显示上方30%
    const verticalSpacing = cardHeight * 0.3 // 每张牌向上偏移30%的高度
    const verticalOffset = -indexInGroup * verticalSpacing // 向上堆叠
    
    // z-index: 基于单元索引 + 堆叠内偏移（下方的牌遮挡上方的牌）
    const zIndex = unitIndex * 100 + (groupCards.length - indexInGroup)
    
    return {
      '--card-x': `${groupBaseX}px`,
      '--card-y': `${verticalOffset}px`,
      '--card-rotation': '0deg',
      zIndex
    }
  }
  
  // 无分组的牌按原逻辑处理，但要考虑分组占据的位置
  const groupsInfo: { groupId: string; startIndex: number; count: number }[] = []
  let currentGroup: { groupId: string; startIndex: number; count: number } | null = null
  
  props.cards.forEach((card, idx) => {
    if (card.groupId) {
      if (!currentGroup || currentGroup.groupId !== card.groupId) {
        currentGroup = { groupId: card.groupId, startIndex: idx, count: 1 }
        groupsInfo.push(currentGroup)
      } else {
        currentGroup.count++
      }
    } else {
      currentGroup = null
    }
  })
  
  // 计算所有单元
  const units: { type: 'group' | 'single'; startIndex: number; count: number }[] = []
  let i = 0
  while (i < totalCards) {
    const card = props.cards[i]
    if (card.groupId) {
      const group = groupsInfo.find(g => g.startIndex === i)
      if (group) {
        units.push({ type: 'group', startIndex: i, count: group.count })
        i += group.count
      } else {
        i++
      }
    } else {
      units.push({ type: 'single', startIndex: i, count: 1 })
      i++
    }
  }
  
  // 找到当前牌的单元索引
  let unitIndex = 0
  for (let j = 0; j < units.length; j++) {
    if (index >= units[j].startIndex && index < units[j].startIndex + units[j].count) {
      unitIndex = j
      break
    }
  }
  
  // 计算单元布局
  const minSpacing = cardWidth * 0.8
  const idealSpacing = cardWidth * 0.85
  const availableSpacing = units.length > 1 ? (maxWidth - cardWidth) / (units.length - 1) : cardWidth
  const unitSpacing = Math.max(minSpacing, Math.min(idealSpacing, availableSpacing))
  
  const totalHandWidth = units.length === 1 ? cardWidth : (units.length - 1) * unitSpacing + cardWidth
  const startOffset = -totalHandWidth / 2 + cardWidth / 2
  
  const cardX = startOffset + unitIndex * unitSpacing
  
  return {
    '--card-x': `${cardX}px`,
    '--card-y': '0px',
    '--card-rotation': '0deg',
    zIndex: unitIndex * 100
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
  transform: translateY(-50px);
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