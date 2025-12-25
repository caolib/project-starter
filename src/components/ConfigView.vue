<script setup>

import { computed, ref, nextTick } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { useSettingsStore } from '../stores/settings'
import { ExportOutlined, ImportOutlined, SearchOutlined, FolderOpenOutlined, PlusOutlined, DeleteOutlined, EditOutlined, ReloadOutlined } from '@ant-design/icons-vue';

const settingsStore = useSettingsStore();

const theme = computed({
    get: () => settingsStore.theme.value,
    set: (val) => { settingsStore.theme.value = val }
});

const hideMissingProjects = computed({
    get: () => settingsStore.hideMissingProjects.value,
    set: (val) => { settingsStore.hideMissingProjects.value = val }
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
    storagePath: '',
    recentProjectsPath: '',
    editorType: '' // 用户必须手动选择
});

// 搜索状态
const searching = ref({
    code: false,
    qoder: false,
    trae: false,
    idea: false,
    studio: false
});

const searchingAll = ref(false);

// 主题选项
const themeOptions = [
    { label: '跟随系统', value: 'system' },
    { label: '浅色主题', value: 'light' },
    { label: '深色主题', value: 'dark' }
];

// 推断 .exe 文件路径（从 .cmd 文件推断）
const inferExePathFromCmd = (cmdPath, commandName) => {
    try {
        // 示例：C:\software\tools\cursor\resources\app\bin\cursor.cmd
        // 推断路径：C:\software\tools\cursor\Cursor.exe

        // 获取基名
        const fileName = cmdPath.substring(cmdPath.lastIndexOf('\\') + 1);
        const baseName = fileName.substring(0, fileName.lastIndexOf('.'));

        console.log('CMD 文件基名:', baseName);

        // 分割路径，逐级向上生成候选路径
        // 从 cmd 所在目录开始，逐级向上查找 .exe
        const pathParts = cmdPath.replace(/\//g, '\\').split('\\');
        // 移除文件名，保留目录部分
        pathParts.pop();

        const inferredPaths = [];

        // 从当前目录往上遍历，逐级生成候选路径
        for (let i = pathParts.length - 1; i >= 0; i--) {
            const currentPath = pathParts.slice(0, i + 1).join('\\');
            // 尝试大写首字母的版本（如 Cursor.exe）
            inferredPaths.push(currentPath + '\\' + baseName.charAt(0).toUpperCase() + baseName.slice(1) + '.exe');
            // 尝试小写版本（如 cursor.exe）
            inferredPaths.push(currentPath + '\\' + baseName + '.exe');
        }

        console.log('尝试推断的 .exe 路径:', inferredPaths);

        // 返回所有可能的路径列表，由调用方逐个检查
        return inferredPaths;
    } catch (error) {
        console.error('推断 .exe 路径失败:', error);
        return [];
    }
};

// 推断 JetBrains 编辑器的 64 位可执行文件路径（从 .bat 文件推断）
const inferExePathFromBat = (batPath, commandName) => {
    try {
        // 示例：C:\Users\caolib\AppData\Local\Programs\IntelliJ IDEA Ultimate\bin\idea.bat
        // 推断路径：C:\Users\caolib\AppData\Local\Programs\IntelliJ IDEA Ultimate\bin\idea64.exe

        // 获取基名
        const fileName = batPath.substring(batPath.lastIndexOf('\\') + 1);
        const baseName = fileName.substring(0, fileName.lastIndexOf('.'));
        const dir = batPath.substring(0, batPath.lastIndexOf('\\'));

        console.log('BAT 文件基名:', baseName, '目录:', dir);

        // JetBrains 编辑器通常在同级目录下有 64 位版本
        // 例如：idea.bat -> idea64.exe, pycharm.bat -> pycharm64.exe
        const inferredPaths = [
            dir + '\\' + baseName + '64.exe',  // 小写 + 64 + .exe (如 idea64.exe)
            dir + '\\' + baseName.charAt(0).toUpperCase() + baseName.slice(1) + '64.exe', // 大写首字母 + 64 + .exe
        ];

        console.log('尝试推断的 JetBrains .exe 路径:', inferredPaths);

        return inferredPaths;
    } catch (error) {
        console.error('推断 JetBrains .exe 路径失败:', error);
        return [];
    }
};

// 搜索编辑器配置
const searchEditorConfig = async (editorKey) => {
    searching.value[editorKey] = true;

    // 强制UI更新，让loading状态立即显示
    await nextTick();

    // 使用setTimeout让UI有时间渲染
    setTimeout(async () => {
        try {
            const editor = editors.value[editorKey];
            console.log(`======== 开始搜索编辑器: ${editorKey} ========`);
            console.log('编辑器配置:', JSON.stringify(editor, null, 2));
            const editorType = editor.editorType || 'vscode';
            console.log('编辑器类型:', editorType);

            if (!editorType || editorType === 'vscode') {
                console.warn('警告: 编辑器类型未设置或为vscode,JetBrains编辑器应设置为jetbrains');
            }

            // 搜索可执行文件路径
            let executablePath = '';
            let iconPath = '';
            if (window.services && typeof window.services.findCommandPath === 'function') {
                const commandName = editor.commandName || editorKey;
                console.log(`搜索命令: ${commandName}`);
                const res = window.services.findCommandPath(commandName);
                console.log('搜索结果:', res);

                if (res && res.success) {
                    // 如果有多个匹配项，根据编辑器类型选择最合适的
                    if (res.all && res.all.length > 1) {
                        console.log(`找到多个匹配项:`, res.all);
                        const cmdFile = res.all.find(p => p.toLowerCase().endsWith('.cmd'));
                        const batFile = res.all.find(p => p.toLowerCase().endsWith('.bat'));
                        const exeFile = res.all.find(p => p.toLowerCase().endsWith('.exe'));

                        if (editorType === 'jetbrains') {
                            // JetBrains 编辑器：优先 .bat，并尝试推断 64.exe
                            if (batFile) {
                                console.log('JetBrains 类型编辑器，优先使用 .bat 并尝试推断 64.exe...');
                                const inferredExePaths = inferExePathFromBat(batFile, editor.commandName || editorKey);
                                if (inferredExePaths && inferredExePaths.length > 0 && window.services && typeof window.services.pathExists === 'function') {
                                    let foundExePath = null;
                                    for (const exePath of inferredExePaths) {
                                        if (window.services.pathExists(exePath)) {
                                            foundExePath = exePath;
                                            console.log('推断的 64.exe 文件存在，使用:', foundExePath);
                                            break;
                                        }
                                    }
                                    if (foundExePath) {
                                        executablePath = foundExePath;
                                    } else {
                                        console.log('未找到推断的 64.exe 文件，改用 .bat 文件');
                                        executablePath = batFile;
                                        console.log('选择了 .bat 文件:', executablePath);
                                    }
                                } else {
                                    executablePath = batFile;
                                    console.log('无法推断 64.exe 或缺少 pathExists 服务，选择 .bat 文件:', executablePath);
                                }
                            } else if (exeFile) {
                                // 没有 .bat，但有 .exe
                                executablePath = exeFile;
                                console.log('选择了 .exe 文件:', executablePath);
                            } else if (cmdFile) {
                                // 最后才用 .cmd
                                executablePath = cmdFile;
                                console.log('选择了 .cmd 文件:', executablePath);
                            } else {
                                executablePath = res.path || '';
                                console.log('使用默认路径:', executablePath);
                            }
                        } else {
                            // VSCode 或其他编辑器：优先 .cmd（并尝试推断 .exe）
                            if (cmdFile) {
                                console.log('VSCode 类型编辑器，尝试推断 .exe 路径...');
                                const inferredExePaths = inferExePathFromCmd(cmdFile, editor.commandName || editorKey);
                                if (inferredExePaths && inferredExePaths.length > 0 && window.services && typeof window.services.pathExists === 'function') {
                                    let foundExePath = null;
                                    for (const exePath of inferredExePaths) {
                                        if (window.services.pathExists(exePath)) {
                                            foundExePath = exePath;
                                            console.log('推断的 .exe 文件存在，使用:', foundExePath);
                                            break;
                                        }
                                    }
                                    if (foundExePath) {
                                        executablePath = foundExePath;
                                    } else {
                                        console.log('未找到推断的 .exe 文件，改用 .cmd 文件');
                                        executablePath = cmdFile;
                                        console.log('选择了 .cmd 文件:', executablePath);
                                    }
                                } else {
                                    executablePath = cmdFile;
                                    console.log('无法推断 .exe 路径或缺少 pathExists 服务，选择 .cmd 文件:', executablePath);
                                }
                            } else if (batFile) {
                                executablePath = batFile;
                                console.log('选择了 .bat 文件:', executablePath);
                            } else if (exeFile) {
                                executablePath = exeFile;
                                console.log('选择了 .exe 文件:', executablePath);
                            } else {
                                executablePath = res.path || '';
                                console.log('使用默认路径:', executablePath);
                            }
                        }
                    } else {
                        executablePath = res.path || '';
                    }

                    // 使用 utools.getFileIcon 获取图标（自动从 exe 提取）
                    if (executablePath && window.utools && typeof window.utools.getFileIcon === 'function') {
                        try {
                            const iconBase64 = window.utools.getFileIcon(executablePath);
                            if (iconBase64) {
                                iconPath = iconBase64; // Base64 格式的图标
                                console.log('已获取图标 (base64)');
                            }
                        } catch (e) {
                            console.warn('获取图标失败:', e);
                        }
                    }
                } else {
                    console.warn(`未找到命令 ${commandName}:`, res.message, res.details);
                }
            }

            // 根据编辑器类型搜索项目文件
            let projectFilePath = '';

            if (editorType === 'vscode') {
                // VSCode 系列：搜索 storage.json
                if (window.services && typeof window.services.searchStorageJson === 'function') {
                    const res = window.services.searchStorageJson();
                    if (res && res.success && res.results.length > 0) {
                        const keyword = editor.storageKeyword || editor.name;
                        console.log(`搜索 Storage 关键字: ${keyword}`);
                        const matchedPath = res.results.find(p => {
                            const lowerPath = p.toLowerCase();
                            const lowerKeyword = keyword.toLowerCase();
                            return lowerPath.includes(`\\${lowerKeyword}\\`);
                        });
                        if (matchedPath) {
                            projectFilePath = matchedPath;
                            console.log(`找到 Storage 路径:`, projectFilePath);
                        } else {
                            console.log(`未匹配到包含 "${keyword}" 的路径，所有结果:`, res.results);
                        }
                    }
                }
            } else if (editorType === 'jetbrains') {
                // JetBrains 系列：搜索 recentProjects.xml
                console.log('开始搜索 JetBrains recentProjects.xml...');
                if (window.services && typeof window.services.searchRecentProjectsXml === 'function') {
                    const res = window.services.searchRecentProjectsXml();
                    console.log('searchRecentProjectsXml 返回结果:', res);
                    if (res && res.success && res.results.length > 0) {
                        const keyword = editor.storageKeyword || editor.name;
                        console.log(`搜索 RecentProjects 关键字: ${keyword}`);
                        console.log('所有找到的文件:', res.results);
                        // 不区分大小写匹配路径中的关键字
                        const matchedPath = res.results.find(p => {
                            const lowerPath = p.toLowerCase();
                            const lowerKeyword = keyword.toLowerCase();
                            return lowerPath.includes(`\\${lowerKeyword}\\`) || lowerPath.includes(lowerKeyword);
                        });
                        if (matchedPath) {
                            projectFilePath = matchedPath;
                            console.log(`找到 RecentProjects 路径:`, projectFilePath);
                        } else {
                            console.log(`未匹配到包含 "${keyword}" 的路径，所有结果:`, res.results);
                        }
                    } else {
                        console.log('searchRecentProjectsXml 未找到文件或失败');
                    }
                } else {
                    console.error('window.services.searchRecentProjectsXml 函数不存在');
                }
            }

            // 更新配置
            const updateData = {
                executablePath: executablePath || editor.executablePath
            };

            if (iconPath) {
                updateData.icon = iconPath;
            }

            if (editorType === 'vscode') {
                updateData.storagePath = projectFilePath || editor.storagePath;
            } else if (editorType === 'jetbrains') {
                updateData.recentProjectsPath = projectFilePath || editor.recentProjectsPath;
            }

            console.log('准备更新配置:', updateData);
            console.log('projectFilePath:', projectFilePath);
            console.log('executablePath:', executablePath);
            console.log('iconPath:', iconPath);

            if (executablePath || projectFilePath || iconPath) {
                settingsStore.setEditorConfig(editorKey, updateData);
                console.log('更新后的编辑器配置:', editors.value[editorKey]);

                const foundItems = [];
                if (executablePath) foundItems.push('可执行文件');
                if (projectFilePath) foundItems.push(editorType === 'vscode' ? 'Storage 路径' : 'RecentProjects 路径');
                if (iconPath) foundItems.push('图标');

                message.success(`已找到 ${editor.name} 的${foundItems.join('、')}`);
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
        const title = type === 'executable' ? '选择可执行文件'
            : type === 'recentProjects' ? '选择 recentProjects.xml 文件'
                : '选择 storage.json 文件';
        const filters = type === 'executable'
            ? [{ name: '可执行文件', extensions: ['exe', 'cmd', 'bat'] }, { name: '所有文件', extensions: ['*'] }]
            : type === 'recentProjects'
                ? [{ name: 'XML文件', extensions: ['xml'] }, { name: '所有文件', extensions: ['*'] }]
                : [{ name: 'JSON文件', extensions: ['json'] }, { name: '所有文件', extensions: ['*'] }];

        const openPath = window.utools.showOpenDialog({
            title,
            buttonLabel: '选择',
            filters,
            properties: ['openFile']
        });

        if (openPath && openPath.length > 0) {
            const filePath = openPath[0];
            const configKey = type === 'executable' ? 'executablePath'
                : type === 'recentProjects' ? 'recentProjectsPath'
                    : 'storagePath';
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

// 重置所有编辑器为默认
const resetEditors = () => {
    Modal.confirm({
        title: '确认重置编辑器配置',
        content: '此操作仅重置编辑器列表与配置为默认值，其他设置（如主题）不受影响。',
        okText: '重置',
        cancelText: '取消',
        okType: 'danger',
        onOk() {
            try {
                settingsStore.resetEditorsToDefault();
                message.success('已重置编辑器配置为默认');
            } catch (e) {
                message.error(`重置失败: ${e.message}`);
            }
        }
    });
}

// 导出配置
const exportConfig = () => {
    try {
        const configData = {
            settings: {
                theme: settingsStore.theme.value,
                hideMissingProjects: settingsStore.hideMissingProjects.value,
                editors: settingsStore.editors.value
            }
        };

        // 生成包含日期的文件名 YYYYMMDD 格式
        const now = new Date();
        const dateStr = now.getFullYear() +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0');
        const defaultFileName = `project-starter-${dateStr}.json`;

        const result = window.services.exportConfig(configData, defaultFileName);
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
                    if (s.hideMissingProjects !== undefined) settingsStore.hideMissingProjects.value = !!s.hideMissingProjects;
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
        storagePath: '',
        recentProjectsPath: '',
        editorType: '' // 用户必须手动选择
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
        storagePath: editor.storagePath || '',
        recentProjectsPath: editor.recentProjectsPath || '',
        editorType: editor.editorType || 'vscode'
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
        const title = type === 'executable' ? '选择可执行文件'
            : type === 'recentProjects' ? '选择 recentProjects.xml 文件'
                : '选择 storage.json 文件';
        const filters = type === 'executable'
            ? [{ name: '可执行文件', extensions: ['exe', 'cmd', 'bat'] }, { name: '所有文件', extensions: ['*'] }]
            : type === 'recentProjects'
                ? [{ name: 'XML文件', extensions: ['xml'] }, { name: '所有文件', extensions: ['*'] }]
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
            } else if (type === 'recentProjects') {
                editorForm.value.recentProjectsPath = openPath[0];
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

// 在模态框中搜索编辑器配置
const searchEditorConfigInModal = async () => {
    // 检查必填字段
    if (!editorForm.value.commandName.trim()) {
        message.warning('请先输入命令名称');
        return;
    }

    if (!editorForm.value.editorType) {
        message.warning('请先选择编辑器类型');
        return;
    }

    // 将配置路径关键字设置为命令名称的值
    editorForm.value.storageKeyword = editorForm.value.commandName;

    // 搜索可执行文件路径
    let executablePath = '';
    let iconPath = '';
    try {
        if (window.services && typeof window.services.findCommandPath === 'function') {
            const commandName = editorForm.value.commandName;
            console.log(`搜索命令: ${commandName}`);
            const res = window.services.findCommandPath(commandName);
            console.log('搜索结果:', res);

            if (res && res.success) {
                // 如果有多个匹配项，根据编辑器类型选择最合适的
                if (res.all && res.all.length > 1) {
                    console.log(`找到多个匹配项:`, res.all);
                    const cmdFile = res.all.find(p => p.toLowerCase().endsWith('.cmd'));
                    const batFile = res.all.find(p => p.toLowerCase().endsWith('.bat'));
                    const exeFile = res.all.find(p => p.toLowerCase().endsWith('.exe'));

                    if (editorForm.value.editorType === 'jetbrains') {
                        // JetBrains 编辑器：优先 .bat，并尝试推断 64.exe
                        if (batFile) {
                            console.log('JetBrains 类型编辑器，优先使用 .bat 并尝试推断 64.exe...');
                            const inferredExePaths = inferExePathFromBat(batFile, commandName);
                            if (inferredExePaths && inferredExePaths.length > 0 && window.services && typeof window.services.pathExists === 'function') {
                                let foundExePath = null;
                                for (const exePath of inferredExePaths) {
                                    if (window.services.pathExists(exePath)) {
                                        foundExePath = exePath;
                                        console.log('推断的 64.exe 文件存在，使用:', foundExePath);
                                        break;
                                    }
                                }
                                if (foundExePath) {
                                    executablePath = foundExePath;
                                } else {
                                    console.log('未找到推断的 64.exe 文件，改用 .bat 文件');
                                    executablePath = batFile;
                                    console.log('选择了 .bat 文件:', executablePath);
                                }
                            } else {
                                executablePath = batFile;
                                console.log('无法推断 64.exe 或缺少 pathExists 服务，选择 .bat 文件:', executablePath);
                            }
                        } else if (exeFile) {
                            // 没有 .bat，但有 .exe
                            executablePath = exeFile;
                            console.log('选择了 .exe 文件:', executablePath);
                        } else if (cmdFile) {
                            // 最后才用 .cmd
                            executablePath = cmdFile;
                            console.log('选择了 .cmd 文件:', executablePath);
                        } else {
                            executablePath = res.path || '';
                            console.log('使用默认路径:', executablePath);
                        }
                    } else {
                        // VSCode 或其他编辑器：优先 .cmd（并尝试推断 .exe）
                        if (cmdFile) {
                            console.log('VSCode 类型编辑器，尝试推断 .exe 路径...');
                            const inferredExePaths = inferExePathFromCmd(cmdFile, commandName);
                            if (inferredExePaths && inferredExePaths.length > 0 && window.services && typeof window.services.pathExists === 'function') {
                                let foundExePath = null;
                                for (const exePath of inferredExePaths) {
                                    if (window.services.pathExists(exePath)) {
                                        foundExePath = exePath;
                                        console.log('推断的 .exe 文件存在，使用:', foundExePath);
                                        break;
                                    }
                                }
                                if (foundExePath) {
                                    executablePath = foundExePath;
                                } else {
                                    console.log('未找到推断的 .exe 文件，改用 .cmd 文件');
                                    executablePath = cmdFile;
                                }
                            } else {
                                executablePath = cmdFile;
                            }
                        } else if (batFile) {
                            executablePath = batFile;
                            console.log('选择了 .bat 文件:', executablePath);
                        } else if (exeFile) {
                            executablePath = exeFile;
                            console.log('选择了 .exe 文件:', executablePath);
                        } else {
                            executablePath = res.path || '';
                            console.log('使用默认路径:', executablePath);
                        }
                    }
                } else {
                    executablePath = res.path || '';
                }

                // 使用 utools.getFileIcon 获取图标（自动从 exe 提取）
                if (executablePath && window.utools && typeof window.utools.getFileIcon === 'function') {
                    try {
                        const iconBase64 = window.utools.getFileIcon(executablePath);
                        if (iconBase64) {
                            iconPath = iconBase64;
                            console.log('已获取图标 (base64)');
                        }
                    } catch (e) {
                        console.warn('获取图标失败:', e);
                    }
                }
            } else {
                console.warn(`未找到命令 ${commandName}:`, res.message, res.details);
                message.warning(`未找到命令 ${commandName}`);
                return;
            }
        }

        // 根据编辑器类型搜索项目文件
        let projectFilePath = '';

        if (editorForm.value.editorType === 'vscode') {
            // VSCode 系列：搜索 storage.json
            if (window.services && typeof window.services.searchStorageJson === 'function') {
                const res = window.services.searchStorageJson();
                if (res && res.success && res.results.length > 0) {
                    const keyword = editorForm.value.storageKeyword;
                    console.log(`搜索 Storage 关键字: ${keyword}`);
                    const matchedPath = res.results.find(p => {
                        const lowerPath = p.toLowerCase();
                        const lowerKeyword = keyword.toLowerCase();
                        return lowerPath.includes(`\\${lowerKeyword}\\`);
                    });
                    if (matchedPath) {
                        projectFilePath = matchedPath;
                        console.log(`找到 Storage 路径:`, projectFilePath);
                    } else {
                        console.log(`未匹配到包含 "${keyword}" 的路径，所有结果:`, res.results);
                    }
                }
            }
        } else if (editorForm.value.editorType === 'jetbrains') {
            // JetBrains 系列：搜索 recentProjects.xml
            console.log('开始搜索 JetBrains recentProjects.xml...');
            if (window.services && typeof window.services.searchRecentProjectsXml === 'function') {
                const res = window.services.searchRecentProjectsXml();
                console.log('searchRecentProjectsXml 返回结果:', res);
                if (res && res.success && res.results.length > 0) {
                    const keyword = editorForm.value.storageKeyword;
                    console.log(`搜索 RecentProjects 关键字: ${keyword}`);
                    console.log('所有找到的文件:', res.results);
                    const matchedPath = res.results.find(p => {
                        const lowerPath = p.toLowerCase();
                        const lowerKeyword = keyword.toLowerCase();
                        return lowerPath.includes(`\\${lowerKeyword}\\`) || lowerPath.includes(lowerKeyword);
                    });
                    if (matchedPath) {
                        projectFilePath = matchedPath;
                        console.log(`找到 RecentProjects 路径:`, projectFilePath);
                    } else {
                        console.log(`未匹配到包含 "${keyword}" 的路径，所有结果:`, res.results);
                    }
                } else {
                    console.log('searchRecentProjectsXml 未找到文件或失败');
                }
            } else {
                console.error('window.services.searchRecentProjectsXml 函数不存在');
            }
        }

        // 更新表单数据
        if (executablePath) {
            editorForm.value.executablePath = executablePath;
        }

        if (iconPath) {
            editorForm.value.icon = iconPath;
        }

        if (editorForm.value.editorType === 'vscode') {
            if (projectFilePath) {
                editorForm.value.storagePath = projectFilePath;
            }
        } else if (editorForm.value.editorType === 'jetbrains') {
            if (projectFilePath) {
                editorForm.value.recentProjectsPath = projectFilePath;
            }
        }

        // 显示成功消息
        const foundItems = [];
        if (executablePath) foundItems.push('可执行文件');
        if (projectFilePath) foundItems.push(editorForm.value.editorType === 'vscode' ? 'Storage 路径' : 'RecentProjects 路径');
        if (iconPath) foundItems.push('图标');

        if (foundItems.length > 0) {
            message.success(`已自动填充: ${foundItems.join('、')}`);
        } else {
            message.warning(`未找到相关配置信息，请手动填充`);
        }
    } catch (error) {
        console.error('搜索失败:', error);
        message.error(`搜索失败: ${error.message}`);
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

        <div class="config-row" style="margin-top: 8px;">
            <a-typography-text style="margin-right: 10px;">如果项目对应的目录已经不存在，则不显示该项目</a-typography-text>
            <a-switch v-model:checked="hideMissingProjects" />
        </div>

        <!-- 编辑器配置区域 -->
        <a-divider>编辑器配置</a-divider>

        <div class="config-row" style="justify-content: space-between; padding-top: 0;">
            <a-button type="primary" :loading="searchingAll" @click="searchAllEditors">
                <template #icon>
                    <SearchOutlined />
                </template>
                搜索填充全部
            </a-button>
            <div style="display:flex; gap:8px;">
                <a-button danger @click="resetEditors">
                    <template #icon>
                        <ReloadOutlined />
                    </template>
                    重置编辑器设置
                </a-button>
                <a-button type="dashed" @click="openAddEditorModal">
                    <template #icon>
                        <PlusOutlined />
                    </template>
                    添加编辑器
                </a-button>
            </div>
        </div>

        <div v-for="(editor, key) in editors" :key="key" class="editor-config-section">
            <div class="editor-header">
                <img :src="editor.icon" class="editor-icon" :alt="editor.name" />
                <a-typography-title :level="5" style="margin: 0; flex: 1;">{{ editor.name }}</a-typography-title>
                <a-button size="small" @click="openEditEditorModal(key)">
                    <template #icon>
                        <EditOutlined />
                    </template>
                    编辑
                </a-button>
                <a-button type="primary" size="small" :loading="searching[key]" @click="searchEditorConfig(key)">
                    <template #icon>
                        <SearchOutlined />
                    </template>
                    搜索填充
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

            <!-- VSCode 系列的 Storage 路径 -->
            <div class="editor-config-row" v-if="!editor.editorType || editor.editorType === 'vscode'">
                <a-typography-text style="min-width: 100px;">配置文件路径:</a-typography-text>
                <a-input :value="editor.storagePath"
                    @update:value="(val) => settingsStore.setEditorConfig(key, { storagePath: val })"
                    placeholder="storage.json 文件路径" style="flex: 1;" />
                <a-button @click="selectFile(key, 'storage')">
                    <FolderOpenOutlined />
                    选择
                </a-button>
            </div>

            <!-- JetBrains 系列的 RecentProjects 路径 -->
            <div class="editor-config-row" v-if="editor.editorType === 'jetbrains'">
                <a-typography-text style="min-width: 100px;">配置文件路径:</a-typography-text>
                <a-input :value="editor.recentProjectsPath"
                    @update:value="(val) => settingsStore.setEditorConfig(key, { recentProjectsPath: val })"
                    placeholder="recentProjects.xml 文件路径" style="flex: 1;" />
                <a-button @click="selectFile(key, 'recentProjects')">
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
                    <a-input v-model:value="editorForm.name" placeholder="如: Cursor / IDEA" />
                </a-form-item>

                <a-form-item label="编辑器类型" required>
                    <a-radio-group v-model:value="editorForm.editorType">
                        <a-radio value="vscode">VSCode 系列</a-radio>
                        <a-radio value="jetbrains">JetBrains 系列</a-radio>
                    </a-radio-group>
                </a-form-item>

                <a-form-item label="命令名称" required>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <a-input v-model:value="editorForm.commandName" placeholder="如果要使用自动搜索，请填充此属性"
                            style="flex: 1;" />
                        <a-button type="primary" size="small" :disabled="!editorForm.commandName.trim()"
                            @click="searchEditorConfigInModal">
                            <SearchOutlined />
                            搜索
                        </a-button>
                    </div>
                    <template #extra>
                        <span style="font-size: 12px; color: #999;">
                            编辑器对应的终端命令，如code、cursor等，输入后点击搜索可自动填充
                        </span>
                    </template>
                </a-form-item>

                <a-form-item label="配置路径关键字">
                    <a-input v-model:value="editorForm.storageKeyword"
                        placeholder="自动搜索时用于匹配配置文件路径中的关键字，如: Cursor、IDEA" />
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

                <a-form-item label="Storage 路径" v-if="editorForm.editorType === 'vscode'">
                    <a-input v-model:value="editorForm.storagePath" placeholder="storage.json 文件路径">
                        <template #suffix>
                            <a-button type="link" size="small" @click="selectFileInModal('storage')">
                                <FolderOpenOutlined />
                            </a-button>
                        </template>
                    </a-input>
                </a-form-item>

                <a-form-item label="配置文件路径" v-if="editorForm.editorType === 'jetbrains'">
                    <a-input v-model:value="editorForm.recentProjectsPath" placeholder="recentProjects.xml 文件路径">
                        <template #suffix>
                            <a-button type="link" size="small" @click="selectFileInModal('recentProjects')">
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