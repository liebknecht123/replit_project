<template>
  <div class="register-container">
    <div class="register-card">
      <div class="register-header">
        <h1 class="register-title">🃏 掼蛋游戏</h1>
        <p class="register-subtitle">欢迎加入，请创建您的账户</p>
      </div>

      <el-form
        ref="registerFormRef"
        :model="registerForm"
        :rules="registerRules"
        class="register-form"
        @submit.prevent="handleRegister"
        size="large"
      >
        <el-form-item prop="username">
          <el-input
            v-model="registerForm.username"
            placeholder="请输入用户名"
            data-testid="input-register-username"
            prefix-icon="User"
            clearable
            maxlength="20"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="registerForm.password"
            type="password"
            placeholder="请输入密码"
            data-testid="input-register-password"
            prefix-icon="Lock"
            show-password
            clearable
          />
        </el-form-item>

        <el-form-item prop="nickname">
          <el-input
            v-model="registerForm.nickname"
            placeholder="请输入昵称（可选）"
            data-testid="input-register-nickname"
            prefix-icon="Avatar"
            clearable
            maxlength="20"
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            class="register-btn"
            :loading="isLoading"
            data-testid="button-register"
            @click="handleRegister"
          >
            {{ isLoading ? '注册中...' : '立即注册' }}
          </el-button>
        </el-form-item>
      </el-form>

      <div class="register-footer">
        <p class="login-hint">
          已有账户？
          <el-button
            type="text"
            data-testid="link-login"
            @click="goToLogin"
          >
            立即登录
          </el-button>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage, type FormInstance } from 'element-plus'
import { User, Lock, Avatar } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const registerFormRef = ref<FormInstance>()
const isLoading = ref(false)

// 表单数据
const registerForm = reactive({
  username: '',
  password: '',
  nickname: ''
})

// 表单验证规则
const registerRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 50, message: '密码长度在 6 到 50 个字符', trigger: 'blur' }
  ],
  nickname: [
    { max: 20, message: '昵称长度不能超过 20 个字符', trigger: 'blur' }
  ]
}

// 注册处理
const handleRegister = async () => {
  if (!registerFormRef.value) return

  try {
    const valid = await registerFormRef.value.validate()
    if (!valid) return

    isLoading.value = true

    const requestData = {
      username: registerForm.username.trim(),
      password: registerForm.password,
      nickname: registerForm.nickname.trim() || registerForm.username.trim()
    }

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    })

    const result = await response.json()

    if (result.success) {
      ElMessage.success('注册成功！正在跳转到登录页面...')
      
      // 延迟跳转到登录页面
      setTimeout(() => {
        router.push('/')
      }, 1500)
    } else {
      ElMessage.error(result.message || '注册失败，请重试')
    }
  } catch (error) {
    console.error('注册错误:', error)
    ElMessage.error('网络错误，请检查您的连接')
  } finally {
    isLoading.value = false
  }
}

// 跳转到登录页面
const goToLogin = () => {
  router.push('/')
}

// 页面初始化
const initPage = () => {
  // 检查是否已经登录
  const token = localStorage.getItem('auth_token')
  if (token) {
    // 已登录，直接跳转到游戏页面
    router.push('/game')
  }
}

// 组件挂载时初始化
initPage()
</script>

<style scoped>
.register-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.register-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  padding: 40px;
  width: 100%;
  max-width: 400px;
  animation: slideUp 0.6s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.register-header {
  text-align: center;
  margin-bottom: 32px;
}

.register-title {
  font-size: 28px;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 8px 0;
}

.register-subtitle {
  font-size: 14px;
  color: #7f8c8d;
  margin: 0;
}

.register-form {
  margin-bottom: 24px;
}

.register-form .el-form-item {
  margin-bottom: 20px;
}

.register-btn {
  width: 100%;
  height: 46px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  transition: all 0.3s ease;
}

.register-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.register-footer {
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid #ecf0f1;
}

.login-hint {
  color: #7f8c8d;
  font-size: 14px;
  margin: 0;
}

.login-hint .el-button {
  padding: 0;
  margin-left: 4px;
  font-weight: 600;
  color: #667eea;
}

.login-hint .el-button:hover {
  color: #764ba2;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .register-container {
    padding: 12px;
  }
  
  .register-card {
    padding: 24px;
  }
  
  .register-title {
    font-size: 24px;
  }
}
</style>