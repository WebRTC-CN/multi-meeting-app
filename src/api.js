import axios from 'axios';
//import config from './config/index';

let instance = axios.create({
  baseURL: '' //config.baseUrl
});

export function login(name, roomId) {
  return instance
    .post('/api/login', {
      name,
      room: roomId
    })
    .then(({ data }) => {
      if (data.code == 200) {
        return data.data;
      } else {
        throw new Error(data.message);
      }
    });
}

export function getUserInfo() {
  return instance.get('/api/userinfo').then(({ data }) => {
    if (data.code == 200) {
      return data.data;
    } else {
      throw new Error(data.message);
    }
  });
}
