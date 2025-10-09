<template>
  <div 
    class="card" 
    :class="{ 
      'selected': isSelected,
      'red': isRed,
      'black': isBlack
    }"
    :data-suit="suit"
    @click="$emit('click')"
  >
    <!-- 左上角：数字 + 小花色 -->
    <div class="card-header">
      <div class="rank">{{ displayRank }}</div>
      <div class="suit-small">{{ displaySuit }}</div>
    </div>
    <!-- 中间：大花色图案 -->
    <div class="card-center">
      <div class="suit-large">{{ displaySuit }}</div>
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
    spades: '♥', // 使用红桃符号，通过CSS旋转180度
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
  transform: translateX(var(--card-x, 0)) translateY(var(--card-y, 0)) rotate(var(--card-rotation, 0deg));
  box-shadow: 0 6px 12px rgba(0,0,0,0.2);
}

.card.selected {
  transform: translateX(var(--card-x, 0)) translateY(var(--card-y, 0)) rotate(var(--card-rotation, 0deg));
  border-color: #409eff;
  box-shadow: 
    0 0 0 3px rgba(0, 0, 0, 0.8),
    inset 0 0 0 3px rgba(0, 0, 0, 0.5);
}

/* 左上角：数字 + 小花色 */
.card-header {
  position: absolute;
  top: 3px;
  left: 5px;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 2px;
  font-weight: bold;
}

.rank {
  font-size: 24px;
  line-height: 1;
}

.suit-small {
  font-size: 20px;
  line-height: 1;
  margin-top: 1px;
}

/* 中间靠下：大花色图案 */
.card-center {
  position: absolute;
  top: 60%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.suit-large {
  font-size: 40px;
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

.card[data-suit="joker"] .card-header {
  display: none;
}

.card[data-suit="joker"] .suit-large {
  font-size: 36px;
}

/* 方块：加宽显示（高度不变，左右方向拉宽） */
.card[data-suit="diamonds"] .suit-small,
.card[data-suit="diamonds"] .suit-large {
  transform: scaleX(1.4);
}

/* 黑桃：使用红桃符号旋转180度 */
.card[data-suit="spades"] .suit-small,
.card[data-suit="spades"] .suit-large {
  transform: rotate(180deg);
}
</style>