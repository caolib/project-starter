<script setup>
import { onMounted, ref, h, watch, computed } from 'vue';
import { ConfigProvider, Layout, Menu, theme as antTheme } from 'ant-design-vue';
import { FileTextOutlined, SettingOutlined } from '@ant-design/icons-vue';
import HomeView from './components/HomeView.vue';
import ConfigView from './components/ConfigView.vue';
import { useSettingsStore } from './stores/settings';

const { Header, Content } = Layout;

const currentView = ref(['home']);
const enterAction = ref({});
const settingsStore = useSettingsStore();

// 主题相关
const systemDarkMode = ref(window.matchMedia('(prefers-color-scheme: dark)').matches);

// 计算实际使用的主题
const actualTheme = computed(() => {
  if (settingsStore.theme.value === 'system') {
    return systemDarkMode.value ? 'dark' : 'light';
  }
  return settingsStore.theme.value;
});

// Ant Design 主题配置
const themeConfig = computed(() => {
  return {
    algorithm: actualTheme.value === 'dark' ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm
  };
});

// 应用主题到document
const applyTheme = () => {
  document.documentElement.setAttribute('data-theme', actualTheme.value);
};

// 监听主题变化并重新应用
watch(actualTheme, () => {
  applyTheme();
});

const menuItems = [
  {
    key: 'home',
    icon: () => h(FileTextOutlined),
    label: '主页',
  },
  {
    key: 'config',
    icon: () => h(SettingOutlined),
    label: '配置',
  },
];

// Note: 功能命令需要在具体插件模板中自行注册，模板保留主题与配置逻辑

onMounted(() => {
  // 应用初始主题
  applyTheme();

  // 监听系统主题变化
  const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleThemeChange = (e) => {
    systemDarkMode.value = e.matches;
  };
  darkModeMediaQuery.addEventListener('change', handleThemeChange);

  window.utools.onPluginEnter((action) => {
    // 模板: 将进入动作传递给主页，供自定义逻辑使用
    enterAction.value = action;
  });

  window.utools.onPluginOut((isKill) => {
    currentView.value = ['home'];
  });
});


const handleMenuClick = ({ key }) => {
  currentView.value = [key];
};
</script>

<template>
  <ConfigProvider :theme="themeConfig">
    <Layout style="min-height: 100vh;">
      <Header :style="{
        display: 'flex',
        alignItems: 'center',
        padding: '0',
        lineHeight: '32px',
        height: '32px',

      }">
        <Menu v-model:selectedKeys="currentView" mode="horizontal" :items="menuItems" @click="handleMenuClick"
          style="flex: 1; min-width: 0;" :theme="actualTheme === 'dark' ? 'dark' : 'light'" />
      </Header>
      <Content :style="{ background: actualTheme === 'dark' ? '#282c34' : '#fff', padding: '0', minHeight: '0' }">
        <HomeView v-if="currentView[0] === 'home'" :enterAction="enterAction" />
        <ConfigView v-else-if="currentView[0] === 'config'" />
      </Content>
    </Layout>
  </ConfigProvider>
</template>

<style scoped>
:deep(.ant-menu-dark) {
  background: var(--bg-color) !important;
}
</style>