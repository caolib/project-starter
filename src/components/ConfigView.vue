<script setup>

import { computed, ref, nextTick } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { useSettingsStore } from '../stores/settings'
import { ExportOutlined, ImportOutlined, SearchOutlined, FolderOpenOutlined } from '@ant-design/icons-vue';

const settingsStore = useSettingsStore();

const theme = computed({
    get: () => settingsStore.theme.value,
    set: (val) => { settingsStore.theme.value = val }
});

const editors = computed(() => settingsStore.editors.value);

// 搜索状态
const searching = ref({
    code: false,
    qoder: false,
    trae: false
});

const searchingAll = ref(false);

// 主题选项
const themeOptions = [
    { label: '跟随系统', value: 'system' },
    { label: '浅色主题', value: 'light' },
    { label: '深色主题', value: 'dark' }
];

// 搜索编辑器配置
const searchEditorConfig = async (editorKey) => {
    searching.value[editorKey] = true;

    // 强制UI更新，让loading状态立即显示
    await nextTick();

    // 使用setTimeout让UI有时间渲染
    setTimeout(async () => {
        try {
            // 搜索可执行文件路径
            let executablePath = '';
            if (window.services && typeof window.services.findCommandPath === 'function') {
                const cmdMap = { code: 'code', qoder: 'qoder', trae: 'trae' };
                const res = window.services.findCommandPath(cmdMap[editorKey]);
                if (res && res.success) {
                    executablePath = res.path || '';
                }
            }

            // 搜索 storage.json 路径
            let storagePath = '';
            if (window.services && typeof window.services.searchStorageJson === 'function') {
                const res = window.services.searchStorageJson();
                if (res && res.success && res.results.length > 0) {
                    // 根据编辑器名称匹配 storage.json 路径
                    const editorNameMap = { code: 'Code', qoder: 'Qoder', trae: 'Trae' };
                    const matchedPath = res.results.find(p => p.includes(`\\${editorNameMap[editorKey]}\\`));
                    if (matchedPath) {
                        storagePath = matchedPath;
                    }
                }
            }

            // 更新配置
            if (executablePath || storagePath) {
                settingsStore.setEditorConfig(editorKey, {
                    executablePath: executablePath || editors.value[editorKey].executablePath,
                    storagePath: storagePath || editors.value[editorKey].storagePath
                });
                message.success(`已找到 ${editors.value[editorKey].name} 的配置信息`);
            } else {
                message.warning(`未找到 ${editors.value[editorKey].name} 的配置信息`);
            }
        } catch (error) {
            message.error(`搜索失败: ${error.message}`);
        } finally {
            searching.value[editorKey] = false;
        }
    }, 100);
};

