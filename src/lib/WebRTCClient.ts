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
    private audio: boolean = false;
    private video: boolean = false;
    constructor() {
        console.log('create WebRTCClient instance')
    }

    public statePublisher = merge(
        fromEventPattern<RTCPeerConnection>(handler => this.pc.onconnectionstatechange = event => handler(event.target)),
        fromEventPattern<RTCPeerConnection>(handler => this.pc.oniceconnectionstatechange = event => handler(event.target)),
        fromEventPattern<RTCPeerConnection>(handler => this.pc.onicegatheringstatechange = event => handler(event.target)),
        fromEventPattern<RTCPeerConnection>(handler => this.pc.onsignalingstatechange = event => handler(event.target)),
    ).share();

    // public create = (deviceId: string) => {
    //     return zip(
    //         this.getAudioStream(deviceId)
    //             .map(stream => stream.getTracks())
    //             .map(track => this.pc.addTrack(track[0])),
    //         // this.getVideoStream(deviceId)
    //         //     .map(stream => stream.getTracks())
    //         //     .map(track => this.pc.addTrack(track[0])),
    //     )

    // }
    public configure = (audio: boolean, video: boolean, deviceId?: string) => {
        console.log(this.pc.getSenders());
        let res = rx.Observable.of({});
        if (video && !this.video && deviceId) {
            res = res.zip(
                this.getVideoStream(deviceId)
                    .map(stream => stream.getTracks())
                    .map(track => this.pc.addTrack(track[0]))
            )
        }
        if (!video && this.video) {
            const senders = this.pc.getSenders();
            console.log('sender', senders)

            senders.forEach(sender => {
                if (sender.track!.kind == 'video') {
                    sender.track!.stop();

                    this.pc.removeTrack(sender);
                }
            })
        }

        if (audio && !this.audio) {
            res = res.zip(
                this.getAudioStream()
                    .map(stream => stream.getTracks())
                    .map(track => this.pc.addTrack(track[0]))
            )
   
        }

        if (!audio && this.audio) {
            const senders = this.pc.getSenders();
            console.log('sender', senders)

            senders.forEach(sender => {
                if (sender.track!.kind == 'audio') {
                    sender.track!.stop();
                }
            })
        }
        // if (audio && video && !this.audio && !this.video && deviceId) {
        //     return zip(
        //         this.getAudioStream()
        //             .map(stream => stream.getTracks())
        //             .map(track => this.pc.addTrack(track[0])),
        //         this.getVideoStream(deviceId)
        //             .map(stream => stream.getTracks())
        //             .map(track => this.pc.addTrack(track[0])),
        //     )
        // }
        this.audio = audio;
        this.video = video;
        return res
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
    private getAudioStream = () =>  
        rx.Observable.from(navigator.mediaDevices.getUserMedia({audio: true, video: false}))
            .do(stream => stream.stop = () => stream.getTracks().forEach(track => track.stop()))
    

    private getVideoStream = (deviceId: string) =>
        rx.Observable.from(navigator.mediaDevices.getUserMedia({audio: false, video: { deviceId }}))
            .do(stream => stream.stop = () => stream.getTracks().forEach(track => track.stop()))
    
}