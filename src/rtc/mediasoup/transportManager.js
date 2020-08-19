import { Device } from 'mediasoup-client';
import { AwaitQueue } from 'awaitqueue';
import { COMMOND } from '../enum';

export default class TransportManager {
  constructor(signaller) {
    this.signaller = signaller;
    this.device = new Device();

    this.trackIdToProducers = new Map();
    this.peerConsumers = new Map();
    this.peerProducerIds = new Map();
    // mediasoup-client transport, 其handler属性封装了浏览器对应的RTCPeerConnection
    this.sender = null;
    this.receiver = null;
    this.readyPromise = null;
    this._awaitQueue = new AwaitQueue();
  }
  async init(serverRtpCapabilities) {
    this.readyPromise = ensureCallOnce(() =>
      this._init(serverRtpCapabilities)
    )();
    return this.readyPromise;
  }
  async _init(serverRtpCapabilities) {
    await this.device.load({
      routerRtpCapabilities: serverRtpCapabilities
    });
    this.isReady = true;
    this.canSendMedia =
      this.device.canProduce('video') && this.device.canProduce('audio');
    return this.canSendMedia;
  }
  async _createSender() {
    await this.readyPromise;
    if (!this.canSendMedia) {
      throw new Error('can not send Media, check server capablities');
    }
    if (this.sender) {
      return this.sender;
    }
    const {
      id,
      iceParameters,
      iceCandidates,
      dtlsParameters
    } = await this.signaller.cmd(COMMOND.CREATE_TRANSPORT);
    this.sender = this.device.createSendTransport({
      id,
      iceCandidates,
      iceParameters,
      dtlsParameters
    });
    // connect when first RTCPeerConnection.createOffer() is call
    this.sender.on('connect', ({ dtlsParameters }, success, error) => {
      console.log(this.sender.id, dtlsParameters);
      this.signaller
        .cmd(COMMOND.CONNECT_TRANSPORT, {
          transportId: this.sender.id,
          dtlsParameters
        })
        .then(success, error);
    });
    this.sender.on('produce', ({ kind, rtpParameters }, success, error) => {
      this.signaller
        .cmd(COMMOND.CREATE_PRODUCER, {
          transportId: this.sender.id,
          kind,
          rtpParameters
        })
        .then(success, error);
    });
    return this.sender;
  }

  async _createReceiver() {
    await this.readyPromise;
    if (this.receiver) {
      return this.receiver;
    }
    const {
      id,
      iceParameters,
      iceCandidates,
      dtlsParameters
    } = await this.signaller.cmd(COMMOND.CREATE_TRANSPORT);
    this.receiver = this.device.createRecvTransport({
      id,
      iceCandidates,
      iceParameters,
      dtlsParameters
    });
    // connect when first RTCPeerConnection.createOffer() is call
    this.receiver.on('connect', ({ dtlsParameters }, success, error) => {
      this.signaller
        .cmd(COMMOND.CONNECT_TRANSPORT, {
          transportId: this.receiver.id,
          dtlsParameters
        })
        .then(success, error);
    });
    return this.receiver;
  }

  async publish(localStream) {
    const tracks = localStream.getTracks();
    for (const track of tracks) {
      const producer = await this.sendTrack(track);
      console.log('published track:', track.id, producer.id);
    }
  }

  /**
   * @param {MediaStreamTrack} track
   */
  async sendTrack(track, encodings) {
    if (!this.sender) {
      await ensureCallOnce(() => this._createSender())();
    }
    const producer = await this.sender.produce({ track, encodings });
    this.trackIdToProducers.set(track.id, producer);
    return producer;
  }

  async subscribe(remoteStream) {
    let producerIds = this.getProducerIds(remoteStream);
    const consumers = this.peerConsumers.get(remoteStream.userId);
    if (consumers !== undefined) {
      producerIds = producerIds.filter(id =>
        consumers.every(consumer => consumer.producerId != id)
      );
    }

    if (producerIds.length == 0) {
      throw new Error('remote stream has been subcribe');
    }
    const ret = [];
    for (const producerId of producerIds) {
      const consumer = await this._receiveOneTrack(
        producerId,
        remoteStream.userId
      );
      ret.push(consumer);
    }
    // const promises = producerIds.map(id =>
    //   this._receiveOneTrack(id, remoteStream.userId)
    // );
    // return Promise.all(promises);
    return ret;
  }

