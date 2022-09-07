/**
 *Created by limbo <yykaue@qq.com> on 2019/8/1.
 */
import axios from 'axios'
import JSONBigint from 'json-bigint'

class PureHttp {
  codeMessage = {
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

  static mAxios = axios.create()
  static baseURL
  static responseKey
  static condition
  static businessError // Function
  static JSONBigintCfg = { storeAsString: true }
  static printInformation (message, title = 'error', style = 'color:red;background:#6cf') {
    console.log(`%c ${title} `, style, message)
  }

  constructor (config) {
    const {
      timeout,
      requestResolve, // 请求拦截器的resolve回调
      requestReject, // 请求拦截器的reject回调
      responseResolve, // 响应拦截器的resolve回调
      responseReject, // 响应拦截器的reject回调

      baseURL = '',
      responseKey = 'data',
      condition, // { code: [200, 20000, '200'], errCode: [0, '0'], err_code: 1 }, 类型可为['array', 'object'], 满足 “或” 关系，则不执行报错信息
      businessError // 业务信息统一报错提示
    } = config
    PureHttp.baseURL = baseURL
    PureHttp.responseKey = responseKey
    PureHttp.condition = condition
    PureHttp.businessError = businessError

    PureHttp.mAxios.defaults.timeout = timeout
    // 请求拦截器
    PureHttp.mAxios.interceptors.request.use(
      cfg => requestResolve ? requestResolve(cfg) : cfg,
      err => requestReject ? Promise.reject(requestReject(err)) : Promise.reject(err)
    )
    // 响应拦截器
    PureHttp.mAxios.interceptors.response.use(
      cfg => responseResolve ? responseResolve(cfg) : cfg,
      err => {
        PureHttp.printInformation(err.response, 'errorResponse')
        return responseReject ? Promise.reject(responseReject(err)) : Promise.reject(err)
      })
  }

  request (method, url, params, state = {}) {
    let headers
    let signal
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

    if (state.abort) {
      const controller = new AbortController()
      signal = controller.signal
      state.abort = controller.abort
    }

    const data = PureHttp.handleData(method, headers, params)

    return new Promise((resolve, reject) => {
      PureHttp.mAxios({
        method,
        url,
        baseURL: PureHttp.baseURL,
        signal,
        headers,
        data,
        params: PureHttp.handleParams(method, state, params),
        timeout: state.timeout,
        withCredentials: false,
        transformResponse: [(_response, _headers) => PureHttp.transformResponse(_response, _headers, state)],
        ...state.axios
      }).then(response => {
        PureHttp.preprocessingMAxios({ response, state, resolve, reject })
      }).catch(error => {
        PureHttp.mAxiosReject({ error, state, reject })
      })
    })
  }

  static handleData (method, headers, params) {
    let data
    if (['post', 'put', 'delete', 'patch'].includes(method)) {
      if (headers && headers['Content-Type'] && headers['Content-Type'].includes('multipart/form-data') &&
      params.constructor !== FormData) {
        const formData = new FormData()
        for (const key in params) {
          formData.append(key, params[key])
        }
        data = formData
      } else {
        data = params
      }
    }
    return data
  }

  static handleParams (method, state, params) {
    let data
    if (method === 'get') {
      data = params
    } else if (['post', 'put', 'delete', 'patch'].includes(method)) {
      data = state.params
    }
    return data
  }

  static transformResponse (response, headers, state) {
    const JSONBigintCfg = state.JSONBigintCfg || this.JSONBigintCfg
    try {
      // !!警告，使用JSONBigint转换后 Object constructor === undefined, typeof === object
      return JSONBigint(JSONBigintCfg).parse(response)
    } catch (err) {
      return response
    }
  }

  static preprocessingMAxios (props) {
    const { state, response } = props

    let responseKey = this.responseKey
    if (Object.prototype.hasOwnProperty.call(state, 'responseKey')) {
      responseKey = state.responseKey
    }

    let payload = response.data
    if (state.needHeader) {
      payload = {
        data: response.data,
        headers: response.headers
      }
    }

    let resolvePayload = payload
    if (responseKey !== false && response.data && !state.needHeader) {
      resolvePayload = response.data[responseKey]
    }

    this.mAxiosResolve({ ...props, payload, resolvePayload })
  }

  static mAxiosResolve (props) {
    const { state, response, resolve, resolvePayload } = props

    let flag = false
    const condition = state.condition || this.condition
    if (condition) {
      for (const key in condition) {
        if (flag) { break }

        if (condition[key].constructor === Array) {
          flag = condition[key].includes(response.data[key])
        } else {
          flag = response.data[key] === condition[key]
        }
      }
    }

    if (condition && !flag) {
      this.checkStateType(props)
    } else {
      resolve(resolvePayload)
    }
  }

  static checkStateType (props) {
    const { state, response, resolve, reject, payload } = props
    // state.type: [1, 2]用catch处理异常；[3, 4]使用正常逻辑；其中[2, 4, 6]静默处理，不提示报错信息
    switch (state.type) {
      case 1:
        this.businessError(response)
        reject(payload)
        break
      case 2:
        reject(payload)
        break
      case 3:
        this.businessError(response)
        resolve(payload)
        break
      case 4:
        resolve(payload)
        break
      case 5:
        this.businessError(response)
        reject(response)
        break
      case 6:
        reject(response)
        break
      default:
        this.businessError(response)
        break
    }
  }

  static mAxiosReject (props) {
    const { error, state, reject } = props
    this.printInformation(error)
    if ([1, 2, 5, 6].includes(state.type)) {
      reject(error)
    }
  }
}

export default PureHttp
