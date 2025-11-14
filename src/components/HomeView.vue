<script setup>
import { computed } from 'vue';
import { useSettingsStore } from '../stores/settings';

const settingsStore = useSettingsStore();

const currentTheme = computed(() => settingsStore.theme.value);
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
  </div>
</template>

<style scoped>
h2 {
  margin: 0 0 8px 0;
}
</style>