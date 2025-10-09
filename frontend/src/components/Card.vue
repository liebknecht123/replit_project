<template>
  <div 
    class="card" 
    :class="{ 
      'selected': isSelected,
      'red': isRed,
      'black': isBlack
    }"
    @click="$emit('click')"
  >
    <div class="card-content">
      <div class="rank">{{ displayRank }}</div>
      <div class="suit">{{ displaySuit }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades' | 'joker'
  rank: string | number
  isSelected?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isSelected: false
})

defineEmits<{
  click: []
}>()

const isRed = computed(() => props.suit === 'hearts' || props.suit === 'diamonds')
const isBlack = computed(() => props.suit === 'clubs' || props.suit === 'spades')

const displaySuit = computed(() => {
  const suitMap = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
    joker: '🃏'
  }
  return suitMap[props.suit]
})

const displayRank = computed(() => {
  if (props.suit === 'joker') return ''
  if (props.rank === 1) return 'A'
  if (props.rank === 11) return 'J'
  if (props.rank === 12) return 'Q'
  if (props.rank === 13) return 'K'
  if (props.rank === 14) return 'A'
  return props.rank.toString()
})
</script>

<style scoped>
.card {
  width: 67.5px;
  height: 94.5px;
  background: white;
  border-radius: 9px;
  border: 2px solid #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 3px 6px rgba(0,0,0,0.1);
  user-select: none;
  position: relative;
  transform: translateX(var(--card-x, 0)) translateY(var(--card-y, 0)) rotate(var(--card-rotation, 0deg));
}

.card:hover {
  transform: translateX(var(--card-x, 0)) translateY(calc(var(--card-y, 0px) - 8px)) rotate(var(--card-rotation, 0deg)) scale(1.05);
  box-shadow: 0 6px 12px rgba(0,0,0,0.2);
  z-index: 100 !important;
}

.card.selected {
  transform: translateX(var(--card-x, 0)) translateY(var(--card-y, 0)) rotate(var(--card-rotation, 0deg));
  border-color: #409eff;
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.6);
  z-index: 101 !important;
}

.card-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.rank {
  font-size: 31.5px;
  line-height: 1;
  margin-bottom: 3px;
}

.suit {
  font-size: 40.5px;
  line-height: 1;
}

.red {
  color: #e74c3c;
}

.black {
  color: #2c3e50;
}

.card[data-suit="joker"] {
  background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
  color: white;
}

.card[data-suit="joker"] .suit {
  font-size: 36px;
}
</style>