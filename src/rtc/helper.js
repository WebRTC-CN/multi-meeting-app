/**
 * 创建流
 * @param {boolean|MediaTrackConstraints} options.video 摄像头
 * @param {boolean|MediaTrackConstraints} options.audio
 * @param {boolean|MediaTrackConstraints} options.screen
 */
export async function createStream(options) {
  if (options.screen && options.video) {
    return Promise.reject(
      new Error("options.video and options can't be both true")
    );
  }
  if (!options.screen) {
    return navigator.mediaDevices.getUserMedia(options);
  } else {
    const screen = navigator.mediaDevices.getDisplayMedia({
      video: options.screen
    });
    if (!options.audio) {
      // 只分享屏幕
      return screen;
    }
    // 屏幕加麦克风
    const mic = navigator.mediaDevices.getUserMedia({
      audio: options.audio
    });
    return Promise.all([mic, screen]).then(ret => {
      const stream = new MediaStream();
      ret.forEach(s => {
        stream.addTrack(s.getTracks()[0]);
      });
      return stream;
    });
  }
}

export async function getDevices(kind) {
  //
  return navigator.mediaDevices
    .getUserMedia({
      video: true,
      audio: true
    })
    .then(stream => {
      stream.getTracks().forEach(t => t.stop());
      return navigator.mediaDevices.enumerateDevices();
    })
    .then(devices => {
      if (kind === undefined) {
        return devices;
      }
      return devices.filter(device => device.kind === kind);
    });
}

export async function getMicrophones() {
  return getDevices('audioinput');
}

export async function getCameras() {
  return getDevices('videoinput');
}

export async function getSpeakers() {
  return getDevices('audiooutput');
}

/**
 * 媒体捕获
 * @param {HTMLMediaElement|HTMLCanvasElement} v
 */
export function captureElement(v) {
  return v.captureStream
    ? v.captureStream()
    : v.mozCaptureStream
    ? v.mozCaptureStream()
    : null;
}

export function addOrReplaceTrack(stream, track, stopOldTrack = true) {
  // 只允许每个peer有一条音频、一条视频流
  const kind = track.kind;
  const tracks = stream.getTracks();
  tracks.forEach(t => {
    if (t.kind === kind) {
      stream.removeTrack(t);
      if (stopOldTrack) {
        t.stop();
      }
    }
  });
  stream.addTrack(track);
}

export function copyStream(mediaStream) {
  const s = new MediaStream();
  mediaStream.getTracks(t => s.addTrack(t));
  return s;
}
