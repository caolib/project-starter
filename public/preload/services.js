const fs = require('node:fs')
const path = require('node:path')

// 通过 window 对象向渲染进程注入 nodejs 能力
window.services = {
  // 读文件
  readFile(file) {
    return fs.readFileSync(file, { encoding: 'utf-8' })
  },
  // 文本写入到下载目录
  writeTextFile(text) {
    const filePath = path.join(window.utools.getPath('downloads'), Date.now().toString() + '.txt')
    fs.writeFileSync(filePath, text, { encoding: 'utf-8' })
    return filePath
  },
  // 图片写入到下载目录
  writeImageFile(base64Url) {
    const matchs = /^data:image\/([a-z]{1,20});base64,/i.exec(base64Url)
    if (!matchs) return
    const filePath = path.join(window.utools.getPath('downloads'), Date.now().toString() + '.' + matchs[1])
    fs.writeFileSync(filePath, base64Url.substring(matchs[0].length), { encoding: 'base64' })
    return filePath
  },
  // 导出JSON配置文件
  exportConfig(configData, defaultFileName = 'config.json') {
    try {
      const savePath = window.utools.showSaveDialog({
        title: '保存配置文件',
        defaultPath: path.join(window.utools.getPath('documents'), defaultFileName),
        buttonLabel: '保存',
        filters: [
          { name: 'JSON文件', extensions: ['json'] },
          { name: '所有文件', extensions: ['*'] }
        ]
      })

      if (savePath) {
        const jsonStr = JSON.stringify(configData, null, 2)
        fs.writeFileSync(savePath, jsonStr, { encoding: 'utf-8' })
        return { success: true, path: savePath }
      }
      return { success: false, message: '用户取消保存' }
    } catch (error) {
      return { success: false, message: error.message }
    }
  },
  // 导入JSON配置文件
  importConfig() {
    try {
      const openPath = window.utools.showOpenDialog({
        title: '选择配置文件',
        defaultPath: window.utools.getPath('documents'),
        buttonLabel: '导入',
        filters: [
          { name: 'JSON文件', extensions: ['json'] },
          { name: '所有文件', extensions: ['*'] }
        ],
        properties: ['openFile']
      })

      if (openPath && openPath.length > 0) {
        const filePath = openPath[0]
        const content = fs.readFileSync(filePath, { encoding: 'utf-8' })
        const config = JSON.parse(content)
        return { success: true, data: config, path: filePath }
      }
      return { success: false, message: '用户取消选择' }
    } catch (error) {
      return { success: false, message: error.message }
    }
  }
  ,
  // 在 Windows 上查找命令的可执行路径（使用 where.exe）
  findCommandPath(command = 'code') {
    try {
      const { execSync } = require('child_process')
      // 使用 where.exe 精确查询 windows 可执行路径
      const out = execSync(`where.exe ${command}`, { encoding: 'utf-8' })
      const lines = out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)

      if (lines.length === 0) {
        return { success: false, message: `未找到命令: ${command}` }
      }

      // 优先级：.cmd > .exe > .bat > 其他
      const cmdFile = lines.find((l) => /\.cmd$/i.test(l))
      const exeFile = lines.find((l) => /\.exe$/i.test(l))
      const batFile = lines.find((l) => /\.bat$/i.test(l))

      const bestMatch = cmdFile || exeFile || batFile || lines[0]

      return { success: true, path: bestMatch, all: lines }
    } catch (error) {
      return { success: false, message: error.message }
    }
  }
  ,
  // 在指定目录下递归搜索文件
  searchFile(startPath, fileName, pathMustContain = null) {
    const results = []

    function searchRecursive(currentPath, depth = 0) {
      // 限制搜索深度，避免搜索过深
      if (depth > 10) return

      try {
        const items = fs.readdirSync(currentPath)

        for (const item of items) {
          try {
            const fullPath = path.join(currentPath, item)
            const stat = fs.statSync(fullPath)

            if (stat.isDirectory()) {
              // 继续递归搜索
              searchRecursive(fullPath, depth + 1)
            } else if (stat.isFile() && item === fileName) {
              // 如果指定了路径必须包含的文件夹名
              if (pathMustContain) {
                // 检查完整路径中是否包含该文件夹名
                if (fullPath.includes(path.sep + pathMustContain + path.sep) ||
                  fullPath.includes(path.sep + pathMustContain)) {
                  results.push(fullPath)
                }
              } else {
                results.push(fullPath)
              }
            }
          } catch (err) {
            // 跳过无权限访问的文件/文件夹
            continue
          }
        }
      } catch (err) {
        // 跳过无权限访问的目录
      }
    }

    try {
      searchRecursive(startPath)
      return { success: true, results, count: results.length }
    } catch (error) {
      return { success: false, message: error.message, results: [] }
    }
  }
  ,
  // 搜索 storage.json 文件（在 AppData/Roaming 下的 globalStorage 文件夹中）
  searchStorageJson() {
    try {
      // 获取 AppData/Roaming 路径
      const roamingPath = window.utools.getPath('appData')

      // 搜索 storage.json，要求它在 globalStorage 文件夹下
      return this.searchFile(roamingPath, 'storage.json', 'globalStorage')
    } catch (error) {
      return { success: false, message: error.message, results: [] }
    }
  }
  ,
  // 从 VSCode 系列编辑器的 storage.json 文件中提取项目路径
  extractProjectsFromStorage(storageFilePath) {
    try {
      const content = fs.readFileSync(storageFilePath, { encoding: 'utf-8' })
      const data = JSON.parse(content)
      const projects = new Set()

      // 1. 从 profileAssociations.workspaces 提取
      if (data.profileAssociations && data.profileAssociations.workspaces) {
        Object.keys(data.profileAssociations.workspaces).forEach(uri => {
          // 跳过远程工作区 (vscode-remote://)
          if (!uri.startsWith('vscode-remote://')) {
            projects.add(uri)
          }
        })
      }

      // 2. 从 windowsState.lastActiveWindow 提取
      if (data.windowsState && data.windowsState.lastActiveWindow && data.windowsState.lastActiveWindow.folder) {
        const uri = data.windowsState.lastActiveWindow.folder
        if (!uri.startsWith('vscode-remote://')) {
          projects.add(uri)
        }
      }

      // 3. 从 backupWorkspaces.folders 提取
      if (data.backupWorkspaces && data.backupWorkspaces.folders) {
        data.backupWorkspaces.folders.forEach(item => {
          if (item.folderUri && !item.folderUri.startsWith('vscode-remote://')) {
            projects.add(item.folderUri)
          }
        })
      }

      // 解码 URI 为真实路径
      const decodedProjects = Array.from(projects).map(uri => {
        try {
          // file:///c%3A/code/... -> c:/code/...
          let decoded = decodeURIComponent(uri.replace('file:///', ''))
          // 将 / 替换为 Windows 路径分隔符
          decoded = decoded.replace(/\//g, path.sep)
          return decoded
        } catch (err) {
          return uri
        }
      }).filter(p => p && fs.existsSync(p)) // 只返回存在的路径

      return {
        success: true,
        projects: decodedProjects,
        count: decodedProjects.length,
        source: storageFilePath
      }
    } catch (error) {
      return { success: false, message: error.message, projects: [] }
    }
  }
  ,
  // 从所有找到的 storage.json 文件中提取项目
  extractAllProjects() {
    try {
      const searchResult = this.searchStorageJson()
      if (!searchResult.success || searchResult.results.length === 0) {
        return { success: false, message: '未找到 storage.json 文件', allProjects: [], sources: [] }
      }

      const allProjects = new Set()
      const sources = []

      searchResult.results.forEach(storageFile => {
        const result = this.extractProjectsFromStorage(storageFile)
        if (result.success) {
          result.projects.forEach(p => allProjects.add(p))
          sources.push({
            editor: path.basename(path.dirname(path.dirname(path.dirname(storageFile)))), // Code/Qoder/Trae
            path: storageFile,
            projectCount: result.count
          })
        }
      })

      return {
        success: true,
        allProjects: Array.from(allProjects).sort(),
        count: allProjects.size,
        sources
      }
    } catch (error) {
      return { success: false, message: error.message, allProjects: [], sources: [] }
    }
  }
}
