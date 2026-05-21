<script setup>

import { computed, ref, nextTick } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { useSettingsStore } from '../stores/settings'
import { ExportOutlined, ImportOutlined, SearchOutlined, FolderOpenOutlined, PlusOutlined, DeleteOutlined, EditOutlined, ReloadOutlined, ThunderboltOutlined } from '@ant-design/icons-vue';

const settingsStore = useSettingsStore();

// 所有可扫描的编辑器列表
const allEditors = [
    // VSCode 系列
    { name: 'VS Code', commandName: 'code', editorType: 'vscode' },
    { name: 'VS Code Insiders', commandName: 'code-insiders', editorType: 'vscode' },
    { name: 'Cursor', commandName: 'cursor', editorType: 'vscode' },
    { name: 'Windsurf', commandName: 'windsurf', editorType: 'vscode' },
    { name: 'Qoder', commandName: 'qoder', editorType: 'vscode' },
    { name: 'Trae', commandName: 'trae', editorType: 'vscode' },
    { name: 'Trae CN', commandName: 'trae-cn', storageKeyword: 'Trae CN', editorType: 'vscode' },
    { name: 'VSCodium', commandName: 'codium', editorType: 'vscode' },
    { name: 'CodeInside', commandName: 'codeinside', editorType: 'vscode' },
    { name: 'HBuilderX', commandName: 'hbuilderx', editorType: 'vscode' },
    { name: 'Lapce', commandName: 'lapce', editorType: 'vscode' },
    { name: 'Positron', commandName: 'positron', editorType: 'vscode' },
    { name: 'Antigravity', commandName: 'antigravity', editorType: 'vscode' },
    { name: 'Void', commandName: 'void', editorType: 'vscode' },
    // JetBrains 系列
    { name: 'IntelliJ IDEA', commandName: 'idea', editorType: 'jetbrains' },
    { name: 'IntelliJ IDEA Community', commandName: 'idea-community', editorType: 'jetbrains' },
    { name: 'WebStorm', commandName: 'webstorm', editorType: 'jetbrains' },
    { name: 'PyCharm', commandName: 'pycharm', editorType: 'jetbrains' },
    { name: 'PyCharm Professional', commandName: 'pycharm-professional', editorType: 'jetbrains' },
    { name: 'PyCharm Community', commandName: 'pycharm-community', editorType: 'jetbrains' },
    { name: 'Android Studio', commandName: 'studio', editorType: 'jetbrains' },
    { name: 'CLion', commandName: 'clion', editorType: 'jetbrains' },
    { name: 'GoLand', commandName: 'goland', editorType: 'jetbrains' },
    { name: 'RustRover', commandName: 'rustrover', editorType: 'jetbrains' },
    { name: 'Rider', commandName: 'rider', editorType: 'jetbrains' },
    { name: 'RubyMine', commandName: 'rubymine', editorType: 'jetbrains' },
    { name: 'DataGrip', commandName: 'datagrip', editorType: 'jetbrains' },
    { name: 'DataSpell', commandName: 'dataspell', editorType: 'jetbrains' },
    { name: 'Aqua', commandName: 'aqua', editorType: 'jetbrains' },
    { name: 'Fleet', commandName: 'fleet', editorType: 'jetbrains' },
    // 其他
    { name: 'Zed', commandName: 'zed', editorType: 'other' },
];

const theme = computed({
    get: () => settingsStore.theme.value,
    set: (val) => { settingsStore.theme.value = val }
});

const hideMissingProjects = computed({
    get: () => settingsStore.hideMissingProjects.value,
    set: (val) => { settingsStore.hideMissingProjects.value = val }
});

const autoHideWindow = computed({
    get: () => settingsStore.autoHideWindow.value,
    set: (val) => { settingsStore.autoHideWindow.value = val }
});

const editors = computed(() => settingsStore.editors.value);

