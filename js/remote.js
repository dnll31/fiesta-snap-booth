/* Fiesta Snap Booth — Remote Camera Mode
   Peer-to-peer WebRTC between the kiosk (tablet) and the camera (phone),
   paired by manually copying a short text code between the two devices —
   no signaling server required. On a shared Wi-Fi network this is enough
   for local, same-room use. For an always-on production deployment across
   networks, swap the manual copy/paste step for a small WebSocket relay
   that simply forwards the same offer/answer text automatically. */
(function (global) {

  const RTC_CONFIG = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  };

  function waitForIceGatheringComplete(pc) {
    if (pc.iceGatheringState === 'complete') return Promise.resolve();
    return new Promise((resolve) => {
      function check() {
        if (pc.iceGatheringState === 'complete') {
          pc.removeEventListener('icegatheringstatechange', check);
          resolve();
        }
      }
      pc.addEventListener('icegatheringstatechange', check);
      // safety timeout so a flaky network doesn't hang the pairing UI forever
      setTimeout(resolve, 4000);
    });
  }

  function encode(obj) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
  }
  function decode(str) {
    return JSON.parse(decodeURIComponent(escape(atob(str.trim()))));
  }

  class RemotePairing {
    constructor(role) {
      this.role = role; // 'tablet' | 'phone'
      this.pc = new RTCPeerConnection(RTC_CONFIG);
      this.dataChannel = null;
      this.onRemoteStream = null;
      this.onControlMessage = null;
      this.onConnectionState = null;

      this.pc.addEventListener('connectionstatechange', () => {
        if (this.onConnectionState) this.onConnectionState(this.pc.connectionState);
      });

      this.pc.addEventListener('track', (evt) => {
        if (this.onRemoteStream) this.onRemoteStream(evt.streams[0]);
      });

      if (role === 'tablet') {
        this.dataChannel = this.pc.createDataChannel('control');
        this._wireDataChannel(this.dataChannel);
      } else {
        this.pc.addEventListener('datachannel', (evt) => {
          this.dataChannel = evt.channel;
          this._wireDataChannel(this.dataChannel);
        });
      }
    }

    _wireDataChannel(dc) {
      dc.addEventListener('message', (evt) => {
        if (this.onControlMessage) this.onControlMessage(evt.data);
      });
    }

    /** Tablet step 1: create an offer code to hand to the phone. */
    async createOfferCode() {
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      await waitForIceGatheringComplete(this.pc);
      return encode({ type: 'offer', sdp: this.pc.localDescription.sdp });
    }

    /** Phone step 1: consume the tablet's offer code, attach camera, return an answer code. */
    async acceptOfferAndGetCamera(offerCode) {
      const { sdp } = decode(offerCode);
      await this.pc.setRemoteDescription({ type: 'offer', sdp });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false
      }).catch(() =>
        navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      );
      stream.getTracks().forEach((track) => this.pc.addTrack(track, stream));

      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      await waitForIceGatheringComplete(this.pc);
      return { code: encode({ type: 'answer', sdp: this.pc.localDescription.sdp }), localStream: stream };
    }

    /** Tablet step 2: complete the connection using the phone's answer code. */
    async completeWithAnswerCode(answerCode) {
      const { sdp } = decode(answerCode);
      await this.pc.setRemoteDescription({ type: 'answer', sdp });
    }

    send(message) {
      if (this.dataChannel && this.dataChannel.readyState === 'open') {
        this.dataChannel.send(message);
      }
    }

    close() {
      if (this.dataChannel) this.dataChannel.close();
      this.pc.close();
    }
  }

  global.RemotePairing = RemotePairing;
})(window);