  async _receiveOneTrack(producerId, userId) {
    if (!this.receiver) {
      await ensureCallOnce(() => this._createReceiver())();
    }
    // paused: false maybe cause video play error,
    const consumerInfo = await this.signaller.cmd(COMMOND.CREATE_CONSUMER, {
      transportId: this.receiver.id,
      producerId,
      rtpCapabilities: this.device.rtpCapabilities,
      paused: true
    });
    const consumer = await this.receiver.consume({
      id: consumerInfo.id,
      kind: consumerInfo.kind,
      rtpParameters: consumerInfo.rtpParameters,
      producerId,
      appData: {
        peerId: userId,
        kind: consumerInfo.kind
      }
    });
    await this.signaller.cmd(COMMOND.RESUME_COMSUMER, {
      id: consumer.id
    });
    this.addConsumer(userId, consumer);
    console.log('receiveTrack, producerId:', producerId);
    return consumer;
  }

  async replaceTrack(oldTrack, newTrack) {
    const producer = this.trackIdToProducers.get(oldTrack.id);
    await producer.replaceTrack(newTrack);
  }

  async stopReceiveTrack(remoteStream, kind) {
    let consumers = this.peerConsumers.get(remoteStream.userId);
    if (kind !== undefined) {
      consumers = consumers.filter(c => c.kind === kind);
    }
    // todo notify server to remove server Consumer
    const arr = consumers.map(c => c.close());
    return Promise.all(arr);
  }

  async stopSendTrack(track) {
    const producer = this.trackIdToProducers.get(track.id);
    await producer?.close();
  }

  async toggleLocalTrack(track, isPause) {
    const producer = this.trackIdToProducers.get(track.id);
    if (producer === undefined) {
      throw new Error(`producer to track ${track.id} not found`);
    }
    await (isPause ? producer.pause() : producer.resume());
  }

  toggleRemoteTrack(remoteStream, kind, isPause) {
    let consumers = this.peerConsumers.get(remoteStream.userId);
    const consumer = consumers?.find(c => c.kind === kind);
    if (consumer) {
      if (isPause) {
        consumer.pause();
        console.log('pauseTrack', kind, consumer.track.enabled);
      } else {
        console.log('resumeTrack', kind);
        consumer.resume();
      }
      return true;
    }
    return false;
  }

  setProducerId(peerId, producerId) {
    let ids = this.peerProducerIds.get(peerId) || [];
    if (Array.isArray(producerId)) {
      ids = ids.concat(producerId);
    } else {
      ids.push(producerId);
    }
    this.peerProducerIds.set(peerId, ids);
  }

  addConsumer(peerId, consumer) {
    let consumers = this.peerConsumers.get(peerId);
    if (consumers === undefined) {
      consumers = [];
    }
    consumers.push(consumer);
    this.peerConsumers.set(peerId, consumers);
  }

  getProducerIds(remoteStream) {
    return this.peerProducerIds.get(remoteStream.userId);
  }

  async getSendStats(track) {
    const producer = this.trackIdToProducers.get(track.id);
    return producer?.getStats();
  }

  async getReceiveStats(remoteStream, kind) {
    let consumers = this.peerConsumers.get(remoteStream.userId);
    if (kind !== undefined) {
      consumers = consumers?.filter(c => c.kind === kind);
      return consumers.length ? consumers[0].getStats() : null;
    }
    const promises = consumers.map(c => c.getStats());
    return Promise.all(promises);
  }

  close() {
    this._awaitQueue.close();
    this.sender?.close();
    this.receiver?.close();
  }
}

function ensureCallOnce(fn) {
  let promise;
  return function(...args) {
    if (promise) {
      return promise;
    }
    promise = fn(...args);
    return promise;
  };
}
