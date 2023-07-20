/**
 *Created by limbo <yykaue@qq.com> on 2019/8/1.
 */
import axios from 'axios'
import JSONBigint from 'json-bigint'
// 因创建原型问题，使用v0.4.0; object = {},v0.4.0; object = Object.create(null),v1.0.0

class PureHttp {
  static mAxios = axios.create()
  static baseURL
  static responseKey
  static condition
  static JSONBigintCfg
  // JSONBigintCfg = {
  //   'striæct': false,  // not being strict means do not generate syntax errors for "duplicate key"
  //   'storeAsString': false, // toggles whether the values should be stored as BigNumber (default) or a string
  //   'alwaysParseAsBig': false, // toggles whether all numbers should be Big
  //   'useNativeBigInt': false // toggles whether to use native BigInt instead of bignumber.js
  // }
  static businessErrorCallback // function

  static codeMessage = {
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

  static printInformation (infoArray = []) {
    let messageString = ''
    const styleArray = []
    infoArray.forEach(item => {
      messageString += '%c' + item.message
      styleArray.push(item.style)
    })
    console.log(messageString, ...styleArray)
  }

  static businessError (response) {
    const infoArray = [
      { message: 'limbo-common-js', style: 'padding:5px;color: #fadfa3;background:#030307;border-radius:3px;' },
      { message: '接口(信息):', style: 'margin:0 3px;padding:3px;color:#fff;background:#F56C6C;border-radius:3px;' },
      { message: response }
    ]
    this.printInformation(infoArray)
    this.businessErrorCallback && this.businessErrorCallback(response)
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
      JSONBigintCfg = { storeAsString: true }, // JSONBigint 配置
      businessError // 业务信息统一报错提示
    } = config
    PureHttp.baseURL = baseURL
    PureHttp.responseKey = responseKey
    PureHttp.condition = condition
    PureHttp.JSONBigintCfg = JSONBigintCfg
    PureHttp.businessErrorCallback = businessError

    PureHttp.mAxios.defaults.timeout = timeout
    // 请求拦截器
    PureHttp.mAxios.interceptors.request.use(
      req => requestResolve ? requestResolve(req) : req,
      err => requestReject ? Promise.reject(requestReject(err)) : Promise.reject(err)
    )
    // 响应拦截器
    PureHttp.mAxios.interceptors.response.use(
      res => responseResolve ? responseResolve(res) : res,
      err => {
        const infoArray = [
          { message: 'limbo-common-js', style: 'padding:5px;color: #fadfa3;background:#030307;border-radius:3px;' },
          { message: '接口(errorResponse):', style: 'margin:0 3px;padding:3px;color:#fff;background:#F56C6C;border-radius:3px;' },
          { message: err.response }
        ]
        PureHttp.printInformation(infoArray)
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

    if (state.controller) {
      const controller = new AbortController()
      signal = controller.signal
      state.controller = controller
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
        PureHttp.mAxiosResolve({ state, response, resolve, reject })
      }).catch(error => {
        PureHttp.mAxiosReject({ state, error, reject })
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

  static mAxiosResolve (props) {
    const { state, response, resolve, reject } = props
    const { payload, resolvePayload } = this.getPayload({ state, response })
    const resolveFlag = this.getResolveFlag({ state, response })

    if (resolveFlag) {
      resolve(resolvePayload)
    } else {
      this.checkStateType({
        state,
        response,
        resolve,
        reject,
        payload
      })
    }
  }

  static getPayload (props) {
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

    return { payload, resolvePayload }
  }

  static getResolveFlag (props) {
    const { state, response } = props

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
    return flag || !condition
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
    const infoArray = [
      { message: 'limbo-common-js', style: 'padding:5px;color: #fadfa3;background:#030307;border-radius:3px;' },
      { message: '接口(throwError):', style: 'margin:0 3px;padding:3px;color:#fff;background:#F56C6C;border-radius:3px;' },
      { message: error }
    ]
    this.printInformation(infoArray)
    if ([1, 2, 5, 6].includes(state.type)) {
      reject(error)
    }
  }
}

export default PureHttp
