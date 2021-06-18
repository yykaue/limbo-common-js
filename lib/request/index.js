/**
 *Created by limbo <yykaue@qq.com> on 2019/8/1.
 */
import axios from 'axios'
import {
  Notification
} from 'element-ui'

const baseURL = ''
const Instance = axios.create()
const codeMessage = {
  200: '服务器成功返回请求的数据。',
  201: '新建或修改数据成功。',
  202: '一个请求已经进入后台排队（异步任务）。',
  204: '删除数据成功。',
  400: '发出的请求有错误，服务器没有进行新建或修改数据的操作。',
  401: '用户没有权限（令牌、用户名、密码错误）。',
  403: '用户得到授权，但是访问是被禁止的。',
  404: '发出的请求针对的是不存在的记录，服务器没有进行操作。',
  406: '请求的格式不可得。',
  410: '请求的资源被永久删除，且不会再得到的。',
  422: '当创建一个对象时，发生一个验证错误。',
  500: '服务器发生错误，请检查服务器。',
  502: '网关错误。',
  503: '服务不可用，服务器暂时过载或维护。',
  504: '网关超时。'
}

/**
 *
 * @param service type:Object
 * eg. {
 *  timeout: 2000,
 *  requestResolve: fn1(),
 *  requestReject: fn2(),
 *  responseResolve: fn3(),
 *  responseReject: fn4(),
 *  condition: { code: 200, errCode: 0, err_code: 1 }
 *  errMessage: { code: 'code', msg: 'msg' }
 * }
 * @returns {function({method?: *, url?: *, params?: *, state?: *, resolveErrFn?: *}): Promise<unknown>}
 */
function connector (service = {}) {
  const {
    timeout,
    requestResolve,
    requestReject,
    responseResolve,
    responseReject,
    condition,
    errMessage
  } = service
  Instance.defaults.timeout = timeout

  // 请求拦截器
  Instance.interceptors.request.use(config => {
    requestResolve && requestResolve(config)
    return config
  }, err => {
    requestReject && requestReject(err)

    return Promise.reject(err)
  })

  // 响应拦截器
  Instance.interceptors.response.use(config => {
    // if(config.status !== 200){
    //   Notification({
    //     title: '接口报错',
    //     message: `${config.status}`,
    //     type: 'error'
    //   })
    // }
    responseResolve && responseResolve(config)
    return config
  }, err => {
    let message
    if (err.response) {
      message = `${err.response.status}：${codeMessage[err.response.status] || err.message}`
    } else {
      message = `错误信息：${err.message}`
    }
    console.log('%c errorResponse ', 'color:red;background:#6cf', err.response)
    Notification({
      title: '接口报错',
      dangerouslyUseHTMLString: true,
      message: `<p style="word-break: break-all">${message}</p>
                <p style="word-break: break-all">${err.response && err.response.config ? `接口信息：${err.response.config.url}` : ''}</p>`,
      type: 'error'
    })
    responseReject && responseReject(err)

    return Promise.reject(err)
  })

  function errMsgFn (res, url, _errMsg = {}) {
    console.log('%c 接口 ', 'color:red;background:#6cf', res)
    const code = _errMsg.code || errMessage && errMessage.code
    const msg = _errMsg.msg || errMessage && errMessage.msg
    const _code = code.find(item => res.data[item])
    const _msg = msg.find(item => res.data[item])
    Notification({
      title: '错误提示',
      dangerouslyUseHTMLString: true,
      message: `<p style="word-break: break-all">接口信息：${url}</p>
              <p style="word-break: break-all">${res.data[_code]}：${res.data[_msg]}</p>`,
      type: 'error'
    })
  }

  return function ({ method, url, params, state = {}, resolveErrFn }) {
    let headers
    if (state.contentType) {
      headers = {
        'Content-Type': state.contentType
      }
    }
    if (state.headers) {
      headers = {
        ...headers,
        ...state.headers
      }
    }
    return new Promise((resolve, reject) => {
      Instance({
        method,
        url,
        baseURL,
        headers,
        data: ['post', 'put', 'delete'].includes(method) ? params : null,
        params: method === 'get' ? params : (['post', 'put', 'delete'].includes(method) ? state.params : null),
        timeout: state.timeout,
        withCredentials: false,
        ...state.axios
      }).then(res => {
        const payload = {
          ...res.data,
          _headers: state.needHeader && res.headers
        }
        const _condition = state.condition || condition
        let flag = false

        if (_condition) {
          for(let key in _condition) {
            if (res.data[key] === _condition[key]) {
              flag = true
            }
          }
        }

        if (_condition && !flag) {
          resolveErrFn && resolveErrFn({ method, url, params, state, res })

          // state.type: [1, 2]用catch处理异常；[3, 4]使用正常逻辑；其中[2, 4]静默处理，提示报错信息
          switch (state.type) {
            case 1:
              errMsgFn(res, url, state.errMessage)
              reject(payload)
              break
            case 2:
              reject(payload)
              break
            case 3:
              errMsgFn(res, url, state.errMessage)
              resolve(payload)
              break
            case 4:
              resolve(payload)
              break
            default:
              errMsgFn(res, url, state.errMessage)
              break
          }

        } else {
          resolve(payload)
        }
      }).catch(err => {
        console.log('%c error ', 'color:red;background:#6cf', err)
        if ([1, 2].includes(state.type)) {
          reject(err)
        }
      })
    })
  }
}

export default connector
