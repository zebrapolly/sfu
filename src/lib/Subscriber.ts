import * as rx from 'rxjs/Rx';

import { WebRTCClient } from "./WebRTCClient";
import { JanusHandler } from './janus/JanusHandler';
import { WebSocketAdapter } from './janus/WebSocketAdapter';
import { JanusResponse } from './janus/JanusResponse';

export class Subscriber {
    private webRTCClient: WebRTCClient | null = null;
    public webrtcStateBus = new rx.Subject<RTCPeerConnection>();

    private janusHandler  = new JanusHandler (this.webSocket);
    private handlerSubscription: rx.Subscription | null = null;

    public subscriberStateBus = new rx.Subject<{
        webRTC: WebRTCClient,
        publisher: string
    }>();

    constructor(
        private webSocket: WebSocketAdapter,
        publisherId: number,
        private roomId: number
    ) {
        this.janusHandler.connect()
        .do(() => this.janusHandler.send({
            body: {
                request: 'join',
                ptype: 'subscriber',
                room: roomId,
                feed: publisherId
            }
        }))
        .subscribe(
            () => {},
            () => {},
            () => this.handlerSubscription = this.janusHandler.publisher
                .flatMap(message => this.onMessage(message))
                .subscribe(this.subscriberStateBus)
        );
    }
    private onMessage = (message: JanusResponse) => 
    rx.Observable.of(message)
    
        .flatMap(message => {
            if (message.janus == 'event') {
                if (message.plugindata.data.videoroom == 'attached') {                    
                    this.webRTCClient = new WebRTCClient();
                    rx.Observable.of(this.webRTCClient)
                        .flatMap(webRTC => webRTC.pc.setRemoteDescription (message.jsep))
                        .flatMap(() => 
                            rx.Observable.from(this.webRTCClient!.pc.createAnswer({
                                offerToReceiveVideo : true,
                                offerToReceiveAudio : true
                            }))
                            .do(answer => this.janusHandler.send({
                                body : {
                                    request: "start",
                                    room : this.roomId,
                                    video: true,
                                    audio: true
                                },
                                jsep : {
                                    type : "answer",
                                    sdp : answer.sdp
                                }
                            })
                        ))
                        .do(answer => this.webRTCClient!.pc.setLocalDescription (answer))
                        .subscribe()

                    this.webRTCClient.pc.onicecandidate = ice => {

                        if (ice.candidate != null) {

                            this.janusHandler.send ({
                                janus : 'trickle',
                                candidate : ice.candidate
                            })

                        }
                    }
                    return rx.Observable.of({
                        webRTC: this.webRTCClient,
                        publisher: message.plugindata.data.display
                    });
                }
            }
            return rx.Observable.never();
        })
}