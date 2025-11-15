<script setup>

import { computed, ref, nextTick } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { useSettingsStore } from '../stores/settings'
import { ExportOutlined, ImportOutlined, SearchOutlined, FolderOpenOutlined, PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons-vue';

const settingsStore = useSettingsStore();

const theme = computed({
    get: () => settingsStore.theme.value,
    set: (val) => { settingsStore.theme.value = val }
});

const editors = computed(() => settingsStore.editors.value);

// 添加/编辑编辑器的对话框
const editorModalVisible = ref(false);
const editorFormMode = ref('add'); // 'add' 或 'edit'
const currentEditingKey = ref('');
const editorForm = ref({
    name: '',
    icon: 'img/code.png',
    commandName: '',
    storageKeyword: '',
    executablePath: '',
    storagePath: ''
});

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
            const editor = editors.value[editorKey];

            // 搜索可执行文件路径
            let executablePath = '';
            if (window.services && typeof window.services.findCommandPath === 'function') {
                const commandName = editor.commandName || editorKey;
                console.log(`搜索命令: ${commandName}`);
                const res = window.services.findCommandPath(commandName);
                console.log('搜索结果:', res);

                if (res && res.success) {
                    executablePath = res.path || '';
                    if (res.all && res.all.length > 1) {
                        console.log(`找到多个匹配项:`, res.all);
                    }
                } else {
                    console.warn(`未找到命令 ${commandName}:`, res.message, res.details);
                }
            }

            // 搜索 storage.json 路径
            let storagePath = '';
            if (window.services && typeof window.services.searchStorageJson === 'function') {
                const res = window.services.searchStorageJson();
                if (res && res.success && res.results.length > 0) {
                    // 使用编辑器配置的 storageKeyword 来匹配
                    const keyword = editor.storageKeyword || editor.name;
                    console.log(`搜索 Storage 关键字: ${keyword}`);
                    const matchedPath = res.results.find(p => p.includes(`\\${keyword}\\`));
                    if (matchedPath) {
                        storagePath = matchedPath;
                        console.log(`找到 Storage 路径:`, storagePath);
                    } else {
                        console.log(`未匹配到包含 "${keyword}" 的路径，所有结果:`, res.results);
                    }
                }
            }

            // 更新配置
            if (executablePath || storagePath) {
                settingsStore.setEditorConfig(editorKey, {
                    executablePath: executablePath || editor.executablePath,
                    storagePath: storagePath || editor.storagePath
                });

                if (executablePath && storagePath) {
                    message.success(`已找到 ${editor.name} 的完整配置信息`);
                } else if (executablePath) {
                    message.success(`已找到 ${editor.name} 的可执行文件路径`);
                } else {
                    message.success(`已找到 ${editor.name} 的 Storage 路径`);
                }
            } else {
                message.warning(`未找到 ${editor.name} 的配置信息，请检查命令名称是否正确`);
            }
        } catch (error) {
            console.error('搜索失败:', error);
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

// 打开添加编辑器对话框
const openAddEditorModal = () => {
    editorFormMode.value = 'add';
    editorForm.value = {
        name: '',
        icon: 'img/code.png',
        commandName: '',
        storageKeyword: '',
        executablePath: '',
        storagePath: ''
    };
    editorModalVisible.value = true;
};

// 打开编辑编辑器对话框
const openEditEditorModal = (editorKey) => {
    editorFormMode.value = 'edit';
    currentEditingKey.value = editorKey;
    const editor = editors.value[editorKey];
    editorForm.value = {
        name: editor.name,
        icon: editor.icon,
        commandName: editor.commandName || '',
        storageKeyword: editor.storageKeyword || '',
        executablePath: editor.executablePath,
        storagePath: editor.storagePath
    };
    editorModalVisible.value = true;
};

// 保存编辑器
const saveEditor = () => {
    if (!editorForm.value.name.trim()) {
        message.warning('请输入编辑器名称');
        return;
    }

    if (editorFormMode.value === 'add') {
        settingsStore.addEditor(editorForm.value);
        message.success('编辑器已添加');
    } else {
        settingsStore.updateEditor(currentEditingKey.value, editorForm.value);
        message.success('编辑器已更新');
    }

    editorModalVisible.value = false;
};

// 删除编辑器
const deleteEditor = (editorKey) => {
    Modal.confirm({
        title: '确认删除',
        content: `确定要删除编辑器 "${editors.value[editorKey].name}" 吗？`,
        okText: '删除',
        okType: 'danger',
        cancelText: '取消',
        onOk() {
            settingsStore.removeEditor(editorKey);
            message.success('编辑器已删除');
        }
    });
};

// 在对话框中选择文件
const selectFileInModal = (type) => {
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
            if (type === 'executable') {
                editorForm.value.executablePath = openPath[0];
            } else {
                editorForm.value.storagePath = openPath[0];
            }
            message.success('已选择文件');
        }
    } catch (error) {
        message.error(`选择文件失败: ${error.message}`);
    }
};