// 一键搜索所有编辑器配置
const searchAllEditors = async () => {
    searchingAll.value = true;

    // 强制UI更新
    await nextTick();

    setTimeout(async () => {
        try {
            const editorKeys = Object.keys(editors.value);

            // 依次调用每个编辑器的搜索函数
            for (const editorKey of editorKeys) {
                await searchEditorConfig(editorKey);
                // 每个编辑器搜索之间添加短暂延迟，让UI更新
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        } catch (error) {
            message.error(`批量搜索失败: ${error.message}`);
        } finally {
            searchingAll.value = false;
        }
    }, 100);
};

// 手动选择文件
const selectFile = (editorKey, type) => {
    try {
        const title = type === 'executable' ? '选择可执行文件' : '选择 storage.json 文件';
        const filters = type === 'executable'
            ? [{ name: '可执行文件', extensions: ['exe', 'cmd', 'bat'] }, { name: '所有文件', extensions: ['*'] }]
            : [{ name: 'JSON文件', extensions: ['json'] }, { name: '所有文件', extensions: ['*'] }];

        const openPath = window.utools.showOpenDialog({
            title,
            buttonLabel: '选择',
            filters,
            properties: ['openFile']
        });

        if (openPath && openPath.length > 0) {
            const filePath = openPath[0];
            const configKey = type === 'executable' ? 'executablePath' : 'storagePath';
            settingsStore.setEditorConfig(editorKey, {
                [configKey]: filePath
            });
            message.success('已选择文件');
        }
    } catch (error) {
        message.error(`选择文件失败: ${error.message}`);
    }
};

// 自定义图标
const selectIcon = (editorKey) => {
    try {
        const openPath = window.utools.showOpenDialog({
            title: '选择图标文件',
            buttonLabel: '选择',
            filters: [
                { name: '图片文件', extensions: ['png', 'jpg', 'jpeg', 'svg', 'ico'] },
                { name: '所有文件', extensions: ['*'] }
            ],
            properties: ['openFile']
        });

        if (openPath && openPath.length > 0) {
            const iconPath = openPath[0];
            settingsStore.setEditorConfig(editorKey, {
                icon: iconPath
            });
            message.success('图标已更新');
        }
    } catch (error) {
        message.error(`选择图标失败: ${error.message}`);
    }
};

// 重置为默认配置
const resetConfig = () => {
    settingsStore.resetToDefault();
}

// 保存配置（显示提示，数据已自动持久化）
const saveData = () => {
    message.success("保存好了");
}

// 导出配置
const exportConfig = () => {
    try {
        const configData = {
            version: '1.0.0',
            exportTime: new Date().toISOString(),
            settings: {
                theme: settingsStore.theme.value,
                editors: settingsStore.editors.value
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

// 导入配置
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
                    if (s.editors !== undefined) {
                        Object.keys(s.editors).forEach(key => {
                            settingsStore.setEditorConfig(key, s.editors[key]);
                        });
                    }

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

        <!-- 编辑器配置区域 -->
        <a-divider>编辑器配置</a-divider>

        <div class="config-row" style="justify-content: flex-end; padding-top: 0;">
            <a-button type="primary" size="large" :loading="searchingAll" @click="searchAllEditors">
                <template #icon>
                    <SearchOutlined />
                </template>
                一键搜索全部
            </a-button>
        </div>

        <div v-for="(editor, key) in editors" :key="key" class="editor-config-section">
            <div class="editor-header">
                <img :src="editor.icon" class="editor-icon" :alt="editor.name" />
                <a-typography-title :level="5" style="margin: 0;">{{ editor.name }}</a-typography-title>
                <a-button type="primary" size="small" :loading="searching[key]" @click="searchEditorConfig(key)">
                    <template #icon>
                        <SearchOutlined />
                    </template>
                    自动搜索
                </a-button>
            </div>

            <div class="editor-config-row">
                <a-typography-text style="min-width: 100px;">图标:</a-typography-text>
                <a-input :value="editor.icon" @update:value="(val) => settingsStore.setEditorConfig(key, { icon: val })"
                    placeholder="图标路径" style="flex: 1;" />
                <a-button @click="selectIcon(key)">
                    <FolderOpenOutlined />
                    选择
                </a-button>
            </div>

            <div class="editor-config-row">
                <a-typography-text style="min-width: 100px;">可执行文件:</a-typography-text>
                <a-input :value="editor.executablePath"
                    @update:value="(val) => settingsStore.setEditorConfig(key, { executablePath: val })"
                    placeholder="可执行文件路径 (如: C:\...\code.cmd)" style="flex: 1;" />
                <a-button @click="selectFile(key, 'executable')">
                    <FolderOpenOutlined />
                    选择
                </a-button>
            </div>

            <div class="editor-config-row">
                <a-typography-text style="min-width: 100px;">Storage 路径:</a-typography-text>
                <a-input :value="editor.storagePath"
                    @update:value="(val) => settingsStore.setEditorConfig(key, { storagePath: val })"
                    placeholder="storage.json 文件路径" style="flex: 1;" />
                <a-button @click="selectFile(key, 'storage')">
                    <FolderOpenOutlined />
                    选择
                </a-button>
            </div>
        </div>

        <a-divider />

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
    max-width: 1000px;
    margin: 0 auto;
}

div.config-row {
    display: flex;
    align-items: center;
    padding: 10px;
    width: 100%;
    gap: 10px;
}

.editor-config-section {
    width: 100%;
    padding: 16px;
    margin: 12px 0;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background: var(--bg-color, #fafafa);
}

.editor-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #e0e0e0;
}

.editor-icon {
    width: 32px;
    height: 32px;
    object-fit: contain;
}

.editor-config-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
}

.editor-config-row:last-child {
    margin-bottom: 0;
}

.forbidden-item {
    color: gray;
}

.type-icon {
    margin-right: 8px;
}
</style>