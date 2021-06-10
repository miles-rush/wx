Page({
  data: {
    mac: '', // 设备的mac地址，通过扫码获取 现阶段手动输入 
    serviceId: '', // 蓝牙特征值服务id 需要提供 似乎是写死的？
    text: '搜索到的蓝牙MAC：', //打印信息
  },

  //1.蓝牙初始化 连接蓝牙逻辑的入口\
  // tip. 可以继续封装这个函数
  initBlue() {
    let that = this //外部定义that 避免内部使用this指向错误
    wx.openBluetoothAdapter({
      // 成功
      success() {
        setTimeout(()=>{
          // 检测蓝牙是否可用
          that.getBluetoothAdapterState()
        }, 200)
      },
      // 失败
      fail() {
        wx.showToast({
          title: '请打开蓝牙',
          icon: 'fails',
          duration: 1000
        })
      }
    })
  },
  // 2.检测蓝牙是否可用
  getBluetoothAdapterState() {
    let that = this
    wx.getBluetoothAdapterState({
      success: (result) => {
        console.log('步骤：蓝牙是否可用')
        console.log(result)
        if(result.available) {
          // 开始搜索设备
          that.startBluetoothDevicesDiscovery()
        }
      },
      // 失败处理
      fail(error) {
        wx.showToast({
          title: '蓝牙不可用',
          icon: 'fails',
          duration: 1000
        })
      }
    })
  },
  // 3.蓝牙设备搜索初始化
  startBluetoothDevicesDiscovery() {
    let that = this
    wx.startBluetoothDevicesDiscovery({
      allowDuplicatesKey: false, //是否允许重复上报同一设备
    
      success(res) {
        console.log('步骤：蓝牙设备搜索初始化')
        console.log(res)
        // 获取搜索的蓝牙设备
        that.getBluetoothDevices()
      },
      // 失败处理
      fail(error) {
        wx.showToast({
          title: '蓝牙搜索不可用',
          icon: 'fails',
          duration: 1000
        })
      }
    })
  },
  // 4.获取搜索的蓝牙设备
  getBluetoothDevices() {
    let that = this
    // 获取目前搜索到的全部的蓝牙设备
    wx.getBluetoothDevices({
      success: (result) => {
        console.log('步骤：获取搜索的蓝牙设备')
        console.log(result)
        setTimeout(()=>{
          // 小于1台设备的时候关闭蓝牙和停止搜索(无设备)
          if(result.devices.length < 1) {
            wx.stopBluetoothDevicesDiscovery()
            wx.closeBluetoothAdapter()
          }
        }, 15000)
      },
    })

    // 5.监听搜索的蓝牙 不断寻找新的设备
    wx.onBluetoothDeviceFound((result) => {
      // 获取返回结果中的设备列表
      let devices = result.devices
      // 遍历设备列表
      for (let item of devices) {
        // 安卓和ios通用的广播数据 原本是通过deviceId判断的  但是ios的deviceId不是正确的
        let advertisData = that.buf2hex(item.advertisData)
        // 通过扫描二维码得到的mac地址获取蓝牙设备的ID
        console.log('设备ID列表')
        console.log(item.deviceId)
        let newtext = that.data.text + item.deviceId + '||'
        that.setData({text : newtext})
        if(advertisData.toUpperCase().indexOf(that.data.mac) != -1) {
          // 获取id
          let deviceId = item.deviceId
          // 停止搜索设备
          wx.stopBluetoothDevicesDiscovery({
            success: (res) => {
              // 连接设备
              setTimeout(()=>{
                that.createBLEConnection(deviceId)
              },200) 
            },
          })
        }
      }
    })
  },
  // 6.通过蓝牙设备id连接蓝牙设备
  createBLEConnection(deviceId) {
    let that = this
    wx.createBLEConnection({
      deviceId, //同名简略写法 deviceId：deviceId
      success(res) {
        console.log('步骤：通过蓝牙设备id连接蓝牙设备')
        console.log(res)
        // 通过蓝牙设备Id获取蓝牙的所有服务
        that.getBLEDeviceServices(deviceId)
      }
    })
  },

  // 7.通过蓝牙设备id获取蓝牙的所有服务
  getBLEDeviceServices(deviceId) {
    let that = this
    wx.getBLEDeviceServices({
      deviceId,
      success(res) {
        console.log('步骤：通过蓝牙设备id获取蓝牙的所有服务')
        console.log(res)
        // 获取读写的uuid
        that.getBLEDeviceCharacteristics(deviceId)
      }
    })
  },

  // 8.通过蓝牙特征值服务id和蓝牙设备Id获取蓝牙特征值读写的uuid
  // tap1. 蓝牙特征值需要提供
  // tap2. uuid是个数组 不知道那个是读那个是写  需要提供
  getBLEDeviceCharacteristics(deviceId) {
    let that = this
    wx.getBLEDeviceCharacteristics({
      deviceId,
      serviceId: that.data.serviceId, //蓝牙特征值服务id
      success(res) {
        console.log('uuid')
        console.log(res) // 打印uuid
        setTimeout(()=>{
          // 监听数据传输
          that.notifyBLECharacteristicValueChange(deviceId)
        },200)
      }
    })
  },

  // 9.启用蓝牙notify功能，用来监听蓝牙之间的数据传输
  notifyBLECharacteristicValueChange(deviceId) {
    wx.notifyBLECharacteristicValueChange({
      characteristicId: 'characteristicId', // 蓝牙特征值读的uuid
      deviceId, //蓝牙设备id
      serviceId: that.data.serviceId, // 蓝牙特征值服务id
      state: true, // 启动notify
      success(res) {
        // 这里要开启接收推送
        that.onBLECharacteristicValueChange()
        setTimeout(()=>{
          // 发送命令 可以单独抽离绑定按钮事件
          that.writeBLECharacteristicValue(deviceId)
        },200)
      }
    })
  },

  // 10.接收推送
  onBLECharacteristicValueChange() {
    wx.onBLECharacteristicValueChange(res=>{
        let data = that.buf2string(res.value) //解析成十进制，正常文本
        console.log(data) // 接受推送 打印消息
    })
  },

  // 11.发送指令 指令需要提供？
  writeBLECharacteristicValue(deviceId) {
    let str = '{code: 1, data: {md5: gffd544, ts: 3654}, msg: "hello"}' //定义数据 到底是什么格式 需要提供
    
    //转换成广播数据
    let buffer = new ArrayBuffer(str.length)
    let dataView = new DataView(buffer)
    for (var i = 0; i < str.length; i++) {
      dataView.setUint8(i, str.charAt(i).charCodeAt())
    }
    // let dataHex = buf2hex(buffer); //转换成二进制
    wx.writeBLECharacteristicValue({
      deviceId, //蓝牙设备id
      serviceId: '', //蓝牙特征值服务id
      characteristicId: '', //蓝牙特征值写的uuid
      value: buffer, 
      success (res) {
        console.log('writeBLECharacteristicValue success', res.errMsg)
      }
    })
  },


  // 辅助函数-数据转化
  // 广播数据转成二进制
  buf2hex(buffer) {
    let hexArr = Array.prototype.map.call(new Uint8Array(buffer), bit=>{
      return ('00' + bit.toString(16)).slice(-2)
    })
    return hexArr.join('')
  },
  // 解析成十进制
  buf2string(buffer) {
    let arr = Array.prototype.map.call(new Uint8Array(buffer), x => x)
    return arr.map((char, i) => {
        return String.fromCharCode(char)
    }).join('')
  },

})
