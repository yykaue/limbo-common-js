/**
 *Created by limbo <yykaue@qq.com> on 2022/6/7.
 */ 
// 获取参数信息
const getArgv = () => {
  const arr = process.argv
  const argument = {}
  arr.forEach(item => {
    if (item.includes('--') && item.includes('=')) {
      const arr = item.split('=')
      const key = arr[0].replace(/--/, '')
      argument[key] = arr[1]
    }
  })
  return argument
}

export default getArgv
 