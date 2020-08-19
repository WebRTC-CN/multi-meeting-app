export const COMMOND = {
  JOIN: 'join',
  CREATE_TRANSPORT: 'createTransport',
  CONNECT_TRANSPORT: 'connectTransport',

  CREATE_PRODUCER: 'createProducer',
  CLOSE_PRODUCER: 'closeProducer',

  CREATE_CONSUMER: 'createConsumer',
  RESUME_COMSUMER: 'resumeConsumer',
  PAUSE_CONSUMER: 'paurseConsumer',

  GET_OFFER_SDP: 'getOfferSdp',
  GET_ANSWER_SDP: 'getAnswerSdp'
};

export const ROOM_EVENTS = {
  ENTER: 'peerEnter',
  LEAVE: 'peerLeave',

  NEW_PRODUCER: 'newProducer',
  PRODUCER_CLOSE: 'producerClose',
  NEW_STERAM: 'newStream',
  REMOVE_STREAM: 'removeStream'
};
