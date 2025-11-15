<script setup>
import { computed, ref, onMounted } from 'vue';
import { useSettingsStore } from '../stores/settings';

const settingsStore = useSettingsStore();

const currentTheme = computed(() => settingsStore.theme.value);
const codePath = ref('未检索')
const codeLoading = ref(false)
const codeError = ref('')

const storageFiles = ref([])
const storageLoading = ref(false)
const storageError = ref('')

const projects = ref([])
const projectSources = ref([])

onMounted(() => {
  if (window.services && typeof window.services.findCommandPath === 'function') {
    try {
      codeLoading.value = true
      const res = window.services.findCommandPath('code')
      if (res && res.success) {
        codePath.value = res.path || (res.all && res.all.length ? res.all[0] : '未找到')
      } else {
        codeError.value = (res && res.message) || '未找到 code 路径'
        codePath.value = ''
      }
    } catch (err) {
      codeError.value = err && err.message ? err.message : String(err)
      codePath.value = ''
    } finally {
      codeLoading.value = false
    }
  } else {
    codeError.value = '预加载服务中未暴露 findCommandPath'
    codePath.value = ''
  }

  // 提取所有编辑器的项目
  if (window.services && typeof window.services.extractAllProjects === 'function') {
    try {
      storageLoading.value = true
      const res = window.services.extractAllProjects()
      if (res && res.success) {
        projects.value = res.allProjects || []
        projectSources.value = res.sources || []
        if (projects.value.length === 0) {
          storageError.value = '未找到任何项目'
        }
      } else {
        storageError.value = (res && res.message) || '提取项目失败'
      }
    } catch (err) {
      storageError.value = err && err.message ? err.message : String(err)
    } finally {
      storageLoading.value = false
    }
  } else {
    storageError.value = '预加载服务中未暴露 extractAllProjects'
  }
})
</script>

<template>
  <div style="padding: 24px; max-width: 900px; margin: 0 auto;">
    <h2>uTools 插件开发模板</h2>
    <p>这是一个轻量的插件模板，保留了基础的主题支持与配置持久化。你可以基于此仓库快速开始自己的 uTools 插件开发。</p>

    <div style="margin-top: 16px;">
      <a-typography-text strong>当前主题:</a-typography-text>
      <div style="margin-top:8px">{{ currentTheme }}</div>
    </div>

    <div style="margin-top: 18px;">
      <a-typography-text strong>快速开始：</a-typography-text>
      <ul>
        <li>根据 `public/plugin.json` 添加或修改功能点（features）。</li>
        <li>在 `src/components/` 中添加你的页面与逻辑；`HomeView` 为示例主页。</li>
        <li>使用 `window.services`（预加载脚本）访问 Node 文件能力（导入/导出等）。</li>
      </ul>
    </div>

    <div style="margin-top: 18px;">
      <a-typography-text strong>本地 VSCode 可执行路径：</a-typography-text>
      <div style="margin-top:8px">
        <template v-if="codeLoading">正在检索...</template>
        <template v-else>
          <div v-if="codeError" style="color: var(--warning-color, #d64545)">{{ codeError }}</div>
          <div v-else-if="codePath">{{ codePath }}</div>
          <div v-else>未找到 code 可执行路径（Windows: 可通过 `where.exe code` 手动确认）</div>
        </template>
      </div>
    </div>

    <div style="margin-top: 18px;">
      <a-typography-text strong>已打开过的项目列表：</a-typography-text>
      <div style="margin-top:8px">
        <template v-if="storageLoading">正在提取项目...</template>
        <template v-else>
          <div v-if="storageError" style="color: var(--warning-color, #d64545)">{{ storageError }}</div>
          <div v-else-if="projects.length > 0">
            <div style="margin-bottom: 12px">
              <div style="margin-bottom: 4px">共找到 {{ projects.length }} 个项目，来自 {{ projectSources.length }} 个编辑器：</div>
              <div style="font-size: 12px; color: #666">
                <span v-for="(source, idx) in projectSources" :key="idx" style="margin-right: 12px">
                  {{ source.editor }} ({{ source.projectCount }} 个)
                </span>
              </div>
            </div>
            <div v-for="(project, index) in projects" :key="index"
              style="padding: 8px 12px; background: var(--bg-color, #f5f5f5); margin-bottom: 4px; border-radius: 4px; font-size: 13px; word-break: break-all; cursor: pointer; transition: background 0.2s;"
              @mouseenter="e => e.target.style.background = '#e8e8e8'"
              @mouseleave="e => e.target.style.background = 'var(--bg-color, #f5f5f5)'">
              {{ project }}
            </div>
          </div>
          <div v-else>未找到任何项目</div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
h2 {
  margin: 0 0 8px 0;
}
</style>