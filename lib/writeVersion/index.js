/**
 *Created by limbo <yykaue@qq.com> on 2022/6/7.
 */

const fs = require('fs')
const crypto = require('crypto')

const writeVersion = (payload = {}) => {
	const {
		argv = {},
		jsIndex = 0,
		jsDirPath, // js文件夹路径
		htmlPath, // html文件路径
		packageJsonPath, // package.json路径
		outputJsonPath // 输出json路径
	} = payload

	const hash = getJsFileName(jsDirPath, jsIndex)
  const md5 = getHtmlMd5(htmlPath)
  const paramsArgv = {
		versionDomId: 'pkg-v-limbo',
    versionKey: 'md5', // 版本检测key
    silence: 'true', // 是否静默
    hash,
    md5,
    ...argv
  }

  readFile(htmlPath, paramsArgv[paramsArgv.versionKey], paramsArgv.versionDomId)
	setVersion(packageJsonPath, outputJsonPath, paramsArgv)
}

/**
 * 获取js文件名
 * @param jsDirPath js文件夹路径
 * @param jsIndex 选取js下标
 * @returns {*|string}
 */
const getJsFileName = (jsDirPath, jsIndex) => {
	const files = fs.readdirSync(jsDirPath)
	const name = files[jsIndex] || ''
	return name
}

/**
 * 获取index的md5
 * @param htmlPath html文件路径
 * @returns {Promise<ArrayBuffer>}
 */
const getHtmlMd5 = (htmlPath) => {
  const buffer = fs.readFileSync(htmlPath)
  const md5hash = crypto.createHash('md5')
  md5hash.update(buffer, 'utf8')
  return md5hash.digest('hex')
}

/**
 * 读取文件
 * @param path 文件路径
 * @param message 插入的信息
 * @param versionDomId 版本DOM元素的ID
 */
const readFile = (path, message, versionDomId) => {
  fs.readFile(path, 'utf8', (err, data) => {
    if (err) {
      console.log('文件读取错误', err)
    } else {
      let dataStr = data.toString()
      dataStr = dataStr.replace('<body>', `<body><div id="${versionDomId}" style="display: none">${message}</div>`)
      writeFile(path, dataStr)
    }
  })
}

/**
 * 重写文件
 * @param path 文件路径
 * @param text 输入的文本内容
 */
const writeFile = (path, text) => {
  fs.writeFile(path, text, err => {
    if (err) {
      return console.error(err)
    }
    console.log('已植入版本信息')
  })
}

/**
 * 写入version.json
 * @param packageJsonPath package.json路径
 * @param outputJsonPath 输出json路径
 * @param paramsArgv paramsArgv参数
 */
const setVersion = (packageJsonPath, outputJsonPath, paramsArgv) => {
  const _package = require(packageJsonPath)
  const versionJson = {
    name: _package.name,
    version: _package.version,
    ...paramsArgv
  }
  const jsonStr = JSON.stringify(versionJson, '', '\t')
  fs.writeFile(outputJsonPath, jsonStr, err => {
    if (err) {
      return console.error(err)
    }
    console.log(`version.json 写入成功！ 当前 versionKey => { ${paramsArgv.versionKey}: ${paramsArgv[paramsArgv.versionKey]} }`)
  })
}

export default writeVersion
