import Vue from 'vue';
import App from './app.vue';
import router from './router';
import store from './store';
import VueCompositionAPI from '@vue/composition-api';

Vue.config.productionTip = false;
Vue.use(VueCompositionAPI);

const loginWhiteList = ['home'];
router.beforeEach((to, from, next) => {
  if (loginWhiteList.includes(to.name) || store.getters.hasLogin) {
    return next();
  }
  store
    .dispatch('getUserInfo')
    .then(() => next())
    .catch(e => {
      console.error(e);
      next({ name: 'home' });
    });
});

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app');
