<template>
  <div class="home">
    <div class="main">
      <form class="login-form">
        <div class="form-item">
          <input type="text" v-model="form.username" placeholder="用户名" />
        </div>
        <div class="form-item">
          <input type="text" v-model="form.room" placeholder="房间号" />
        </div>
        <a class="btn btn-primary" @click="login">进入房间</a>
      </form>
      <div class="slogan">
        <h1>WeMeeting</h1>
        <h2>MEET UP, MEET TOGETHER</h2>
      </div>
    </div>
  </div>
</template>

<script>
import { reactive, ref } from '@vue/composition-api';
import { login } from '../api';
import store from '../store';

export default {
  name: 'home',
  setup() {
    const form = reactive({
      username: ref(''),
      room: ref('')
    });

    return {
      form
    };
  },
  methods: {
    login() {
      if (!this.form.username || !this.form.room) {
        return;
      }
      return login(this.form.username, this.form.room)
        .then(userInfo => store.commit('setUserInfo', userInfo))
        .then(() => {
          this.$router.push({
            name: 'room',
            params: {
              id: this.form.room
            }
          });
        });
    }
  }
};
</script>

<style lang="less">
.home {
  border-top: 1px solid transparent;
}
.home .main {
  display: flex;
  width: 80%;
  max-width: 980px;
  margin: 60px auto;
  background: rgba(43, 43, 43, 0.9);
  padding: 80px 16px;
}
.login-form {
  flex: 1;
  border-right: 1px solid #f1f1f1;
  .form-item {
    margin: 16px 32px 16px 16px;
    input {
      width: 100%;
      padding: 0 8px;
      line-height: 32px;
    }
  }
  .btn {
    display: inline-block;
    cursor: pointer;
    background: #f1f1f1;
    padding: 12px 32px;
  }
}
.slogan {
  flex: 1;
  color: #f4f4f4;
  text-align: center;
}
</style>
