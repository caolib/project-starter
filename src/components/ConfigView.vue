<script setup>

import { computed } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { useSettingsStore } from '../stores/settings'
import { ExportOutlined, ImportOutlined } from '@ant-design/icons-vue';

const settingsStore = useSettingsStore();

const theme = computed({
    get: () => settingsStore.theme.value,
    set: (val) => { settingsStore.theme.value = val }
});

// 主题选项
const themeOptions = [
    { label: '跟随系统', value: 'system' },
    { label: '浅色主题', value: 'light' },
    { label: '深色主题', value: 'dark' }
];

// 重置为默认配置
const resetConfig = () => {
    settingsStore.resetToDefault();
}

// 保存配置（显示提示，数据已自动持久化）
const saveData = () => {
    message.success("保存好了");
}

// 导出配置（仅导出 settings）
const exportConfig = () => {
    try {
        const configData = {
            version: '1.0.0',
            exportTime: new Date().toISOString(),
            settings: {
                theme: settingsStore.theme.value
            }
        };

        const result = window.services.exportConfig(configData, 'utools-plugin-template-config.json');
        if (result.success) {
            message.success(`配置已导出到: ${result.path}`);
        } else {
            if (result.message !== '用户取消保存') {
                message.error(`导出失败: ${result.message}`);
            }
        }
    } catch (error) {
        message.error(`导出配置失败: ${error.message}`);
    }
}

// 导入配置（仅导入 settings 部分）
const importConfig = () => {
    Modal.confirm({
        title: '确认导入',
        content: '导入配置将覆盖当前设置，是否继续？',
        okText: '确定',
        cancelText: '取消',
        onOk() {
            try {
                const result = window.services.importConfig();
                if (result.success) {
                    const config = result.data;
                    if (!config.settings) {
                        message.error('配置文件格式不正确');
                        return;
                    }

                    const s = config.settings;
                    if (s.theme !== undefined) settingsStore.setTheme(s.theme);

                    message.success(`配置已从 ${result.path} 导入成功`);
                } else {
                    if (result.message !== '用户取消选择') {
                        message.error(`导入失败: ${result.message}`);
                    }
                }
            } catch (error) {
                message.error(`导入配置失败: ${error.message}`);
            }
        }
    });
};

</script>

<template>
    <div class="config-view">
        <div class="config-row">
            <a-typography-text style="margin-right: 10px;">主题:</a-typography-text>
            <a-radio-group v-model:value="theme" button-style="solid">
                <a-radio-button v-for="option in themeOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                </a-radio-button>
            </a-radio-group>
        </div>

        <div class="config-row" style="gap: 10px;">
            <a-button type="default" @click="exportConfig">
                <ExportOutlined />
                导出配置
            </a-button>
            <a-button type="default" @click="importConfig">
                <ImportOutlined />
                导入配置
            </a-button>
        </div>

        <div class="config-row">
            <a-button type="primary" @click="saveData">保存</a-button>
            <a-popconfirm title="确定吗？" ok-text="Yes" cancel-text="我再想想" @confirm="resetConfig">
                <a-button danger>重置</a-button>
            </a-popconfirm>
        </div>
    </div>
</template>

<style scoped>
div.config-view {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
    flex-direction: column;
}

div.config-row {
    display: flex;
    align-items: center;
    padding: 10px;
    width: 80vw;
    gap: 10px;
}

.forbidden-item {
    color: gray;
}

.type-icon {
    margin-right: 8px;
}
</style>