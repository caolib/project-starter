import { ref, computed, watch } from 'vue'
import { getData, setData } from '../utils/store'

// 存储键名
const SETTINGS_KEY = 'utools-plugin-template-settings'

// 默认设置值
const defaultSettings = {
    theme: 'system',
    editors: {
        code: {
            id: 'code',
            name: 'VS Code',
            icon: 'img/code.png',
            commandName: 'code',
            storageKeyword: 'Code',
            executablePath: '',
            storagePath: ''
        },
        qoder: {
            id: 'qoder',
            name: 'Qoder',
            icon: 'img/qoder.png',
            commandName: 'qoder',
            storageKeyword: 'Qoder',
            executablePath: '',
            storagePath: ''
        },
        trae: {
            id: 'trae',
            name: 'Trae',
            icon: 'img/trae.png',
            commandName: 'trae',
            storageKeyword: 'Trae',
            executablePath: '',
            storagePath: ''
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

/**
 * settings store - 使用 Composition API 和 uTools dbStorage
 */
export function useSettingsStore() {
    const theme = computed({
        get: () => settings.value.theme,
        set: (val) => { settings.value.theme = val }
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
            storagePath: editorData.storagePath || ''
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

    const resetToDefault = () => { settings.value = { ...defaultSettings } }

    return {
        theme,
        editors,
        setTheme,
        setEditorConfig,
        addEditor,
        removeEditor,
        updateEditor,
        resetToDefault
    }
}
