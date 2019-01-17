import * as rx from 'rxjs/Rx';
import { merge, zip, fromEventPattern, of, never, Observable } from 'rxjs';
import { tap, map, filter, flatMap } from 'rxjs/operators';

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
    
    public statePublisher = merge(
        fromEventPattern<RTCPeerConnection>(handler => this.pc.onconnectionstatechange = event => handler(event.target)),
        fromEventPattern<RTCPeerConnection>(handler => this.pc.oniceconnectionstatechange = event => handler(event.target)),
        fromEventPattern<RTCPeerConnection>(handler => this.pc.onicegatheringstatechange = event => handler(event.target)),
        fromEventPattern<RTCPeerConnection>(handler => this.pc.onsignalingstatechange = event => handler(event.target)),
    )
    .share()
    // .pipe(
    //     flatMap((event) => {
    //         if (event.target) {
    //             return of(event.target)
    //         }
    //         return never();
    //     }),
    // )

    public create = (deviceId: string) =>
        zip(
            this.getAudioStream()
                .map(stream => stream.getTracks())
                .map(track => this.pc.addTrack(track[0])),
            this.getVideoStream(deviceId)
                .map(stream => stream.getTracks())
                .map(track => this.pc.addTrack(track[0])),
        )

        // .do(() => {

        //     this.pc.onconnectionstatechange = ()=> console.log (" PC.onconnectionstatechange : " + this.pc.connectionState)
        //     // this.pc.oniceconnectionstatechange = ()=> console.log (" PC.oniceconnectionstatechange : " + this.pc.iceConnectionState)
        //     // this.pc.onicegatheringstatechange = ()=> console.log (" onicegatheringstatechange : " + this.pc.iceGatheringState)
        //     // this.pc.onsignalingstatechange = ()=> console.log (" PC.onsignalingstatechange : " + this.pc.signalingState);
        // })

    // public setLocalVideo = (id: number) => 
    //     this.getVideoStream ()
    //         .do((stream) =>  (<HTMLVideoElement>document.getElementById ('localVideo'+id)).srcObject = stream);
    

    // public setRemoteVideo = (id:number, remoteId: string) => {

    //     const remoteVideo = document.createElement('video');
    //     remoteVideo.id = 'remoteVideo' + id + '_' + remoteId;
    //     remoteVideo.autoplay = true;
    //     remoteVideo.height = 100;
    //     remoteVideo.width = 100;

    //     const box = document.getElementById('videobox'+id);
    //     if (box) {
    //         box.appendChild(remoteVideo);
    //     }


    //     this.pc.ontrack = (event: RTCTrackEvent) => {
    //         console.log('ontrack', event)
    //         let stream = new MediaStream();
    //         stream.addTrack(event.track);
            
    //         (<HTMLVideoElement>document.getElementById ('remoteVideo' + id + '_' + remoteId)).srcObject = stream;
    //     }

    // }
    
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