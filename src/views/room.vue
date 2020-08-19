<template>
  <div class="meeting-room">
    <div class="header">
      <a class="logo">WeMeeting</a>
      <div class="pull-right"></div>
    </div>
    <div class="peer-list">
      <peer-view
        :peer="userInfo"
        :stream="localStream"
        :stream-info="streamInfo"
        :is-local="true"
        class="peer-view peer-self"
        @replace-track="replaceTrack($event)"
        @toggleTrack="muteLocalTrack($event)"
      />
      <peer-view
        v-for="peer in peersWithoutMyself"
        :key="peer.id"
        :peer="peer"
        :stream="mediaStreams[peer.id]"
        class="peer-view"
        @toggleTrack="toggleTrack(peer.id, $event)"
      />
    </div>
  </div>
</template>

<script>
import { computed, reactive, ref, toRefs } from '@vue/composition-api';
import useMeetingClient from '../rtc/mediasoup/hook';
import store from '../store';
import PeerView from '../components/peer-view.vue';

export default {
  components: {
    PeerView
  },
  setup(props, context) {
    const loading = ref(true);
    const localStream = ref(null);
    const streamInfo = reactive({
      audio: false,
      video: false,
      screen: false
    });
    const userInfo = computed(() => store.state.userInfo);
    const route = computed(() => context.root.$route);
    const roomId = computed(() => {
      return route.value.params.id;
    });
    const { state, createClient, createLocalStream } = useMeetingClient(
      userInfo.value.id
    );
    // client init
    let client;
    client = createClient();
    client
      .join(roomId.value, userInfo.value.token)
      .then(() => (loading.value = false));

    const peersWithoutMyself = computed(() => {
      return state.peers.filter(p => p.id !== userInfo.value.id);
    });

    return {
      loading,
      userInfo,
      ...toRefs(state),
      localStream,
      streamInfo,
      peersWithoutMyself,
      client,
      createLocalStream
    };
  },
  mounted() {
    this.openCamera();
    //window.vm = this;
  },
  destroyed() {
    this.client?.close();
  },
  methods: {
    shareScreen() {
      this.localStream?.close();
      this.createLocalStream({
        audio: true,
        screen: true
      }).then(stream => {
        this.localStream = stream.stream;
        this.streamInfo.audio = true;
        this.streamInfo.screen = true;
        this.client.publish(stream);
      });
    },
    openCamera() {
      this.localStream?.close();
      this.createLocalStream({
        audio: true,
        video: true
      }).then(stream => {
        this.localStream = stream.stream;
        this.streamInfo.audio = true;
        this.streamInfo.video = true;
        this.client.publish(stream);
      });
    },

    /**
     * @param {string} trackType 'audio' | 'video' | 'screen'
     */
    replaceTrack(trackType) {
      switch (trackType) {
        case 'video': {
          if (this.streamInfo.screen) {
            // todo 提示替换流
            console.log('screen track will be replace');
          }
          navigator.mediaDevices
            .getUserMedia({ video: true })
            .then(s => s.getVidoeTracks()[0])
            .then(track => {
              return this.client.replaceTrack('video', track);
            })
            .then(() => {
              this.streamInfo.video = true;
              this.streamInfo.screen = false;
            });
          break;
        }
        case 'screen': {
          if (this.streamInfo.screen) {
            // todo 提示替换流
            console.log('camera track will be replace');
          }
          navigator.mediaDevices
            .getDisplayMedia({ video: true })
            .then(s => s.getVideoTracks()[0])
            .then(track => {
              return this.client.replaceTrack('video', track);
            })
            .then(() => {
              this.streamInfo.video = false;
              this.streamInfo.screen = true;
            });
          break;
        }
        default: {
          navigator.mediaDevices
            .getUserMedia({ audio: true })
            .then(s => s.getAudioTracks()[0])
            .then(track => {
              return this.client.replaceTrack('audio', track);
            })
            .then(() => {
              this.streamInfo.audio = true;
            });
        }
      }
    },

    muteLocalTrack({ kind, isPause }) {
      return this.client.toggleLocalTrack(kind, isPause);
    },

    toggleTrack(id, event) {
      const { kind, isPause } = event;
      const remoteStream = this.client.remoteStreams[id];
      if (remoteStream) {
        this.client.toggleTrack(remoteStream, kind, isPause);
        let mediaTrack = this.mediaStreams[id]
          .getTracks()
          .find(t => t.kind === kind);
        console.log('toggleTrackSuccess', mediaTrack.enabled, isPause);
      } else {
        console.warn('remoteStream of ', id, 'is not found');
      }
    }
  }
};
</script>

<style lang="less">
.pull-right {
  float: right;
}
.peer-list {
  display: flex;
  flex-wrap: wrap;
}
.peer-list .peer-view {
  flex: 1;
  max-width: 720px;
  min-width: 240px;
  margin: 0 8px;
  box-sizing: border-box;
}
</style>
