<template>
  <div class="action-panel">
    <div class="action-buttons">
      <el-button
        type="primary"
        size="large"
        :disabled="!canPlay"
        @click="handlePlay"
        class="action-btn play-btn"
      >
        <el-icon><CaretRight /></el-icon>
        出牌
      </el-button>
      
      <el-button
        type="info"
        size="large"
        :disabled="!canPass"
        @click="handlePass"
        class="action-btn pass-btn"
      >
        <el-icon><Close /></el-icon>
        不出
      </el-button>
      
      <el-button
        type="warning"
        size="large"
        @click="handleHint"
        class="action-btn hint-btn"
        :disabled="!canHint"
      >
        <el-icon><QuestionFilled /></el-icon>
        提示
      </el-button>
      
      <el-button
        type="success"
        size="large"
        @click="handleAutoSort"
        :disabled="!canAutoSort"
        class="action-btn auto-btn"
      >
        <el-icon><MagicStick /></el-icon>
        智能整理
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { 
  CaretRight, 
  Close, 
  QuestionFilled, 
  MagicStick
} from '@element-plus/icons-vue'

interface Props {
  canPlay?: boolean
  canPass?: boolean
  canHint?: boolean
  canAutoSort?: boolean
  isMyTurn?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  canPlay: false,
  canPass: false,
  canHint: true,
  canAutoSort: true,
  isMyTurn: false
})

const emit = defineEmits<{
  play: []
  pass: []
  hint: []
  autoSort: []
}>()

const handlePlay = () => {
  if (props.canPlay) {
    emit('play')
  }
}

const handlePass = () => {
  if (props.canPass) {
    emit('pass')
  }
}

const handleHint = () => {
  if (props.canHint) {
    emit('hint')
  }
}

const handleAutoSort = () => {
  if (props.canAutoSort) {
    emit('autoSort')
  }
}
</script>

<style scoped>
.action-panel {
  display: flex;
  flex-direction: column;
  gap: 13px;
  padding: 16px 21px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transform: scale(1.04);
}

.action-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
}

.action-btn {
  min-width: 104px;
  height: 52px;
  font-size: 18px;
  font-weight: bold;
  border-radius: 13px;
  transition: all 0.3s ease;
}

.play-btn {
  background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
  border: none;
}

.play-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(34, 197, 94, 0.4);
}

.pass-btn {
  background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%);
  border: none;
}

.pass-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(100, 116, 139, 0.4);
}

.hint-btn {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  border: none;
}

.hint-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(245, 158, 11, 0.4);
}

.game-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.auto-btn {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  border: none;
  color: white;
}

.surrender-btn {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  border: none;
}

.action-btn:disabled {
  background: #374151;
  color: #6b7280;
  transform: none !important;
  box-shadow: none !important;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .action-panel {
    padding: 16px;
  }
  
  .action-btn {
    min-width: 80px;
    height: 40px;
    font-size: 14px;
  }
}
</style>