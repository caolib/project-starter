<script setup>
import { computed, ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useSettingsStore } from '../stores/settings';
import { message } from 'ant-design-vue';
import { ReloadOutlined } from '@ant-design/icons-vue';

const settingsStore = useSettingsStore();

// 编辑器配置
const editors = computed(() => settingsStore.editors.value);

// 项目数据
const projects = ref([]);
const editorSources = ref([]);
const loading = ref(false);
const error = ref('');

// 搜索关键字
const searchKeyword = ref('');

// 所有可用的编辑器（从实际数据中提取）
const availableEditors = computed(() => {
  return editorSources.value.map(source => source.editor);
});

// 筛选状态 - 默认全选
const selectedEditors = ref([]);

// 筛选后的项目（包括搜索和编辑器筛选）
const existsCache = new Map();
const pathExists = (p) => {
  if (!p) return false;
  const key = p.toLowerCase();
  if (existsCache.has(key)) return existsCache.get(key);
  try {
    const ok = window.services && typeof window.services.pathExists === 'function' ? !!window.services.pathExists(p) : true;
    existsCache.set(key, ok);
    return ok;
  } catch {
    return true;
  }
};

const filteredProjects = computed(() => {
  if (selectedEditors.value.length === 0) {
    return [];
  }

  let result = projects.value.filter(project => {
    // 项目至少有一个编辑器在选中列表中
    return project.editors.some(editor => selectedEditors.value.includes(editor));
  });

  // 根据开关隐藏不存在的项目
  if (settingsStore.hideMissingProjects && settingsStore.hideMissingProjects.value) {
    result = result.filter(project => pathExists(project.path));
  }

  // 如果有搜索关键字，进一步过滤
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.toLowerCase().trim();
    result = result.filter(project => {
      return project.name.toLowerCase().includes(keyword) ||
        project.path.toLowerCase().includes(keyword);
    });
  }

  return result;
});

// 加载项目
const loadProjects = async () => {
  loading.value = true;
  error.value = '';

  try {
    if (window.services && typeof window.services.extractAllProjects === 'function') {
      // 传递编辑器配置给 extractAllProjects
      const res = window.services.extractAllProjects(editors.value);
      if (res && res.success) {
        projects.value = res.projects || [];
        editorSources.value = res.editorSources || [];

        // 首次加载时，默认选中所有编辑器
        if (selectedEditors.value.length === 0 && res.editorSources.length > 0) {
          selectedEditors.value = res.editorSources.map(source => source.editor);
        }

        if (projects.value.length === 0) {
          error.value = '未找到任何项目';
        }
      } else {
        error.value = res.message || '提取项目失败';
      }
    } else {
      error.value = '预加载服务中未暴露 extractAllProjects';
    }
  } catch (err) {
    error.value = err.message || String(err);
  } finally {
    loading.value = false;
  }
};

// 在文件管理器中打开
const openInFolder = (projectPath) => {
  try {
    const res = window.services.showProjectInFolder(projectPath);
    if (!res.success) {
      message.error(`打开失败: ${res.message}`);
    }
  } catch (err) {
    message.error(`打开失败: ${err.message}`);
  }
};

// 使用编辑器打开项目
const openWithEditor = (projectPath, editorName) => {
  try {
    // 查找匹配的编辑器配置
    const normalizedName = editorName.toLowerCase().replace(/\s+/g, '');
    let editorConfig = null;

    for (const [key, config] of Object.entries(editors.value)) {
      const configName = config.name.toLowerCase().replace(/\s+/g, '');
      if (configName === normalizedName || key === normalizedName) {
        editorConfig = config;
        break;
      }
    }

    if (!editorConfig || !editorConfig.executablePath) {
      message.warning(`请先在配置页面设置 ${editorName} 的可执行文件路径`);
      return;
    }

    if (window.services && typeof window.services.openProjectWithEditor === 'function') {
      const res = window.services.openProjectWithEditor(projectPath, editorConfig.executablePath);
      if (res.success) {
        message.success(`正在使用 ${editorName} 打开项目...`);
      } else {
        message.error(`打开失败: ${res.message}`);
      }
    }
  } catch (err) {
    message.error(`打开失败: ${err.message}`);
  }
};

// 获取编辑器图标
const getEditorIcon = (editorName) => {
  // 尝试多种匹配方式
  const normalizedName = editorName.toLowerCase().replace(/\s+/g, '');

  // 直接匹配
  if (editors.value[normalizedName]) {
    return editors.value[normalizedName].icon;
  }

  // 遍历查找匹配的配置
  for (const [key, config] of Object.entries(editors.value)) {
    const configName = config.name.toLowerCase().replace(/\s+/g, '');
    if (configName === normalizedName || key === normalizedName) {
      return config.icon;
    }
  }

  return 'img/code.png';
};

// 获取编辑器显示名称（已经是正确的名称，直接返回）
const getEditorDisplayName = (editorName) => {
  return editorName;
};

