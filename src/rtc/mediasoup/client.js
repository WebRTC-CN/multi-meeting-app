import EventEmitter from 'events';
import Signaller from '../signaller';
import { COMMOND, ROOM_EVENTS } from '../enum';
import { createStream } from '../helper';
import { LocalStream, RemoteStream } from './stream';
import TransportManager from './transportManager';
import config from '../../config/index';

const WSS = config.baseUrl;

export default class MeetingClient extends EventEmitter {
  constructor(userId) {
    super();
    this.userId = userId;
    this.roomPeers = [];
    this.localStream = null;
    this.remoteStreams = {};
  }
  static async createLocalStream(options) {
    const stream = await createStream(options);
    return new LocalStream(this.userId, stream);
  }

  async join(roomId, token) {
    this.signaller = new Signaller();
    console.time('signaller conncet');
    await this.signaller.init(`${WSS || '/'}?token=${token}`, {
      path: '/ws'
    });
    console.timeEnd('signaller conncet');
    const roomInfo = await this.signaller.cmd(COMMOND.JOIN, {
      roomId
    });
    console.log('joinRoomSuccess', roomInfo);
    this.handleEvents();
    this.transportManager = new TransportManager(this.signaller);
    this.transportManager.init(roomInfo.rtpCapabilities);

    Promise.resolve().then(() => {
      roomInfo.peers.forEach(peer => {
        if (peer.producers.length === 0) {
          return;
        }
        this.transportManager.setProducerId(
          peer.peerId,
          peer.producers.map(p => p.id)
        );
        const remoteStream = new RemoteStream(peer.peerId);
        this.remoteStreams[remoteStream.userId] = remoteStream;
        this.emit(ROOM_EVENTS.NEW_STERAM, remoteStream);
      });
    });
    this.roomPeers = roomInfo.peers.map(peer => {
      return peer.user;
    });
    this.emit('joined');
    return this.roomPeers;
  }

  async publish(localStream) {
    this.localStream = localStream;
    await this.transportManager.publish(localStream);
  }

  async unpublishAudio() {
    const tracks = this.localStream.stream.getAudioTracks();
    const arr = tracks.map(track => this.transportManager.stopSendTrack(track));
    return Promise.all(arr);
  }
  async unpublishVideo() {
    const tracks = this.localStream.stream.getVideoTracks();
    const arr = tracks.map(track => this.transportManager.stopSendTrack(track));
    return Promise.all(arr);
  }
  async toggleLocalTrack(kind, isPause) {
    const tracks = this.localStream.getTracks().filter(t => t.kind === kind);
    console.log('tracks will be muted', tracks);
    const arr = tracks.map(track =>
      this.transportManager.toggleLocalTrack(track, isPause)
    );
    return Promise.all(arr);
  }
  async replaceTrack(kind, newTrack) {
    const tracks = this.localStream.gtTracks();
    const track = tracks.find(t => t.kind === kind);
    this.localStream.addTrack(kind, newTrack);
    await this.transportManager.replaceTrack(track, newTrack);
  }

  async subscribe(remoteStream) {
    let isEmpty = remoteStream.isEmpty();
    const consumers = await this.transportManager.subscribe(remoteStream);

    consumers.forEach(c => remoteStream.addTrack(c.track));
    const eventName = isEmpty ? 'subscribed' : 'stream-changed';
    this.emit(eventName, remoteStream);
    console.log(eventName, remoteStream.userId);
  }
  async unsubescribe(remoteStream, kind) {
    await this.transportManager.stopReceiveTrack(remoteStream, kind);
    this.emit('stream-changed', remoteStream);
  }
  toggleTrack(remoteStream, kind, isPause) {
    const flag = this.transportManager.toggleRemoteTrack(
      remoteStream,
      kind,
      isPause
    );
    console.log(
      `${isPause ? 'pause' : 'resume '} ${remoteStream.userId} ${kind}`,
      flag
    );
    return flag;
  }

  handleEvents() {
    this.signaller.on(ROOM_EVENTS.ENTER, peer => {
      this.roomPeers.push(peer.user);
      this.emit(ROOM_EVENTS.ENTER, peer);
    });
    this.signaller.on(ROOM_EVENTS.LEAVE, id => {
      const idx = this.roomPeers.findIndex(peer => peer.id === id);
      // 删除用户，及相关流
      this.roomPeers.splice(idx, 1);
      delete this.remoteStreams[id];
      this.emit(ROOM_EVENTS.LEAVE, id);
    });

    this.signaller.on(ROOM_EVENTS.NEW_PRODUCER, producerInfo => {
      const { peerId, id } = producerInfo;
      this.transportManager.setProducerId(peerId, id);
      let remoteStream = this.remoteStreams[peerId];
      if (remoteStream === undefined) {
        remoteStream = new RemoteStream(peerId);
        this.remoteStreams[peerId] = remoteStream;
        this.emit(ROOM_EVENTS.NEW_STERAM, remoteStream);
      } else {
        this.emit('stream-change', remoteStream);
        this.subscribe(remoteStream);
      }
    });

    this.signaller.on('consumerClosed', async consumerInfo => {
      const { peerId, kind } = consumerInfo.appData;
      const remoteStream = this.remoteStreams[peerId];
      if (remoteStream) {
        remoteStream.removeTrackByKind(kind);
        await this.transportManager.stopReceiveTrack(remoteStream, kind);
        this.emit('stream-change', remoteStream);
      }
    });
  }

  close() {
    this.transportManager?.close();
    this.signaller?.close;
    this.localStream?.close();
  }
}
