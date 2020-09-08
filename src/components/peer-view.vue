<template>
  <div class="peer-view">
    <div class="bg"></div>
    <div class="wrapper">
      <video
        ref="video"
        v-if="stream"
        :muted="isLocal"
        playsinline
        x5-playsinline
      ></video>

      <div class="peer-info">
        <span>{{ peer.name }}</span>
        <template v-if="stream">
          <a v-if="!volumeMuted" @click="volumeOff">
            <fa-icon name="volume-up" class="volume" title="静音" />
          </a>
          <a v-else @click="volumeUp">
            <fa-icon name="volume-off" class="volume-off" title="开启音量" />
          </a>
        </template>
      </div>

      <div class="peer-actions">
        <template v-if="isLocal">
          <a
            class="icon-wrap"
            :class="{ active: streamInfo.audio, muted: audioMuted }"
            @click="handleClick('mic')"
            title="麦克风"
          >
            <fa-icon name="microphone" />
          </a>
          <a
            class="icon-wrap"
            :class="{
              active: streamInfo.video,
              muted: videoMuted && streamInfo.video
            }"
            @click="handleClick('camera')"
            title="摄像头"
          >
            <fa-icon name="camera" />
          </a>
          <a
            class="icon-wrap"
            :class="{
              active: streamInfo.screen,
              muted: videoMuted && streamInfo.screen
            }"
            @click="handleClick('screen')"
            title="分享屏幕"
          >
            <fa-icon name="share-square" />
          </a>
        </template>
        <template v-else>
          <a
            class="icon-wrap"
            :class="{ muted: audioMuted, disabled: !hasAudio }"
            @click="toggleMuteAudio"
          >
            <fa-icon name="microphone" />
          </a>
          <a
            class="icon-wrap"
            :class="{ muted: videoMuted, disabled: !hasVideo }"
            @click="toggleMuteVideo"
          >
            <fa-icon name="camera" />
          </a>
        </template>
        <a v-if="hasTrackInfo" class="icon-wrap" @click="showTrackInfo">
          <fa-icon name="info" />
        </a>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch, computed } from '@vue/composition-api';
import FaIcon from './icon.vue';

export default {
  components: {
    FaIcon
  },
  props: {
    peer: {
      type: Object,
      require: true
    },
    stream: {
      type: MediaStream,
      default: null
    },
    isLocal: {
      type: Boolean,
      default: false
    },
    streamInfo: {
      type: Object,
      default() {
        return {
          audio: true,
          video: true,
          screen: false
        };
      }
    }
  },
  setup(props) {
    const video = ref(null);
    const stream = computed(() => props.stream);
    const hasAudio = computed(() => props.stream?.getAudioTracks().length > 0);
    const hasVideo = computed(() => props.stream?.getVideoTracks().length > 0);
    const audioMuted = ref(false);
    const videoMuted = ref(false);
    const hasTrackInfo = computed(() => {
      if (
        !props.stream ||
        typeof MediaStreamTrack.prototype.getSettings !== 'function'
      ) {
        return false;
      }
      return true;
    });
    const volumeMuted = ref(props.isLocal);

    watch(stream, () => {
      //console.log('effect', video.value, stream.value);
      const v = video.value;
      if (v) {
        v.srcObject = stream.value;
        if (v.muted) {
          v.play();
        } else {
          // 自动播放失败，尝试静音播放
          // todo, 静音播放应该有界面提示
          v.play().catch(e => {
            console.error(e);
            v.muted = true;
            volumeMuted.value = true;
            v.play();
          });
        }
      }
    });
    return {
      video,
      hasAudio,
      hasVideo,
      videoMuted,
      audioMuted,
      hasTrackInfo,
      volumeMuted
    };
  },
  methods: {
    handleClick(deviceType) {
      switch (deviceType) {
        case 'mic': {
          if (this.streamInfo.audio) {
            this.toggleMuteAudio();
          } else {
            this.$emit('replace-track', 'audio');
          }
          break;
        }
        case 'camera': {
          if (this.streamInfo.video) {
            this.toggleMuteVideo();
          } else {
            this.$emit('replace-track', 'video');
          }
          break;
        }
        case 'screen': {
          if (this.streamInfo.screen) {
            this.toggleMuteVideo();
          } else {
            this.$emit('replace-track', 'screen');
          }
          break;
        }
      }
    },
    toggleMuteAudio() {
      if (!this.hasAudio) {
        return false;
      }
      this.audioMuted = !this.audioMuted;
      this.$emit('toggleTrack', {
        kind: 'audio',
        isPause: this.audioMuted
      });
    },
    toggleMuteVideo() {
      if (!this.hasVideo) {
        return false;
      }
      this.videoMuted = !this.videoMuted;
      this.$emit('toggleTrack', {
        kind: 'video',
        isPause: this.videoMuted
      });
    },
    showTrackInfo() {
      const trackInfo = this.stream.getTracks().map(t => t.getSettings());
      console.log(trackInfo);
    },
    volumeOff() {
      this.volumeMuted = true;
      if (!this.video) {
        this.video.muted = true;
      }
    },
    volumeUp() {
      this.volumeMuted = false;
      if (!this.video) {
        this.video.muted = false;
      }
    }
  }
};
</script>

<style lang="less">
@color: #232323;

.peer-view {
  position: relative;
}
.bg {
  width: 100%;
  padding: 37.5% 0;
  background: rgba(42, 75, 88, 0.9);
}
.wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
.peer-view video {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.peer-info {
  position: absolute;
  bottom: 8px;
  left: 8px;
  font-size: 14px;
  color: #fff;
  .volume,
  .volume-off {
    cursor: pointer;
    margin-left: 5px;
  }
  .volume-off {
    color: #f00;
  }
}
.peer-actions {
  position: absolute;
  top: 0;
  right: 8px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  cursor: pointer;

  .icon-wrap {
    position: relative;
    margin-bottom: 8px;
    width: 48px;
    height: 48px;
    line-height: 48px;
    text-align: center;
    color: @color;
    background: #e0e0e0;
    border-radius: 50%;
    box-shadow: 0px 3px 5px -1px rgba(0, 0, 0, 0.2),
      0px 6px 10px 0px rgba(0, 0, 0, 0.14), 0px 1px 18px 0px rgba(0, 0, 0, 0.12);
    &.active {
      background: rgb(42, 75, 88);
      color: #fff;
    }
    &.muted {
      &::after {
        content: '';
        position: absolute;
        width: 100%;
        height: 0;
        top: 50%;
        left: 0;
        transform: rotate(45deg);
        transform-origin: center center;
        border: 1px solid @color;
      }
    }
    &.disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }
}
</style>
