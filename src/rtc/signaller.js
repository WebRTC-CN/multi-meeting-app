import io from 'socket.io-client';
import { EventEmitter } from 'events';

export default class Signaller extends EventEmitter {
  constructor() {
    super();
  }

  async init(wss, option = {}) {
    //wss = wss ?? this.wss;
    console.log('socket.io', wss);
    this.socket = io(wss, {
      ...option,
      transports: ['websocket']
    });
    this.socket.connect();
    return new Promise((resolve, reject) => {
      this.socket.on('connect', resolve);
      this.socket.on('connect_error', reject);
    }).then(() => {
      this.socket.on('event', e => {
        console.log('receiveEvent', e.name, e.data);
        this.emit(e.name, e.data);
      });
    });
  }

  /**
   * 发送命令，有服务器必须返回响应
   * todo 超时失败机制
   * @param {string} name
   * @param {*} data any
   * @returns {Promise<any>} res
   */
  cmd(name, data) {
    return new Promise((resolve, reject) => {
      this.socket.emit(
        'cmd',
        {
          name,
          data
        },
        (status, res) => {
          if (status === 'success') {
            resolve(res);
          } else {
            reject(res);
          }
        }
      );
    });
  }

  /**
   * 只发送通知，不关心响应
   * @param {*} name
   * @param {*} data
   */
  notify(name, data) {
    this.socket.emit('event', { name, data });
  }

  close() {
    this.socket.disconnect();
    this.socket = null;
  }
}