// 高亮匹配文本
const highlightText = (text, keyword) => {
  if (!keyword || !keyword.trim()) {
    return text;
  }

  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedKeyword})`, 'gi');
  return text.replace(regex, '<mark class="highlight">$1</mark>');
};

// 切换编辑器筛选
const toggleEditor = (editorName) => {
  const index = selectedEditors.value.indexOf(editorName);
  if (index > -1) {
    selectedEditors.value.splice(index, 1);
  } else {
    selectedEditors.value.push(editorName);
  }
};

// 全选/取消全选
const toggleAll = () => {
  if (selectedEditors.value.length === availableEditors.value.length) {
    selectedEditors.value = [];
  } else {
    selectedEditors.value = [...availableEditors.value];
  }
};

// 设置子输入框
const setupSubInput = () => {
  // 使用 nextTick 和 setTimeout 确保 DOM 完全渲染且 uTools 已初始化
  nextTick(() => {
    setTimeout(() => {
      if (window.utools && typeof window.utools.setSubInput === 'function') {
        window.utools.setSubInput(({ text }) => {
          searchKeyword.value = text;
        }, '搜索项目名称或路径...', true);
      }
    }, 100);
  });
};

// 移除子输入框
const removeSubInput = () => {
  if (window.utools && typeof window.utools.removeFeature === 'function') {
    window.utools.removeFeature();
  }
};

onMounted(() => {
  loadProjects();
  setupSubInput();
});

// 组件卸载前清理
onBeforeUnmount(() => {
  removeSubInput();
});
</script>

<template>
  <div class="home-view">
    <!-- 顶部筛选栏 -->
    <div class="filter-bar">
      <div class="filter-section">
        <div class="editor-filters">
          <a-checkbox :checked="selectedEditors.length === availableEditors.length && availableEditors.length > 0"
            :indeterminate="selectedEditors.length > 0 && selectedEditors.length < availableEditors.length"
            @change="toggleAll" :disabled="availableEditors.length === 0">
            全部
          </a-checkbox>
          <a-checkbox v-for="editorName in availableEditors" :key="editorName"
            :checked="selectedEditors.includes(editorName)" @change="() => toggleEditor(editorName)">
            <img :src="getEditorIcon(editorName)" class="filter-icon" :alt="editorName" />
            {{ editorName }}
          </a-checkbox>
        </div>
      </div>

      <a-button @click="loadProjects" :loading="loading">
        <template #icon>
          <ReloadOutlined />
        </template>
        刷新
      </a-button>
    </div>

    <!-- 项目统计 -->
    <div class="stats-bar" v-if="!loading && !error">
      <span>共找到 {{ filteredProjects.length }} 个项目</span>
      <span v-if="editorSources.length > 0" style="margin-left: 16px; color: #999;">
        来自
        <span v-for="(source, idx) in editorSources" :key="idx">
          {{ source.editor }} ({{ source.projectCount }})
          <span v-if="idx < editorSources.length - 1">、</span>
        </span>
      </span>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <a-spin size="large" />
      <p>正在扫描项目...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <p>第一次使用请前往配置界面，点击"搜索填充全部"或者手动完成编辑器设置</p>
      <a-button type="primary" @click="loadProjects">重试</a-button>
    </div>

    <!-- 空状态 -->
    <div v-else-if="filteredProjects.length === 0" class="empty-state">
      <p>{{ selectedEditors.length === 0 ? '请至少选择一个编辑器' : '未找到符合条件的项目' }}</p>
    </div>

    <!-- 项目卡片列表 -->
    <div v-else class="projects-grid">
      <div v-for="project in filteredProjects" :key="project.path" class="project-card">
        <div class="project-header">
          <div class="project-name" :title="project.name" v-html="highlightText(project.name, searchKeyword)">
          </div>
          <div class="project-actions">
            <img v-for="editor in project.editors.filter(e => selectedEditors.includes(e))" :key="editor"
              :src="getEditorIcon(editor)" :alt="getEditorDisplayName(editor)"
              :title="`使用 ${getEditorDisplayName(editor)} 打开`" class="editor-icon"
              @click.stop="openWithEditor(project.path, editor)" />
          </div>
        </div>

        <div class="project-path" :title="`${project.path} - 点击在文件管理器中打开`" @click="openInFolder(project.path)"
          v-html="highlightText(project.path, searchKeyword)">
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-view {
  padding: 16px;
  height: 100%;
  overflow-y: auto;
}

.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: 8px;
}

.filter-section {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.filter-label {
  font-weight: 500;
  white-space: nowrap;
}

.editor-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.filter-icon {
  width: 16px;
  height: 16px;
  margin-right: 4px;
  vertical-align: middle;
}

.stats-bar {
  padding: 8px 16px;
  font-size: 14px;
  color: #666;
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.loading-state p,
.error-state p,
.empty-state p {
  margin-top: 16px;
  color: #999;
}

.projects-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 0 4px;
}

.project-card {
  border: 1px solid var(--border-color, #e8e8e8);
  border-radius: 8px;
  padding: 10px;
  transition: all 0.3s;
  width: fit-content;
  max-width: 500px;
}

.project-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: var(--primary-color, #1890ff);
}

.project-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  gap: 8px;
}

.project-name {
  font-size: 16px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.project-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.project-path {
  font-size: 12px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.2s;
}

.project-path:hover {
  color: var(--primary-color, #1890ff);
}

.editor-icon {
  width: 20px;
  height: 20px;
  cursor: pointer;
  transition: transform 0.2s;
  border-radius: 4px;
}

.editor-icon:hover {
  transform: scale(1.15);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* 高亮样式 */
:deep(.highlight) {
  background: transparent;
  color: yellow;
  padding: 0;
}
</style>