// 添加/编辑编辑器的对话框
const editorModalVisible = ref(false);
const editorFormMode = ref('add'); // 'add' 或 'edit'
const currentEditingKey = ref('');
const selectedPreset = ref(null); // 预设编辑器选择
const editorForm = ref({
    name: '',
    icon: 'img/code.png',
    commandName: '',
    storageKeyword: '',
    executablePath: '',
    storagePath: '',
    recentProjectsPath: '',
    zedDbPath: '',
    editorType: 'other'
});

const editorTypeOptions = [
    { label: 'VSCode 系列', value: 'vscode' },
    { label: 'JetBrains 系列', value: 'jetbrains' },
    { label: '其他', value: 'other' }
];

// 预设编辑器列表（针对"其他"类型）
const presetEditors = [
    { label: 'Zed', value: 'zed' }
];

// 根据选择的编辑器类型筛选编辑器列表
const filteredEditors = computed(() => {
    return allEditors.filter(e => e.editorType === editorForm.value.editorType);
});

// 编辑器名称自动完成的搜索文本
const editorNameSearch = ref('');

// 搜索状态
const searching = ref({
    code: false,
    qoder: false,
    trae: false,
    idea: false,
    studio: false
});

const searchingAll = ref(false);
const initializing = ref(false);

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

        // 从 cmd 基名生成所有候选 exe 文件名变体
        const baseNameVariants = [
            baseName,
            baseName.charAt(0).toUpperCase() + baseName.slice(1),
            // 连字符转空格并每个单词首字母大写（如 trae-cn → Trae CN）
            baseName.replace(/-([a-z])/g, (_, c) => ' ' + c.toUpperCase()).replace(/^[a-z]/, c => c.toUpperCase()),
        ];

        // 分割路径，逐级向上生成候选路径
        // 从 cmd 所在目录开始，逐级向上查找 .exe
        const pathParts = cmdPath.replace(/\//g, '\\').split('\\');
        // 移除文件名，保留目录部分
        pathParts.pop();

        const inferredPaths = [];

        // 从当前目录往上遍历，逐级生成候选路径
        for (let i = pathParts.length - 1; i >= 0; i--) {
            const currentPath = pathParts.slice(0, i + 1).join('\\');
            for (const variant of baseNameVariants) {
                inferredPaths.push(currentPath + '\\' + variant + '.exe');
            }
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
            const editorType = editor.editorType || 'other';
            console.log('编辑器类型:', editorType);

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
                                // 优先选择 64.exe 文件（如 pycharm64.exe、studio64.exe）
                                const is64Exe = exeFile.toLowerCase().includes('64.exe');
                                if (is64Exe) {
                                    executablePath = exeFile;
                                    console.log('选择了 64.exe 文件:', executablePath);
                                } else {
                                    // 检查是否有 64.exe 版本
                                    const dir = exeFile.substring(0, exeFile.lastIndexOf('\\'));
                                    const baseName = exeFile.substring(exeFile.lastIndexOf('\\') + 1, exeFile.lastIndexOf('.'));
                                    const possible64Exe = dir + '\\' + baseName + '64.exe';
                                    if (window.services && typeof window.services.pathExists === 'function' && window.services.pathExists(possible64Exe)) {
                                        executablePath = possible64Exe;
                                        console.log('找到 64.exe 版本:', executablePath);
                                    } else {
                                        executablePath = exeFile;
                                        console.log('选择了 .exe 文件:', executablePath);
                                    }
                                }
                            } else if (res.path && res.path.toLowerCase().endsWith('.exe')) {
                                // res.all 中没有 .exe，但 res.path 是 .exe（如 Toolbox 安装的编辑器）
                                executablePath = res.path;
                                console.log('使用 res.path 的 .exe 文件:', executablePath);
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
                                // 如果 exe 在 bin 目录下，优先检查上一级是否有同名 exe
                                if (exeFile.toLowerCase().includes('\\bin\\')) {
                                    const binIndex = exeFile.toLowerCase().lastIndexOf('\\bin\\');
                                    const fileName = exeFile.substring(binIndex + 5); // 取 bin\\ 后面的部分
                                    const parentPath = exeFile.substring(0, binIndex) + '\\' + fileName;
                                    if (window.services && typeof window.services.pathExists === 'function' && window.services.pathExists(parentPath)) {
                                        executablePath = parentPath;
                                        console.log('优先使用上一级 .exe 文件:', executablePath);
                                    } else {
                                        executablePath = exeFile;
                                        console.log('选择了 bin 目录下的 .exe 文件:', executablePath);
                                    }
                                } else {
                                    executablePath = exeFile;
                                    console.log('选择了 .exe 文件:', executablePath);
                                }
                            } else {
                                executablePath = res.path || '';
                                console.log('使用默认路径:', executablePath);
                            }
                        }
                    } else if (res.all && res.all.length === 1) {
                        // 只有一个匹配项
                        const singleFile = res.all[0];
                        const isJetBrains = editorType === 'jetbrains';
                        const isExe = singleFile.toLowerCase().endsWith('.exe');
                        const is64Exe = singleFile.toLowerCase().includes('64.exe');

                        if (isJetBrains && isExe && !is64Exe) {
                            // JetBrains 编辑器，检查是否有 64.exe 版本
                            const dir = singleFile.substring(0, singleFile.lastIndexOf('\\'));
                            const baseName = singleFile.substring(singleFile.lastIndexOf('\\') + 1, singleFile.lastIndexOf('.'));
                            const possible64Exe = dir + '\\' + baseName + '64.exe';
                            if (window.services && typeof window.services.pathExists === 'function' && window.services.pathExists(possible64Exe)) {
                                executablePath = possible64Exe;
                                console.log('找到 64.exe 版本:', executablePath);
                            } else {
                                executablePath = singleFile;
                                console.log('使用唯一匹配文件:', executablePath);
                            }
                        } else {
                            executablePath = singleFile;
                            console.log('使用唯一匹配文件:', executablePath);
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
                // VSCode 系列：直接根据编辑器名构造路径检查
                if (window.services && typeof window.services.findStoragePath === 'function') {
                    const keyword = editor.storageKeyword || editor.name;
                    const res = window.services.findStoragePath(keyword);
                    if (res && res.success) {
                        projectFilePath = res.path;
                        console.log(`找到 Storage 路径:`, projectFilePath);
                    } else {
                        console.log(`未找到 ${keyword} 的 storage.json`);
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

            // 如果是 Zed 编辑器（通过 commandName 判断）：搜索数据库文件
            if (editor.commandName && editor.commandName.toLowerCase() === 'zed') {
                console.log('开始搜索 Zed 数据库...');
                if (window.services && typeof window.services.searchZedDatabase === 'function') {
                    const res = window.services.searchZedDatabase();
                    console.log('searchZedDatabase 返回结果:', res);
                    if (res && res.success && res.results.length > 0) {
                        projectFilePath = res.results[0]; // 优先使用第一个找到的数据库
                        console.log(`找到 Zed 数据库:`, projectFilePath);
                    } else {
                        console.log('searchZedDatabase 未找到文件或失败');
                    }
                } else {
                    console.error('window.services.searchZedDatabase 函数不存在');
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
            } else if (editor.commandName && editor.commandName.toLowerCase() === 'zed') {
                updateData.zedDbPath = projectFilePath || editor.zedDbPath;
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
                if (editorType === 'vscode' && projectFilePath) foundItems.push('Storage 路径');
                else if (editorType === 'jetbrains' && projectFilePath) foundItems.push('RecentProjects 路径');
                else if (editor.commandName && editor.commandName.toLowerCase() === 'zed' && projectFilePath) foundItems.push('数据库文件');
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

// 初始化：扫描本地所有可用编辑器并添加
const initEditors = async () => {
    initializing.value = true;
    await nextTick();

    setTimeout(async () => {
        try {
            let addedCount = 0;
            let skippedCount = 0;
            const currentEditors = editors.value;

            for (const editorInfo of allEditors) {
                // 检查是否已存在同名编辑器
                const alreadyExists = Object.values(currentEditors).some(
                    e => e.commandName === editorInfo.commandName
                );

                if (alreadyExists) {
                    skippedCount++;
                    continue;
                }

                // 检查命令是否可用
                if (window.services && typeof window.services.findCommandPath === 'function') {
                    const res = window.services.findCommandPath(editorInfo.commandName);
                    if (res && res.success && res.path) {
                        // 命令存在，添加编辑器
                        settingsStore.addEditor({
                            name: editorInfo.name,
                            commandName: editorInfo.commandName,
                            storageKeyword: editorInfo.storageKeyword || editorInfo.commandName,
                            icon: 'img/code.png',
                            editorType: editorInfo.editorType
                        });
                        addedCount++;
                        console.log(`已添加编辑器: ${editorInfo.name} (${editorInfo.commandName})`);
                    }
                }

                // 短暂延迟让 UI 更新
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            if (addedCount > 0) {
                // 对新添加的编辑器执行搜索填充
                const editorKeys = Object.keys(editors.value);
                for (const editorKey of editorKeys) {
                    const editor = editors.value[editorKey];
                    // 只对没有配置路径的编辑器执行搜索
                    const hasNoConfig = editor.editorType === 'vscode' && !editor.storagePath
                        || editor.editorType === 'jetbrains' && !editor.recentProjectsPath
                        || editor.editorType === 'other' && !editor.zedDbPath && editor.commandName === 'zed'
                        || !editor.executablePath;

                    if (hasNoConfig) {
                        await searchEditorConfig(editorKey);
                        await new Promise(resolve => setTimeout(resolve, 200));
                    }
                }
                message.success(`初始化完成：新增 ${addedCount} 个编辑器，跳过 ${skippedCount} 个`);
            } else {
                message.info(`未发现新的可用编辑器（跳过 ${skippedCount} 个已存在的编辑器）`);
            }
        } catch (error) {
            message.error(`初始化失败: ${error.message}`);
        } finally {
            initializing.value = false;
        }
    }, 100);
};

// 手动选择文件
const selectFile = (editorKey, type) => {
    try {
        const title = type === 'executable' ? '选择可执行文件'
            : type === 'recentProjects' ? '选择 recentProjects.xml 文件'
                : type === 'zedDb' ? '选择 Zed 数据库文件'
                    : '选择 storage.json 文件';
        const filters = type === 'executable'
            ? [{ name: '可执行文件', extensions: ['exe', 'cmd', 'bat'] }, { name: '所有文件', extensions: ['*'] }]
            : type === 'recentProjects'
                ? [{ name: 'XML文件', extensions: ['xml'] }, { name: '所有文件', extensions: ['*'] }]
                : type === 'zedDb'
                    ? [{ name: 'SQLite文件', extensions: ['sqlite', 'db'] }, { name: '所有文件', extensions: ['*'] }]
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
                    : type === 'zedDb' ? 'zedDbPath'
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

// 清空所有编辑器配置
const resetEditors = () => {
    Modal.confirm({
        title: '确认清空编辑器配置',
        content: '此操作将清空所有编辑器配置，其他设置（如主题）不受影响。清空后可使用"初始化"按钮重新扫描。',
        okText: '清空',
        cancelText: '取消',
        okType: 'danger',
        onOk() {
            try {
                settingsStore.editors.value = {};
                message.success('已清空编辑器配置');
            } catch (e) {
                message.error(`清空失败: ${e.message}`);
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
    selectedPreset.value = null;
    editorForm.value = {
        name: '',
        icon: 'img/code.png',
        commandName: '',
        storageKeyword: '',
        executablePath: '',
        storagePath: '',
        recentProjectsPath: '',
        zedDbPath: '',
        editorType: 'other'
    };
    editorModalVisible.value = true;
};

// 处理预设编辑器选择
const selectPresetEditor = (editorLabel) => {
    const preset = presetEditors.find(e => e.label === editorLabel);
    if (preset) {
        editorForm.value.name = preset.label;
        editorForm.value.commandName = preset.value;
        editorForm.value.storageKeyword = preset.value;

        // 自动搜索填充
        nextTick(() => {
            searchEditorConfigInModal();
        });
    }
};

// 根据编辑器名称选择编辑器
const selectEditorByName = (name) => {
    const editor = allEditors.find(e => e.name === name && e.editorType === editorForm.value.editorType);
    if (editor) {
        editorForm.value.commandName = editor.commandName;
        editorForm.value.storageKeyword = editor.storageKeyword || '';
    }
};

// 打开编辑编辑器对话框
const openEditEditorModal = (editorKey) => {
    editorFormMode.value = 'edit';
    currentEditingKey.value = editorKey;
    selectedPreset.value = null;
    const editor = editors.value[editorKey];
    editorForm.value = {
        name: editor.name,
        icon: editor.icon,
        commandName: editor.commandName || '',
        storageKeyword: editor.storageKeyword || '',
        executablePath: editor.executablePath,
        storagePath: editor.storagePath || '',
        recentProjectsPath: editor.recentProjectsPath || '',
        zedDbPath: editor.zedDbPath || '',
        editorType: editor.editorType || 'other'
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
                : type === 'zedDb' ? '选择 Zed 数据库文件'
                    : '选择 storage.json 文件';
        const filters = type === 'executable'
            ? [{ name: '可执行文件', extensions: ['exe', 'cmd', 'bat'] }, { name: '所有文件', extensions: ['*'] }]
            : type === 'recentProjects'
                ? [{ name: 'XML文件', extensions: ['xml'] }, { name: '所有文件', extensions: ['*'] }]
                : type === 'zedDb'
                    ? [{ name: 'SQLite文件', extensions: ['sqlite', 'db'] }, { name: '所有文件', extensions: ['*'] }]
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
            } else if (type === 'zedDb') {
                editorForm.value.zedDbPath = openPath[0];
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

    // 如果配置路径关键字为空，自动设置为命令名称的值
    if (!editorForm.value.storageKeyword) {
        editorForm.value.storageKeyword = editorForm.value.commandName;
    }

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
                            // 优先选择 64.exe 文件（如 pycharm64.exe、studio64.exe）
                            const is64Exe = exeFile.toLowerCase().includes('64.exe');
                            if (is64Exe) {
                                executablePath = exeFile;
                                console.log('选择了 64.exe 文件:', executablePath);
                            } else {
                                // 检查是否有 64.exe 版本
                                const dir = exeFile.substring(0, exeFile.lastIndexOf('\\'));
                                const baseName = exeFile.substring(exeFile.lastIndexOf('\\') + 1, exeFile.lastIndexOf('.'));
                                const possible64Exe = dir + '\\' + baseName + '64.exe';
                                if (window.services && typeof window.services.pathExists === 'function' && window.services.pathExists(possible64Exe)) {
                                    executablePath = possible64Exe;
                                    console.log('找到 64.exe 版本:', executablePath);
                                } else {
                                    executablePath = exeFile;
                                    console.log('选择了 .exe 文件:', executablePath);
                                }
                            }
                        } else if (res.path && res.path.toLowerCase().endsWith('.exe')) {
                            // res.all 中没有 .exe，但 res.path 是 .exe（如 Toolbox 安装的编辑器）
                            executablePath = res.path;
                            console.log('使用 res.path 的 .exe 文件:', executablePath);
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
                            // 如果 exe 在 bin 目录下，优先检查上一级是否有同名 exe
                            if (exeFile.toLowerCase().includes('\\bin\\')) {
                                const binIndex = exeFile.toLowerCase().lastIndexOf('\\bin\\');
                                const fileName = exeFile.substring(binIndex + 5); // 取 bin\\ 后面的部分
                                const parentPath = exeFile.substring(0, binIndex) + '\\' + fileName;
                                if (window.services && typeof window.services.pathExists === 'function' && window.services.pathExists(parentPath)) {
                                    executablePath = parentPath;
                                    console.log('优先使用上一级 .exe 文件:', executablePath);
                                } else {
                                    executablePath = exeFile;
                                    console.log('选择了 bin 目录下的 .exe 文件:', executablePath);
                                }
                            } else {
                                executablePath = exeFile;
                                console.log('选择了 .exe 文件:', executablePath);
                            }
                        } else {
                            executablePath = res.path || '';
                            console.log('使用默认路径:', executablePath);
                        }
                    }
                } else if (res.all && res.all.length === 1) {
                    // 只有一个匹配项
                    const singleFile = res.all[0];
                    const isJetBrains = editorForm.value.editorType === 'jetbrains';
                    const isExe = singleFile.toLowerCase().endsWith('.exe');
                    const is64Exe = singleFile.toLowerCase().includes('64.exe');

                    if (isJetBrains && isExe && !is64Exe) {
                        // JetBrains 编辑器，检查是否有 64.exe 版本
                        const dir = singleFile.substring(0, singleFile.lastIndexOf('\\'));
                        const baseName = singleFile.substring(singleFile.lastIndexOf('\\') + 1, singleFile.lastIndexOf('.'));
                        const possible64Exe = dir + '\\' + baseName + '64.exe';
                        if (window.services && typeof window.services.pathExists === 'function' && window.services.pathExists(possible64Exe)) {
                            executablePath = possible64Exe;
                            console.log('找到 64.exe 版本:', executablePath);
                        } else {
                            executablePath = singleFile;
                            console.log('使用唯一匹配文件:', executablePath);
                        }
                    } else {
                        executablePath = singleFile;
                        console.log('使用唯一匹配文件:', executablePath);
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
            // VSCode 系列：直接根据编辑器名构造路径检查
            if (window.services && typeof window.services.findStoragePath === 'function') {
                const keyword = editorForm.value.storageKeyword || editorForm.value.name;
                const res = window.services.findStoragePath(keyword);
                if (res && res.success) {
                    projectFilePath = res.path;
                    console.log(`找到 Storage 路径:`, projectFilePath);
                } else {
                    console.log(`未找到 ${keyword} 的 storage.json`);
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

        // 如果是 Zed 编辑器（通过 commandName 判断）：搜索数据库文件
        if (editorForm.value.commandName.toLowerCase() === 'zed') {
            console.log('开始搜索 Zed 数据库...');
            if (window.services && typeof window.services.searchZedDatabase === 'function') {
                const res = window.services.searchZedDatabase();
                console.log('searchZedDatabase 返回结果:', res);
                if (res && res.success && res.results.length > 0) {
                    projectFilePath = res.results[0]; // 优先使用第一个找到的数据库
                    console.log(`找到 Zed 数据库:`, projectFilePath);
                } else {
                    console.log('searchZedDatabase 未找到文件或失败');
                }
            } else {
                console.error('window.services.searchZedDatabase 函数不存在');
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

        // 如果是 Zed 编辑器：保存数据库路径
        if (editorForm.value.commandName.toLowerCase() === 'zed') {
            if (projectFilePath) {
                editorForm.value.zedDbPath = projectFilePath;
            }
        }

        // 显示成功消息
        const foundItems = [];
        if (executablePath) foundItems.push('可执行文件');
        if (editorForm.value.editorType === 'vscode' && projectFilePath) foundItems.push('Storage 路径');
        else if (editorForm.value.editorType === 'jetbrains' && projectFilePath) foundItems.push('RecentProjects 路径');
        else if (editorForm.value.commandName.toLowerCase() === 'zed' && projectFilePath) foundItems.push('数据库文件');
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

        <div class="config-row" style="margin-top: 8px;">
            <a-typography-text style="margin-right: 10px;">打开项目后自动隐藏插件窗口</a-typography-text>
            <a-switch v-model:checked="autoHideWindow" />
        </div>

        <!-- 编辑器配置区域 -->
        <a-divider>编辑器配置</a-divider>

        <div class="config-row" style="justify-content: space-between; padding-top: 0;">
            <div style="display:flex; gap:8px;">
                <a-button type="primary" :loading="searchingAll" @click="searchAllEditors">
                    <template #icon>
                        <SearchOutlined />
                    </template>
                    搜索填充全部
                </a-button>
                <a-button type="primary" ghost :loading="initializing" @click="initEditors">
                    <template #icon>
                        <ThunderboltOutlined />
                    </template>
                    初始化
                </a-button>
            </div>
            <div style="display:flex; gap:8px;">
                <a-button danger @click="resetEditors">
                    <template #icon>
                        <DeleteOutlined />
                    </template>
                    清空设置
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
            <div class="editor-config-row" v-if="editor.editorType === 'vscode'">
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

            <!-- Zed 编辑器的数据库路径 -->
            <div class="editor-config-row" v-if="editor.commandName && editor.commandName.toLowerCase() === 'zed'">
                <a-typography-text style="min-width: 100px;">数据库文件:</a-typography-text>
                <a-input :value="editor.zedDbPath"
                    @update:value="(val) => settingsStore.setEditorConfig(key, { zedDbPath: val })"
                    placeholder="db.sqlite 文件路径" style="flex: 1;" />
                <a-button @click="selectFile(key, 'zedDb')">
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
                <a-form-item label="编辑器类型" required>
                    <a-radio-group v-model:value="editorForm.editorType">
                        <a-radio v-for="option in editorTypeOptions" :key="option.value" :value="option.value">
                            {{ option.label }}
                        </a-radio>
                    </a-radio-group>
                </a-form-item>

                <a-form-item label="编辑器名称" required>
                    <!-- VSCode 和 JetBrains 类型: 自动完成输入框 -->
                    <a-auto-complete
                        v-if="editorForm.editorType !== 'other'"
                        v-model:value="editorForm.name"
                        :options="filteredEditors.map(e => ({ value: e.name }))"
                        :filter-option="(inputValue, option) => option.value.toLowerCase().includes(inputValue.toLowerCase())"
                        placeholder="如: Cursor / IDEA"
                        @select="(value) => selectEditorByName(value)"
                    />
                    <!-- 其他类型: 预设编辑器自动完成 -->
                    <a-auto-complete
                        v-else
                        v-model:value="editorForm.name"
                        :options="presetEditors.map(e => ({ value: e.label }))"
                        :filter-option="(inputValue, option) => option.value.toLowerCase().includes(inputValue.toLowerCase())"
                        placeholder="选择或输入自定义编辑器"
                        @select="(value) => selectPresetEditor(value)"
                    />
                </a-form-item>

                <a-form-item label="命令名称" required>
                    <!-- VSCode 和 JetBrains 类型: 文本输入 -->
                    <div v-if="editorForm.editorType !== 'other'" style="display: flex; gap: 8px; align-items: center;">
                        <a-input v-model:value="editorForm.commandName" placeholder="如: code、cursor" style="flex: 1;" />
                        <a-button type="primary" size="small" :disabled="!editorForm.commandName.trim()"
                            @click="searchEditorConfigInModal">
                            <SearchOutlined />
                            搜索
                        </a-button>
                    </div>
                    <!-- 其他类型: 自定义输入框 -->
                    <div v-else style="display: flex; gap: 8px; align-items: center;">
                        <a-input v-model:value="editorForm.commandName" placeholder="或输入自定义命令" style="flex: 1;" />
                        <a-button type="primary" size="small" :disabled="!editorForm.commandName.trim()"
                            @click="searchEditorConfigInModal">
                            <SearchOutlined />
                            搜索
                        </a-button>
                    </div>
                    <template #extra>
                        <span style="font-size: 12px; color: #999;">
                            编辑器对应的终端命令，如code、zed等
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

                <a-form-item label="数据库文件"
                    v-if="editorForm.commandName && editorForm.commandName.toLowerCase() === 'zed'">
                    <a-input v-model:value="editorForm.zedDbPath" placeholder="db.sqlite 文件路径">
                        <template #suffix>
                            <a-button type="link" size="small" @click="selectFileInModal('zedDb')">
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