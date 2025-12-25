import { ref, computed, watch } from 'vue'
import { getData, setData } from '../utils/store'

// 存储键名
const SETTINGS_KEY = 'utools-plugin-template-settings'
const EDITOR_HISTORY_KEY = 'utools-project-editor-history'

// 默认设置值
const defaultSettings = {
    theme: 'system',
    hideMissingProjects: true,
    autoHideWindow: false, // 打开项目后自动隐藏窗口
    editors: {
        code: {
            id: 'code',
            name: 'VS Code',
            icon: 'img/code.png',
            commandName: 'code',
            storageKeyword: 'Code',
            executablePath: '',
            storagePath: '',
            editorType: 'vscode'
        },
        qoder: {
            id: 'qoder',
            name: 'Qoder',
            icon: 'img/qoder.png',
            commandName: 'qoder',
            storageKeyword: 'Qoder',
            executablePath: '',
            storagePath: '',
            editorType: 'vscode'
        },
        trae: {
            id: 'trae',
            name: 'Trae',
            icon: 'img/trae.png',
            commandName: 'trae',
            storageKeyword: 'Trae',
            executablePath: '',
            storagePath: '',
            editorType: 'vscode'
        },
        idea: {
            id: 'idea',
            name: 'IDEA',
            icon: 'img/code.png',
            commandName: 'idea',
            storageKeyword: 'idea',
            executablePath: '',
            recentProjectsPath: '',
            editorType: 'jetbrains'
        },
        studio: {
            id: 'studio',
            name: 'Android Studio',
            icon: 'img/code.png',
            commandName: 'studio',
            storageKeyword: 'studio',
            executablePath: '',
            recentProjectsPath: '',
            editorType: 'jetbrains'
        }
    }
}

// 从 dbStorage 加载设置
const loadSettings = () => {
    const saved = getData(SETTINGS_KEY, null)
    if (saved) {
        // 向后兼容：将旧的 isKill 转换为 copyAction
        if (saved.isKill !== undefined && saved.copyAction === undefined) {
            saved.copyAction = saved.isKill ? 'copy-close' : 'copy-only'
            delete saved.isKill
        }
        // 确保 copyAction 有默认值
        if (!saved.copyAction) {
            saved.copyAction = 'copy-close-paste'
        }
        return { ...defaultSettings, ...saved }
    }
    return { ...defaultSettings }
}

// 编辑器使用历史: { projectPath: ['editor1', 'editor2', ...] }
const loadEditorHistory = () => {
    const saved = getData(EDITOR_HISTORY_KEY, {})
    return saved || {}
}

const editorHistory = ref(loadEditorHistory())

// 全局状态
const settings = ref(loadSettings())

// 监听变化并持久化 - 使用 JSON 序列化确保数据可克隆
watch(
    settings,
    (newValue) => {
        // 深拷贝以确保可序列化
        const serializableValue = JSON.parse(JSON.stringify(newValue))
        setData(SETTINGS_KEY, serializableValue)
    },
    { deep: true }
)

// 监听编辑器历史的变化并持久化
watch(
    editorHistory,
    (newValue) => {
        const serializableValue = JSON.parse(JSON.stringify(newValue))
        setData(EDITOR_HISTORY_KEY, serializableValue)
    },
    { deep: true }
)

/**
 * settings store - 使用 Composition API 和 uTools dbStorage
 */
export function useSettingsStore() {
    const theme = computed({
        get: () => settings.value.theme,
        set: (val) => { settings.value.theme = val }
    })

    const hideMissingProjects = computed({
        get: () => settings.value.hideMissingProjects,
        set: (val) => { settings.value.hideMissingProjects = !!val }
    })

    const autoHideWindow = computed({
        get: () => settings.value.autoHideWindow,
        set: (val) => { settings.value.autoHideWindow = !!val }
    })

    const editors = computed({
        get: () => settings.value.editors,
        set: (val) => { settings.value.editors = val }
    })

    const setTheme = (theme) => { settings.value.theme = theme }

    const setEditorConfig = (editorKey, config) => {
        if (settings.value.editors[editorKey]) {
            settings.value.editors[editorKey] = { ...settings.value.editors[editorKey], ...config }
        }
    }

    const addEditor = (editorData) => {
        const id = editorData.id || `editor_${Date.now()}`
        settings.value.editors[id] = {
            id,
            name: editorData.name || '新编辑器',
            icon: editorData.icon || 'img/code.png',
            commandName: editorData.commandName || '',
            storageKeyword: editorData.storageKeyword || '',
            executablePath: editorData.executablePath || '',
            storagePath: editorData.storagePath || '',
            recentProjectsPath: editorData.recentProjectsPath || '', // JetBrains 系列
            editorType: editorData.editorType || 'vscode' // 'vscode' 或 'jetbrains'
        }
        return id
    }

    const removeEditor = (editorKey) => {
        if (settings.value.editors[editorKey]) {
            delete settings.value.editors[editorKey]
            // 触发响应式更新
            settings.value = { ...settings.value }
        }
    }

    const updateEditor = (editorKey, newData) => {
        if (settings.value.editors[editorKey]) {
            settings.value.editors[editorKey] = {
                ...settings.value.editors[editorKey],
                ...newData,
                id: editorKey // 保持 id 不变
            }
        }
    }

    const resetEditorsToDefault = () => {
        // 仅重置编辑器配置为默认值，其他设置保持不变
        settings.value.editors = JSON.parse(JSON.stringify(defaultSettings.editors))
    }

    const resetToDefault = () => { settings.value = { ...defaultSettings } }

    const recordEditorUsage = (projectPath, editorId) => {
        if (!projectPath || !editorId) return
        if (!editorHistory.value[projectPath]) {
            editorHistory.value[projectPath] = []
        }
        // 移除已存在的编辑器 ID（避免重复）
        const index = editorHistory.value[projectPath].indexOf(editorId)
        if (index > -1) {
            editorHistory.value[projectPath].splice(index, 1)
        }
        // 将编辑器 ID 添加到开头（最近使用的在最前面）
        editorHistory.value[projectPath].unshift(editorId)
    }

    const getEditorHistory = (projectPath) => {
        return editorHistory.value[projectPath] || []
    }

    return {
        theme,
        hideMissingProjects,
        autoHideWindow,
        editors,
        setTheme,
        setEditorConfig,
        addEditor,
        removeEditor,
        updateEditor,
        resetEditorsToDefault,
        resetToDefault,
        recordEditorUsage,
        getEditorHistory
    }
}
