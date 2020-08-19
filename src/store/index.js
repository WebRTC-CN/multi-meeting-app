import Vue from 'vue';
import Vuex from 'vuex';
import { getUserInfo } from '../api';

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    userInfo: {}
  },
  mutations: {
    setUserInfo(state, userInfo) {
      state.userInfo = userInfo;
    }
  },
  getters: {
    hasLogin(state) {
      return state.userInfo.id;
    }
  },
  actions: {
    getUserInfo({ commit }) {
      return getUserInfo().then(userInfo => {
        commit('setUserInfo', userInfo);
      });
    }
  },
  modules: {}
});
