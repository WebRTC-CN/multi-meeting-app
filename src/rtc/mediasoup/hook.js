import { reactive, set } from '@vue/composition-api';
import MeetingClient from './client';
import { copyStream } from '../helper';
import { ROOM_EVENTS } from '../enum';

export default function useMeetingClient(userId) {
  let state = reactive({
    peers: [],
    mediaStreams: {}
  });

  return {
    state,
    createLocalStream: MeetingClient.createLocalStream,
    createClient() {
      const client = new MeetingClient(userId);
      client.on('joined', () => {
        console.log('joined', client.roomPeers.length);
        state.peers = [...client.roomPeers];
      });
      client.on('peerEnter', peer => {
        state.peers.push(peer.user);
      });
      client.on('peerLeave', ({ id }) => {
        const idx = state.peers.findIndex(p => p.id === id);
        if (idx > -1) {
          state.peers.splice(idx, 1);
          state.mediaStreams[id] = null;
        }
      });
      client.on(ROOM_EVENTS.NEW_STERAM, remoteStream => {
        client.subscribe(remoteStream);
      });
      client.on('subscribed', remoteStream => {
        set(state.mediaStreams, remoteStream.userId, remoteStream.stream);
      });
      client.on('stream-changed', remoteStream => {
        set(
          state.mediaStreams,
          remoteStream.userId,
          copyStream(remoteStream.stream)
        );
      });
      return client;
    }
  };
}
