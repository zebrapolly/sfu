import * as rx from 'rxjs/Rx';
import { merge, zip, fromEventPattern } from 'rxjs';

const iceServers: RTCIceServer[] = [
    {
      urls: 'turn:130.211.56.110:3478?transport=udp',
      username: 'dialog',
      credential: 'dialog'
    },
    {
      urls: 'turn:130.211.56.110:3478?transport=tcp',
      username: 'dialog',
      credential: 'dialog'
    }
  ]

export class WebRTCClient {

    public pc = new RTCPeerConnection ({
        iceServers : iceServers
    });
    
    constructor() {
        console.log('create WebRTCClient instance')
    }

    public statePublisher = merge(
        fromEventPattern<RTCPeerConnection>(handler => this.pc.onconnectionstatechange = event => handler(event.target)),
        fromEventPattern<RTCPeerConnection>(handler => this.pc.oniceconnectionstatechange = event => handler(event.target)),
        fromEventPattern<RTCPeerConnection>(handler => this.pc.onicegatheringstatechange = event => handler(event.target)),
        fromEventPattern<RTCPeerConnection>(handler => this.pc.onsignalingstatechange = event => handler(event.target)),
    )

    public create = (deviceId: string) => {
        return zip(
            this.getAudioStream(deviceId)
                .map(stream => stream.getTracks())
                .map(track => this.pc.addTrack(track[0])),
            // this.getVideoStream(deviceId)
            //     .map(stream => stream.getTracks())
            //     .map(track => this.pc.addTrack(track[0])),
        )

    }
    public configure = (audio?: boolean, video?: boolean, deviceId?: string) => {
        console.log(this.pc.getSenders());
        if (video && deviceId) {
            return this.getVideoStream(deviceId)
                .map(stream => stream.getTracks())
                .map(track => this.pc.addTrack(track[0]))
        }
        if (!video) {
            console.log('configure', audio, video, deviceId)

            const senders = this.pc.getSenders();
            senders.forEach(sender => {
                if (sender.track!.kind == 'video') {
                    this.pc.removeTrack(sender);
                }
            })
            return rx.Observable.of({});
        }
        return rx.Observable.never();
        // const 
        // this.pc.get()
        // return zip(
        //     this.getAudioStream()
        //         .map(stream => stream.getTracks())
        //         .map(track => this.pc.addTrack(track[0])),
        //     this.getVideoStream(deviceId)
        //         .map(stream => stream.getTracks())
        //         .map(track => this.pc.addTrack(track[0])),
        // )
    }
    public addCandidate(candidate: RTCIceCandidateInit) {
        return this.pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(err => console.log('error ice', err))
    }
    private getAudioStream = (deviceId: string) =>  
        rx.Observable.from(navigator.mediaDevices.getUserMedia({audio:  { deviceId }, video: false}))
            .do(stream => stream.stop = () => stream.getTracks().forEach(track => track.stop()))
    

    private getVideoStream = (deviceId: string) =>
        rx.Observable.from(navigator.mediaDevices.getUserMedia({audio: false, video: { deviceId }}))
            .do(stream => stream.stop = () => stream.getTracks().forEach(track => track.stop()))
    
}