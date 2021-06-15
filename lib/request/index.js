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

function errMsgFn (res, url) {
  console.log('%c 接口 ', 'color:red;background:#6cf', res)

  Notification({
    title: '错误提示',
    dangerouslyUseHTMLString: true,
    message: `<p style="word-break: break-all">接口信息：${url}</p>
              <p style="word-break: break-all">${res.data.errCode || res.data.errcode || res.data.err_code}：${res.data.errMsg || res.data.errmsg || res.data.err_msg}</p>`,
    type: 'error'
  })
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
    condition
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

  return function ({ method, url, params, state, resolveErrFn }) {
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
        let flag = false
        if (condition) {
          for(let key in condition) {
            if (res.data[key] === condition[key]) {
              flag = true
            }
          }
        }

        if (condition && !flag) {
          resolveErrFn && resolveErrFn({ method, url, params, state, res })

          // state.type: [1, 2]用catch处理异常；[3, 4]使用正常逻辑；其中[2, 4]静默处理，提示报错信息
          switch (state.type) {
            case 1:
              errMsgFn(res, url)
              reject({
                ...res.data,
                headers: res.headers
              })
              break
            case 2:
              reject({
                ...res.data,
                headers: res.headers
              })
              break
            case 3:
              errMsgFn(res, url)
              resolve({
                ...res.data,
                headers: res.headers
              })
              break
            case 4:
              resolve({
                ...res.data,
                headers: res.headers
              })
              break
            default:
              errMsgFn(res, url)
              break
          }

        } else {
          resolve({
            ...res.data,
            headers: res.headers
          })
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
