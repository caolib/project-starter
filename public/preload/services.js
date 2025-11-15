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
  // 跨平台查找命令的可执行路径（使用 which 包）
  findCommandPath(command = 'code') {
    const startTime = Date.now()
    try {
      const which = require('which')

      // 使用 which.sync 同步查找命令
      // 设置选项以查找所有匹配项
      try {
        let allPaths = which.sync(command, { all: true })
        const whichTime = Date.now() - startTime
        // console.log(`[findCommandPath] which.sync 耗时 ${whichTime}ms`)

        // Windows 下去重(不区分大小写)
        if (allPaths && allPaths.length > 1 && process.platform === 'win32') {
          const seen = new Map()
          allPaths = allPaths.filter(p => {
            const lower = p.toLowerCase()
            if (seen.has(lower)) return false
            seen.set(lower, true)
            return true
          })
        }

        if (!allPaths || allPaths.length === 0) {
          return {
            success: false,
            message: `未找到命令: ${command}`,
            command: command
          }
        }

        // Windows 优先级: .bat > .cmd > .exe > 其他
        // bat 文件通常在编辑器安装目录,cmd 可能来自 Toolbox
        const isWindows = process.platform === 'win32'
        let bestMatch

        if (isWindows) {
          const batFile = allPaths.find((p) => /\.bat$/i.test(p))
          const cmdFile = allPaths.find((p) => /\.cmd$/i.test(p))
          const exeFile = allPaths.find((p) => /\.exe$/i.test(p))

          // 优先使用 bat 文件
          if (batFile) {
            bestMatch = batFile
          }
          // 如果只有 cmd 文件(来自 Toolbox),尝试解析出 exe 路径
          else if (cmdFile && !batFile && !exeFile) {
            // console.log('[findCommandPath] 只找到 cmd 文件,尝试解析 exe 路径')
            const parseResult = this.parseCmdFile(cmdFile)
            if (parseResult.success) {
              bestMatch = parseResult.path
              // console.log('[findCommandPath] 使用解析出的 exe 路径:', bestMatch)
            } else {
              bestMatch = cmdFile
              // console.log('[findCommandPath] 解析失败,使用 cmd 文件')
            }
          }
          // 否则按优先级选择
          else {
            bestMatch = cmdFile || exeFile || allPaths[0]
          }

          // console.log(`[findCommandPath] Windows 优先级选择: bat=${batFile}, cmd=${cmdFile}, exe=${exeFile}, 最终=${bestMatch}`)
        } else {
          bestMatch = allPaths[0]
        }

        const totalTime = Date.now() - startTime
        // console.log(`[findCommandPath] 总耗时 ${totalTime}ms`)

        return {
          success: true,
          path: bestMatch,
          all: allPaths,
          command: command,
          platform: process.platform
        }
      } catch (error) {
        // which 抛出异常表示未找到命令
        return {
          success: false,
          message: `未找到命令: ${command}`,
          details: error.message,
          command: command,
          platform: process.platform
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `查找命令时出错: ${error.message}`,
        stack: error.stack,
        command: command
      }
    }
  }
  ,
  // 解析 .cmd 文件,提取其中的 .exe 路径
  parseCmdFile(cmdFilePath) {
    try {
      // console.log('[parseCmdFile] 解析 cmd 文件:', cmdFilePath)
      const content = fs.readFileSync(cmdFilePath, { encoding: 'utf-8' })

      // 匹配 start 命令中的 exe 路径
      // 支持两种格式:
      // 1. start "" %waitarg% C:\Users\...\bin\pycharm64.exe %intellij_args%
      // 2. start "" %waitarg% "C:\Users\...\bin\studio64.exe" %intellij_args%

      // 先尝试匹配带引号的路径
      let exeMatch = content.match(/start\s+""\s+(?:%\w+%\s+)?"([A-Z]:[^"]+\.exe)"/i)

      // 如果没匹配到,尝试匹配不带引号的路径
      if (!exeMatch) {
        exeMatch = content.match(/start\s+""\s+(?:%\w+%\s+)?([A-Z]:[^\n\r%\s]+\.exe)/i)
      }

      if (exeMatch && exeMatch[1]) {
        const exePath = exeMatch[1].trim()
        // console.log('[parseCmdFile] 找到 exe 路径:', exePath)

        if (fs.existsSync(exePath)) {
          return {
            success: true,
            path: exePath
          }
        } else {
          // console.log('[parseCmdFile] exe 文件不存在:', exePath)
          return {
            success: false,
            message: 'exe 文件不存在'
          }
        }
      }

      // console.log('[parseCmdFile] 未找到 exe 路径,文件内容前500字符:', content.substring(0, 500))
      return {
        success: false,
        message: '未在 cmd 文件中找到 exe 路径'
      }
    } catch (error) {
      console.error('[parseCmdFile] 解析失败:', error)
      return {
        success: false,
        message: error.message
      }
    }
  }
  ,
  // 在可执行文件目录中查找图标
  findIconInBinDir(executablePath, baseName) {
    try {
      const binDir = path.dirname(executablePath)
      const possibleIcons = [
        path.join(binDir, baseName + '.svg'),
        path.join(binDir, baseName + '.png'),
        path.join(binDir, baseName + '.ico')
      ]

      for (const iconFile of possibleIcons) {
        if (fs.existsSync(iconFile)) {
          return {
            success: true,
            path: iconFile
          }
        }
      }

      return {
        success: false,
        message: '未找到图标文件'
      }
    } catch (error) {
      return {
        success: false,
        message: error.message
      }
    }
  }
  ,
  // 在指定目录下递归搜索文件
  searchFile(startPath, fileName, pathMustContain = null) {
    const results = []
    let filesChecked = 0
    let dirsChecked = 0

    function searchRecursive(currentPath, depth = 0) {
      // 限制搜索深度，避免搜索过深
      if (depth > 10) {
        // console.log(`[searchFile] 达到最大深度限制 (${depth}):`, currentPath)
        return
      }

      try {
        const items = fs.readdirSync(currentPath)
        dirsChecked++

        for (const item of items) {
          try {
            const fullPath = path.join(currentPath, item)
            const stat = fs.statSync(fullPath)

            if (stat.isDirectory()) {
              // 跳过 plugins 文件夹
              if (item === 'plugins') {
                // console.log(`[searchFile] 跳过 plugins 目录: ${fullPath}`)
                continue
              }
              // 继续递归搜索
              searchRecursive(fullPath, depth + 1)
            } else if (stat.isFile() && item === fileName) {
              filesChecked++
              // console.log(`[searchFile] 找到文件: ${fullPath}`)
              // 如果指定了路径必须包含的文件夹名
              if (pathMustContain) {
                // 检查完整路径中是否包含该文件夹名
                if (fullPath.includes(path.sep + pathMustContain + path.sep) ||
                  fullPath.includes(path.sep + pathMustContain)) {
                  // console.log(`[searchFile] 匹配关键字 "${pathMustContain}": ${fullPath}`)
                  results.push(fullPath)
                } else {
                  // console.log(`[searchFile] 不匹配关键字 "${pathMustContain}": ${fullPath}`)
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
        // console.log(`[searchFile] 无法访问目录:`, currentPath, err.message)
      }
    }

    try {
      // console.log(`[searchFile] 开始搜索: startPath=${startPath}, fileName=${fileName}, pathMustContain=${pathMustContain}`)
      if (!fs.existsSync(startPath)) {
        // console.log(`[searchFile] 起始路径不存在: ${startPath}`)
        return { success: false, message: '起始路径不存在', results: [] }
      }
      searchRecursive(startPath)
      // console.log(`[searchFile] 搜索完成: 检查了 ${dirsChecked} 个目录, ${filesChecked} 个匹配文件名, 最终结果 ${results.length} 个`)
      return { success: true, results, count: results.length }
    } catch (error) {
      console.error(`[searchFile] 搜索出错:`, error)
      return { success: false, message: error.message, results: [] }
    }
  }
  ,
  // 搜索 storage.json 文件（在 AppData/Roaming 下的 globalStorage 文件夹中）
  searchStorageJson() {
    try {
      const startTime = Date.now()
      // 获取 AppData/Roaming 路径
      const roamingPath = window.utools.getPath('appData')
      // console.log('[searchStorageJson] roamingPath:', roamingPath)
      const results = []

      // VSCode 系列编辑器的常见文件夹名
      const vscodeEditors = ['Code', 'Cursor', 'Qoder', 'Trae', 'VSCodium', 'Code - Insiders']

      for (const editorName of vscodeEditors) {
        const editorPath = path.join(roamingPath, editorName)
        if (fs.existsSync(editorPath)) {
          // console.log(`[searchStorageJson] 检查 ${editorName} 目录:`, editorPath)

          // 查找 User/globalStorage/storage.json
          const storagePath = path.join(editorPath, 'User', 'globalStorage', 'storage.json')
          if (fs.existsSync(storagePath)) {
            // console.log(`[searchStorageJson] 找到 storage.json:`, storagePath)
            results.push(storagePath)
          }
        }
      }

      const elapsed = Date.now() - startTime
      // console.log(`[searchStorageJson] 搜索完成，耗时 ${elapsed}ms，找到 ${results.length} 个文件`)
      return { success: true, results, count: results.length }
    } catch (error) {
      console.error('[searchStorageJson] 搜索失败:', error)
      return { success: false, message: error.message, results: [] }
    }
  },

  // 搜索 JetBrains 系列编辑器的 recentProjects.xml 文件
  searchRecentProjectsXml() {
    try {
      const startTime = Date.now()
      // 获取 AppData/Roaming 路径
      const roamingPath = window.utools.getPath('appData')
      // console.log('[searchRecentProjectsXml] roamingPath:', roamingPath)
      const results = []

      // 搜索 JetBrains 目录下的编辑器文件夹，直接在 options 中查找
      const jetbrainsPath = path.join(roamingPath, 'JetBrains')
      // console.log('[searchRecentProjectsXml] 搜索 JetBrains 目录:', jetbrainsPath)
      if (fs.existsSync(jetbrainsPath)) {
        const editorFolders = fs.readdirSync(jetbrainsPath)
        // console.log(`[searchRecentProjectsXml] JetBrains 目录下有 ${editorFolders.length} 个文件夹`)
        for (const folder of editorFolders) {
          const optionsPath = path.join(jetbrainsPath, folder, 'options', 'recentProjects.xml')
          if (fs.existsSync(optionsPath)) {
            // console.log('[searchRecentProjectsXml] 找到 JetBrains 文件:', optionsPath)
            results.push(optionsPath)
          }
        }
      }

      // 搜索 Google 目录下的编辑器文件夹 (Android Studio)
      const googlePath = path.join(roamingPath, 'Google')
      // console.log('[searchRecentProjectsXml] 搜索 Google 目录:', googlePath)
      if (fs.existsSync(googlePath)) {
        const editorFolders = fs.readdirSync(googlePath)
        // console.log(`[searchRecentProjectsXml] Google 目录下有 ${editorFolders.length} 个文件夹`)
        for (const folder of editorFolders) {
          const optionsPath = path.join(googlePath, folder, 'options', 'recentProjects.xml')
          if (fs.existsSync(optionsPath)) {
            // console.log('[searchRecentProjectsXml] 找到 Google 文件:', optionsPath)
            results.push(optionsPath)
          }
        }
      }

      const elapsed = Date.now() - startTime
      // console.log(`[searchRecentProjectsXml] 搜索完成，耗时 ${elapsed}ms，找到 ${results.length} 个文件`)
      return { success: true, results, count: results.length }
    } catch (error) {
      console.error('[searchRecentProjectsXml] 错误:', error)
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
  },

  // 从 JetBrains recentProjects.xml 文件中提取项目路径
  extractProjectsFromRecentProjectsXml(xmlFilePath) {
    try {
      const content = fs.readFileSync(xmlFilePath, { encoding: 'utf-8' })
      const projects = new Set()

      // 使用正则表达式提取项目路径
      // 匹配: <entry key="C:/code/...">
      const entryPattern = /<entry key="([^"]+)">/g
      let match

      while ((match = entryPattern.exec(content)) !== null) {
        let projectPath = match[1]

        // 将路径规范化
        // C:/code/... -> C:\code\...
        projectPath = projectPath.replace(/\//g, path.sep)

        // 检查路径是否存在
        if (fs.existsSync(projectPath)) {
          projects.add(projectPath)
        }
      }

      const projectsList = Array.from(projects)

      return {
        success: true,
        projects: projectsList,
        count: projectsList.length,
        source: xmlFilePath
      }
    } catch (error) {
      return { success: false, message: error.message, projects: [] }
    }
  }
  ,
  // 从所有找到的 storage.json 和 recentProjects.xml 文件中提取项目
  // 接收编辑器配置，优先使用配置的 storagePath/recentProjectsPath
  extractAllProjects(editorsConfig) {
    try {
      const projectSources = []

      // 如果提供了编辑器配置，优先使用配置的路径
      if (editorsConfig) {
        Object.entries(editorsConfig).forEach(([key, config]) => {
          // VSCode 系列：使用 storagePath
          if (config.storagePath && fs.existsSync(config.storagePath)) {
            projectSources.push({
              path: config.storagePath,
              editorName: config.name || key,
              type: 'vscode'
            })
          }
          // JetBrains 系列：使用 recentProjectsPath
          else if (config.recentProjectsPath && fs.existsSync(config.recentProjectsPath)) {
            projectSources.push({
              path: config.recentProjectsPath,
              editorName: config.name || key,
              type: 'jetbrains'
            })
          }
        })
      }

      // 如果没有配置或配置为空，回退到自动搜索
      if (projectSources.length === 0) {
        // 搜索 VSCode 系列
        const storageResult = this.searchStorageJson()
        if (storageResult.success && storageResult.results.length > 0) {
          storageResult.results.forEach(storageFile => {
            const editorName = path.basename(path.dirname(path.dirname(path.dirname(storageFile))))
            projectSources.push({
              path: storageFile,
              editorName,
              type: 'vscode'
            })
          })
        }

        // 搜索 JetBrains 系列
        const jetbrainsResult = this.searchRecentProjectsXml()
        if (jetbrainsResult.success && jetbrainsResult.results.length > 0) {
          jetbrainsResult.results.forEach(xmlFile => {
            // 从路径中提取编辑器名称
            // C:\...\JetBrains\IntelliJIdea2025.1\options\recentProjects.xml -> IntelliJIdea2025.1
            // C:\...\Google\AndroidStudio2024.3.2\options\recentProjects.xml -> AndroidStudio2024.3.2
            const parts = xmlFile.split(path.sep)
            const optionsIndex = parts.lastIndexOf('options')
            const editorName = optionsIndex > 0 ? parts[optionsIndex - 1] : 'JetBrains IDE'

            projectSources.push({
              path: xmlFile,
              editorName,
              type: 'jetbrains'
            })
          })
        }

        if (projectSources.length === 0) {
          return {
            success: false,
            message: '未找到 storage.json 或 recentProjects.xml 文件，请在配置页面设置编辑器路径',
            projects: [],
            editorSources: []
          }
        }
      }

      // 项目路径 -> 编辑器列表的映射
      const projectEditorMap = new Map()
      const editorSources = []

      projectSources.forEach(({ path: sourcePath, editorName, type }) => {
        let result

        // 根据类型调用不同的提取函数
        if (type === 'vscode') {
          result = this.extractProjectsFromStorage(sourcePath)
        } else if (type === 'jetbrains') {
          result = this.extractProjectsFromRecentProjectsXml(sourcePath)
        }

        if (result && result.success) {
          editorSources.push({
            editor: editorName,
            path: sourcePath,
            projectCount: result.count,
            type: type
          })

          // 为每个项目记录编辑器来源
          result.projects.forEach(projectPath => {
            if (!projectEditorMap.has(projectPath)) {
              projectEditorMap.set(projectPath, [])
            }
            projectEditorMap.get(projectPath).push(editorName)
          })
        }
      })

      // 转换为数组格式，包含项目路径和编辑器列表
      const projects = Array.from(projectEditorMap.entries()).map(([projectPath, editors]) => {
        const projectName = path.basename(projectPath)
        return {
          name: projectName,
          path: projectPath,
          editors: [...new Set(editors)] // 去重
        }
      }).sort((a, b) => a.name.localeCompare(b.name))

      return {
        success: true,
        projects,
        count: projects.length,
        editorSources
      }
    } catch (error) {
      return { success: false, message: error.message, projects: [], editorSources: [] }
    }
  }
  ,
  // 在文件管理器中显示项目文件夹
  showProjectInFolder(projectPath) {
    try {
      window.utools.shellShowItemInFolder(projectPath)
      return { success: true }
    } catch (error) {
      return { success: false, message: error.message }
    }
  }
  ,
  // 使用指定编辑器打开项目
  openProjectWithEditor(projectPath, editorExecutablePath) {
    try {
      const { exec } = require('child_process')
      // 使用编辑器可执行文件打开项目目录
      exec(`"${editorExecutablePath}" "${projectPath}"`, (error) => {
        if (error) {
          console.error('打开项目失败:', error)
        }
      })
      return { success: true }
    } catch (error) {
      return { success: false, message: error.message }
    }
  }
}
