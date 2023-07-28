/**
 *Created by limbo <yykaue@qq.com> on 2023/7/23 23:42
 */
const infoColor = {
  primary: '#409EFF',
  success: '#67C23A',
  warning: '#E6A23C',
  danger: '#F56C6C',
  info: '#909399',
  primaryBlack: '#303133',
  regular: '#606266',
  secondary: '#909399',
  placeholder: '#C0C4CC',
  borderBase: '#DCDFE6',
  borderLight: '#E4E7ED',
  borderLighter: '#EBEEF5',
  borderExtralight: '#F2F6FC',
  transparent: 'transparent',
  black: '#000',
  white: '#fff'
}

const pad = s => s.length === 1 ? '0' + s : s

const hexToRgb = colorHex => {
  const hexString = colorHex.substr(0, 1) === '#' ? colorHex.substr(1) : colorHex
  let rgbArray = []

  if ([3, 4].includes(hexString.length)) {
    rgbArray = hexString.split('').map(s => 0x11 * parseInt(s, 16))
  } else {
    for (let i = 0; i < hexString.length; i += 2) {
      rgbArray.push(parseInt(hexString.substr(i, 2), 16))
    }
  }
  if (rgbArray.length > 3) {
    rgbArray[3] = Math.round(rgbArray[3] / 255 * 100) / 100
  }
  return rgbArray
}

const rgbToHex = (rgbArr, colorType = 'hexColor') => {
  let hex = ''
  if (colorType === 'hexColor') {
    hex = '#'
  }
  hex += ((1 << 24) + (rgbArr[0] << 16) + (rgbArr[1] << 8) + rgbArr[2]).toString(16).slice(1)
  if (rgbArr.length > 3) {
    hex += ((1 << 8) + Math.round(rgbArr[3] * 255)).toString(16).slice(1)
  }
  return hex
}

const gradientColors = (startColor, endColor = '#fff', steps = 11, colorType = 'hexColor') => {
  const colorList = []
  let sColor, eColor

  if (typeof startColor === 'string') {
    sColor = hexToRgb(startColor)
  } else {
    sColor = [...startColor]
  }
  if (typeof endColor === 'string') {
    eColor = hexToRgb(endColor)
  } else {
    eColor = [...endColor]
  }

  if (sColor.length !== 3 || eColor.length !== 3) {
    if (sColor.length === 3) {
      sColor[3] = 1
    }
    if (eColor.length === 3) {
      eColor[3] = 1
    }
  }

  for (let i = 0; i < steps; i++) {
    const endRate = i / (steps - 1)
    const startRate = 1 - endRate
    let colorHex = ''
    if (colorType === 'hexColor') {
      colorHex = '#'
    }
    const colorArr = []
    for (let j = 0; j < sColor.length; j++) {
      let stageCount
      if (j === 3) {
        stageCount = Math.round((sColor[j] * startRate + eColor[j] * endRate) * 100) / 100
      } else {
        stageCount = Math.round(sColor[j] * startRate + eColor[j] * endRate)
      }
      if (['hex', 'hexColor'].includes(colorType)) {
        if (j === 3) {
          stageCount = Math.round(stageCount * 255)
        }
        colorHex += pad(stageCount.toString(16))
      } else {
        colorArr.push(stageCount)
      }
    }
    if (['hex', 'hexColor'].includes(colorType)) {
      colorList.push(colorHex)
    } else {
      colorList.push(colorArr)
    }
  }
  return colorList
}

// styleType: ['default', 'plain']
const infoStyle = (color = '#409EFF', styleType = 'default') => {
  let style = 'margin:0 3px;padding:3px;'
  if (styleType === 'default') {
    style += `color:#fff;background:${color};border:1px solid ${color};border-radius:3px;`
  } else if (styleType === 'plain') {
    const colors = gradientColors(color)
    style += `color:${color};background:${colors[9]};border:1px solid ${colors[6]};border-radius:3px;`
  } else {
    style += 'color:#606266;background:transparent;border:1px solid #DCDFE6;border-radius:3px;'
  }
  return style
}

const printInformation = (infoArray = []) => {
  let messageString = '%climbo-common-js'
  const styleArray = ['padding:5px;color:#fadfa3;background:#030307;border:1px solid #fff;border-radius:5px;']
  const originalArray = []

  infoArray.forEach(item => {
    if (item.type === 'original') {
      originalArray.push(item.message)
    } else {
      messageString += '%c' + item.message
      styleArray.push(item.style)
    }
  })
  console.log(messageString, ...styleArray, ...originalArray)
}

export {
  infoColor,
  hexToRgb,
  rgbToHex,
  gradientColors,
  infoStyle,
  printInformation
}