// 在对话框中选择图标
const selectIconInModal = () => {
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
            editorForm.value.icon = openPath[0];
            message.success('图标已选择');
        }
    } catch (error) {
        message.error(`选择图标失败: ${error.message}`);
    }
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

        <div class="config-row" style="justify-content: space-between; padding-top: 0;">
            <a-button type="primary" :loading="searchingAll" @click="searchAllEditors">
                <template #icon>
                    <SearchOutlined />
                </template>
                搜索全部
            </a-button>
            <a-button type="dashed" @click="openAddEditorModal">
                <template #icon>
                    <PlusOutlined />
                </template>
                添加编辑器
            </a-button>
        </div>

        <div v-for="(editor, key) in editors" :key="key" class="editor-config-section">
            <div class="editor-header">
                <img :src="editor.icon" class="editor-icon" :alt="editor.name" />
                <a-typography-title :level="5" style="margin: 0; flex: 1;">{{ editor.name }}</a-typography-title>
                <a-button type="link" size="small" @click="openEditEditorModal(key)">
                    <template #icon>
                        <EditOutlined />
                    </template>
                    编辑
                </a-button>
                <a-button type="primary" size="small" :loading="searching[key]" @click="searchEditorConfig(key)">
                    <template #icon>
                        <SearchOutlined />
                    </template>
                    自动搜索
                </a-button>
                <a-button danger size="small" @click="deleteEditor(key)">
                    <template #icon>
                        <DeleteOutlined />
                    </template>
                    删除
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
                <a-typography-text style="min-width: 100px;">执行文件:</a-typography-text>
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

        <!-- 添加/编辑编辑器对话框 -->
        <a-modal v-model:open="editorModalVisible" :title="editorFormMode === 'add' ? '添加编辑器' : '编辑编辑器'"
            @ok="saveEditor" ok-text="保存" cancel-text="取消" width="600px">
            <a-form :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
                <a-form-item label="编辑器名称" required>
                    <a-input v-model:value="editorForm.name" placeholder="如: Cursor" />
                </a-form-item>

                <a-form-item label="命令名称">
                    <a-input v-model:value="editorForm.commandName" placeholder="用于自动搜索的命令名 (如: cursor)" />
                    <template #extra>
                        <span style="font-size: 12px; color: #999;">
                            自动搜索时使用此命令名在 PATH 中查找可执行文件
                        </span>
                    </template>
                </a-form-item>

                <a-form-item label="Storage 关键字">
                    <a-input v-model:value="editorForm.storageKeyword"
                        placeholder="用于匹配 storage.json 的关键字 (如: Cursor)" />
                    <template #extra>
                        <span style="font-size: 12px; color: #999;">
                            自动搜索时用于匹配 storage.json 路径中的文件夹名
                        </span>
                    </template>
                </a-form-item>

                <a-form-item label="图标路径">
                    <a-input v-model:value="editorForm.icon" placeholder="图标文件路径">
                        <template #suffix>
                            <a-button type="link" size="small" @click="selectIconInModal">
                                <FolderOpenOutlined />
                            </a-button>
                        </template>
                    </a-input>
                </a-form-item>

                <a-form-item label="可执行文件">
                    <a-input v-model:value="editorForm.executablePath" placeholder="可执行文件路径">
                        <template #suffix>
                            <a-button type="link" size="small" @click="selectFileInModal('executable')">
                                <FolderOpenOutlined />
                            </a-button>
                        </template>
                    </a-input>
                </a-form-item>

                <a-form-item label="Storage 路径">
                    <a-input v-model:value="editorForm.storagePath" placeholder="storage.json 文件路径">
                        <template #suffix>
                            <a-button type="link" size="small" @click="selectFileInModal('storage')">
                                <FolderOpenOutlined />
                            </a-button>
                        </template>
                    </a-input>
                </a-form-item>
            </a-form>
        </a-modal>
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
    margin: 5px 0;
    border-radius: 8px;
    border: 1px solid var(--border-color, #e8e8e8);
}

.editor-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border-color, #e0e0e0);
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