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
}
