<script setup>
import { h } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { GithubOutlined, InfoCircleOutlined, BugOutlined } from '@ant-design/icons-vue'

const settingsStore = useSettingsStore()

const pluginName = 'Project Starter'
const pluginNameCN = '一个快速打开本地多种编辑器项目的工具'
const author = '孤独的Lonely'
const authorGithub = 'https://github.com/caolib'
const repoUrl = 'https://github.com/caolib/project-starter'
const issuesUrl = repoUrl + '/issues'

const openExternal = (url) => {
    try {
        if (window.utools && typeof window.utools.shellOpenExternal === 'function') {
            window.utools.shellOpenExternal(url)
        } else {
            window.open(url, '_blank')
        }
    } catch (e) {
        console.error('打开外部链接失败', e)
    }
}
</script>

<template>
    <div class="about-view">
        <a-card class="about-card" :bordered="true">
            <!-- Logo 和插件名 -->
            <div class="plugin-header">
                <img src="/logo.png" alt="logo" class="plugin-logo" />
                <div class="plugin-info">
                    <h2 class="plugin-name">{{ pluginName }}</h2>
                    <p class="plugin-name-cn">{{ pluginNameCN }}</p>
                </div>
            </div>

            <a-divider />

            <!-- 作者 -->
            <div class="author-section">
                <span class="label">作者：</span>
                <a-button type="link" @click="openExternal(authorGithub)" size="small">
                    {{ author }}
                </a-button>
            </div>

            <!-- 仓库和 Issue 按钮 -->
            <div class="links">
                <a-space>
                    <a-button type="primary" @click="openExternal(repoUrl)" :icon="h(GithubOutlined)">仓库地址</a-button>
                    <a-button type="default" @click="openExternal(issuesUrl)" :icon="h(BugOutlined)">Issues</a-button>
                </a-space>
            </div>
        </a-card>
    </div>
</template>
<style scoped>
.about-view {
    padding: 24px;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100%;
}

.about-card {
    max-width: 600px;
    width: 100%;
}

.plugin-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 8px;
}

.plugin-logo {
    width: 64px;
    height: 64px;
    border-radius: 12px;
}

.plugin-info {
    flex: 1;
}

.plugin-name {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
}

.plugin-name-cn {
    margin: 4px 0 0;
    color: #666;
    font-size: 14px;
}

:global([data-theme='dark']) .plugin-name-cn {
    color: #999;
}

.author-section {
    margin: 16px 0;
    display: flex;
    align-items: center;
}

.label {
    color: #666;
    font-size: 14px;
}

:global([data-theme='dark']) .label {
    color: #999;
}

.links {
    margin-top: 24px;
}
</style>
