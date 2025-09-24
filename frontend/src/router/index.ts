import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'login',
      component: () => import('@/components/LoginForm.vue')
    },
    {
      path: '/game',
      name: 'game',
      component: () => import('@/components/GameTable.vue'),
      meta: { requiresAuth: true }
    }
  ]
})

// 路由守卫 - 检查登录状态
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('auth_token')
  
  if (to.meta.requiresAuth && !token) {
    // 需要登录但没有token，跳转到登录页
    next('/')
  } else if (to.name === 'login' && token) {
    // 已登录但访问登录页，跳转到游戏页
    next('/game')
  } else {
    next()
  }
})

export default router