import { addOrReplaceTrack } from '../helper';

export class LocalStream {
  /**
   * @param {string} userId
   * @param {MediaStream} mediaStream
   */
  constructor(userId, mediaStream) {
    this.userId = userId;
    this.stream = mediaStream;
  }

  getTracks() {
    return this.stream.getTracks();
  }

  replaceTrack(track) {
    let stream = this.stream;
    if (!stream) {
      stream = new MediaStream();
    }
    addOrReplaceTrack(stream, track, true);
  }

  close() {
    this.getTracks().forEach(track => track.stop());
  }
}

export class RemoteStream {
  constructor(userId) {
    this.userId = userId;
  }

  addTrack(track) {
    if (!this.stream) {
      this.stream = new MediaStream();
    }
    addOrReplaceTrack(this.stream, track);
  }

  removeTrack(track) {
    if (this.stream) {
      this.stream.removeTrack(track);
      return true;
    }
    return false;
  }

  removeTrackByKind(kind) {
    if (this.stream) {
      const tracks =
        kind === 'audio'
          ? this.stream.getAudioTracks()
          : this.stream.getVideoTracks();
      tracks.forEach(track => {
        this.stream.removeTrack(track);
      });
    }
    return false;
  }

  isEmpty() {
    return !this.stream || this.stream.getTracks().length === 0;
  }
}
