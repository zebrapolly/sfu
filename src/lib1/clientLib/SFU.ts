import { ClientLib } from "./api";
import server from "../serverLib/server";
import { empty, of, from } from "rxjs";
import { tap, flatMap, map } from "rxjs/operators";


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
    private static instance: SFU;
    private pc = new RTCPeerConnection ({
        iceServers : iceServers
    });
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
                map(offer => offer.sdp),
                flatMap(sdp => server.createConversation({
                    sdp,
                    // audio,
                    // video,
                    // pin
                })),
                tap((sdp) => console.log('sdp', sdp)),
                
                flatMap(answer => this.pc.setRemoteDescription(answer))
                // map(server)
                // tap((sdp) => console.log('sdp', sdp))
            )
        // return empty();
        // return server.createParticipant(id);
    }

    private addTrack = (stream: MediaStream) => {
        return from(stream.getTracks())
                .pipe(
                    map(track => this.pc.addTrack(track))
                )
    }
    static getInstance() {
        if (!SFU.instance) {
            SFU.instance = new SFU();
        }
        return SFU.instance;
    }
}

export default SFU.getInstance();