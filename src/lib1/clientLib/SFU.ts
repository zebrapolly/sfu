import { ClientLib } from "./api";
import server from "../serverLib/server";
import { empty, of, from, never  } from "rxjs";
import { tap, flatMap, map, finalize } from "rxjs/operators";


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

class SFU implements ClientLib.SFU {

    constructor(private dialogId: string) {

    }
    private pc = new RTCPeerConnection ({
        iceServers : iceServers
    });
    public joinRoom = (publisherStream: MediaStream) => {
        console.log('publisherStream', publisherStream)
        return this.addTrack(publisherStream)
            .pipe(
                flatMap(() => from(this.pc.createOffer({
                    offerToReceiveVideo : true,
                    // offerToReceiveAudio : true
                }))),
                flatMap(offer => {
                    return from(this.pc.setLocalDescription(offer))
                        .map(() => offer);
                }),
                flatMap(offer => server.joinRoom({
                    offer,
                    roomId: 1234,
                    dialogId: this.dialogId,
                    audio: false,
                    video: true,
                    // pin
                })),
                flatMap(answer => this.pc.setRemoteDescription(answer)),
                flatMap(() => server.getParticipantObserver(1234, this.dialogId)),
                finalize(() => {}),
                tap(sub => this.pc.onicecandidate = ice => {
                    if (ice.candidate) {
                        sub.next(ice)
                    }
                }),
                tap(sub => sub
                    .pipe(
                        tap(message => {
                            if (message.sdpMid) {
                                this.pc.addIceCandidate(message);
                            }
                        })
                    )
                    .subscribe())
                // tap(observer => {
                //     observer.pipe(
                //         map(sub => this.pc.onicecandidate = ice => {
                //             if (ice.candidate) {
                //                 sub.next(ice)

                //             }
                //             // console.log('ice:', ice);
                //         })
                //     )
                //     .subscribe()
                // })
            )
    }

    public createConversation = (publisherStream: MediaStream) => {
        return this.addTrack(publisherStream)
            .pipe(
                flatMap(() => from(this.pc.createOffer({
                    offerToReceiveVideo : true,
                    // offerToReceiveAudio : true
                }))),
                flatMap(offer => {
                    return from(this.pc.setLocalDescription(offer))
                        .map(() => offer);
                }),
                // map(offer => offer.sdp),
                flatMap(offer => server.createConversation({
                    offer,
                    dialogId: this.dialogId,
                    audio: false,
                    video: false,
                    // pin
                })),                
                // flatMap(answer => this.pc.setRemoteDescription(answer))
                // map(server)
                // tap((sdp) => console.log('sdp', sdp))
            )
        // return empty();
        // return server.createParticipant(id);
    }

    private addTrack = (stream: MediaStream) => {
        return of(stream.getTracks())
                .pipe(
                    map(tracks => this.pc.addTrack(tracks[0]))
                )
    }
}

export default SFU;