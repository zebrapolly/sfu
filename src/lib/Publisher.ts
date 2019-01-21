import * as rx from 'rxjs/Rx';

import { WebSocketAdapter } from "./janus/WebSocketAdapter";
import { JanusHandler } from "./janus/JanusHandler";

import { JanusResponse } from "./janus/JanusResponse";
import { WebRTCClient } from "./WebRTCClient";

export class Publisher {

    private webRTCClient: WebRTCClient | null = null;
    public webrtcStateBus = new rx.Subject<RTCPeerConnection>();

    private janusHandler  = new JanusHandler (this.webSocket);
    private handlerSubscription: rx.Subscription | null = null;

    public publisherStateBus = new rx.Subject();
    public subscribersPublisher: rx.Subject<number> = new rx.Subject();

    constructor(
        private webSocket: WebSocketAdapter,
        private id: number,
        private deviceId: string,
        roomId: number
        ) {
        this.janusHandler.connect()
            .do(() => this.janusHandler.send({
                body: {
                    request: 'join',
                    ptype: 'publisher',
                    room: roomId
                }
            }))
            .subscribe(
                () => {},
                () => {},
                () => this.handlerSubscription = this.janusHandler.publisher
                    .flatMap(message => this.onMessage(message))
                    .do((d) => console.log('d:', d))
                    .subscribe(this.publisherStateBus)
            );
    }

    private onMessage = (message: JanusResponse) => 
        rx.Observable.of(message)
            .flatMap(message => {
                if (message.janus == 'event') {
                    if (message.plugindata.data.videoroom == 'joined') {
                        this.publish();
                    } else if (message.plugindata.data.configured == 'ok') {
                        if (this.webRTCClient) {
                            if (!this.webRTCClient.pc.remoteDescription) {
                                return rx.Observable.from(this.webRTCClient.pc.setRemoteDescription (message.jsep))
                                .map(() => 'publishing')
                            } else {
                                return rx.Observable.of('publishing')
                            }
                        }
                    } else if (message.plugindata.data.unpublished === 'ok') {
                        return rx.Observable.of('unpublished');
                    } else if (message.janus == 'event') {    
                        if (message.plugindata.data.publishers != undefined) {
                            if (message.plugindata.data.publishers[0] !== undefined) {
                                this.subscribersPublisher.next(message.plugindata.data.publishers[0].id);
                            }
                        }
                    }
                }
                return rx.Observable.never();
            })
        
    public unpublish = () => {
        this.janusHandler.send({
            body: {
                request: "unpublish"
            }
        })
        if (this.webRTCClient) {
            this.webRTCClient.pc.close();
            this.webRTCClient = null;
        }
    }
    public publish = () => {
        if (this.webRTCClient) {
            console.log('herereere')
            rx.Observable.of({})
                .do(() => {
                    this.janusHandler.send({
                        body : {
                            request: "publish",
                            audio : true,
                            video: true,
                            display: 'participant ' + this.id
                        }
                    });
                }).subscribe();
        } else {
            this.webRTCClient = new WebRTCClient();
            this.webRTCClient.statePublisher.subscribe(this.webrtcStateBus);
    
            this.webRTCClient.create(this.deviceId)
                .flatMap(() => 
                    rx.Observable.from(this.webRTCClient!.pc.createOffer({
                        offerToReceiveVideo : true,
                        offerToReceiveAudio : true
                    })))
                    .do(offer => {
                        this.janusHandler.send({
                            body : {
                                request: "configure",
                                audio : true,
                                video: true,
                                display: 'participant ' + this.id 
                            },
                            jsep : {
                                type : "offer",
                                sdp : offer.sdp
                            }
                        })
                    })
                    .do(answer => this.webRTCClient!.pc.setLocalDescription (answer))
                .subscribe();
    
            this.webRTCClient.pc.onicecandidate = ice => {
                if (ice.candidate != null) {
                    this.janusHandler.send ({
                        janus : 'trickle',
                        candidate : ice.candidate
                    })
                }
            }
        }

    }
    public deletePublisher = () => {
        if (this.handlerSubscription) {
            this.handlerSubscription.unsubscribe();
        }
        
    }
}