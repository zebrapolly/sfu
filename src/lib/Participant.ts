import * as rx from 'rxjs/Rx';

import { JanusClient } from "./janus/JanusClient";
import { JanusResponse } from './janus/JanusResponse';
import { WebRTCClient } from './WebRTCClient';
import { WebSocketAdapter } from './janus/WebSocketAdapter';

export class Participant {

    private readonly webSocket = new WebSocketAdapter(this.url, 'janus-protocol');
    
    private connection: JanusClient;
    
    private webRTCClient = new WebRTCClient();

    public prepareParticipant = new rx.Subject();

    public subscribersPublisher: rx.Subject<WebRTCClient> = new rx.Subject();

    private roomId: number | null = null;

    constructor(private readonly url: string, private id: number) {
        this.connection = new JanusClient (this.webSocket);

        this.connection.publisher.flatMap(this.publish).subscribe();

        // this.webRTCClient.setLocalVideo(this.id).subscribe();

    }

    public create = (roomId: number) => rx.Observable.of ({})
        .switchMap (() => this.connection.connect ())
        .do(() => this.roomId = roomId)
        .do (() =>
            this.connection.send ({
                body: {
                    request: 'join',
                    ptype: 'publisher',
                    room: roomId
                }
            })
        )
        .switchMap(() => this.prepareParticipant)
    

    private createPublisherPeerConnection = () => {
        this.webRTCClient.create()    
            .flatMap(() => rx.Observable.from(this.webRTCClient.pc.createOffer({
                offerToReceiveVideo : true,
                offerToReceiveAudio : true
            }))
            .do(offer => this.connection.send({
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
            })))
            .do(offer => this.webRTCClient.pc.setLocalDescription (offer))
        .subscribe();
        this.webRTCClient.pc.onicecandidate = ice => {
            if (ice.candidate != null) {
                this.connection.send ({
                    janus : 'trickle',
                    candidate : ice.candidate
                })
            }
        }

    }

    private createSubscriberPeerConnection = (publisherId: number) => {
        let subscribed = false;
        const client = new JanusClient(this.webSocket);
       
        client.publisher
        .flatMap(async message => {
            if (message.janus == 'event') {
                
                if (message.plugindata.data.videoroom == 'attached' && !subscribed) {
                    // console.log('subscribed', subscribed, this.id, message.plugindata.data.display)
                    
                    let webRTC: WebRTCClient = new WebRTCClient();
                    rx.Observable.of(webRTC)
                        .do(webRTC => {
                            console.log('webRTC:', webRTC)
                            this.subscribersPublisher.next(webRTC)
                        })
                        .flatMap(webRtc => webRtc.create())
                        .do(() => webRTC.pc.setRemoteDescription (message.jsep))
                        .flatMap(() => 
                            rx.Observable.from(webRTC.pc.createAnswer({
                                offerToReceiveVideo : true,
                                offerToReceiveAudio : true
                            }))
                            .do(answer => client.send({
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
                        .flatMap(answer => webRTC.pc.setLocalDescription (answer))
                        .do(() => subscribed = true)
                        .subscribe()

                    webRTC.pc.onicecandidate = ice => {

                        if (ice.candidate != null) {
                            webRTC.pc.setRemoteDescription (message.jsep);

                            client.send ({
                                janus : 'trickle',
                                candidate : ice.candidate
                            })

                        }
                    }
                }
            }
        })
        .subscribe();

        client.connect().do((x) => {
                client.send({
                    body: {
                        request: 'join',
                        ptype: 'subscriber',
                        room: this.roomId,
                        feed: publisherId
                    }
                })
            })
            .subscribe();
    }
    private publish = (message: JanusResponse) => {
        console.log(message);
        if (message.janus == 'event') {
            if (message.plugindata.data.videoroom == 'joined') {
                this.createPublisherPeerConnection();
                this.connection.send ({
                    body: {
                        request: 'listparticipants',
                        room: this.roomId,
                    }
                })
            }
            else if ((message.plugindata.data.videoroom == 'event') && (message.jsep != undefined)){
                rx.Observable.from(this.webRTCClient.pc.setRemoteDescription (message.jsep))
                this.prepareParticipant.next();
                this.prepareParticipant.complete();
            }
            else if (message.plugindata.data.publishers != undefined) {
                if (message.plugindata.data.publishers[0] !== undefined) {
                    this.createSubscriberPeerConnection(message.plugindata.data.publishers[0].id);
                }
            }
        } else if (message.candidate && message.janus == 'trickle') {
            if (message.candidate.completed != true) {
            }
        } else if (message.janus == 'success') {
            if ((message.plugindata) &&(message.plugindata.data.videoroom == 'participants') && (message.plugindata.data.participants !== undefined)) {
                message.plugindata.data.participants.forEach(participant => {
                    if (participant.publisher) {
                        this.createSubscriberPeerConnection(participant.id)
                    }
                })
            }
        }
        return rx.Observable.empty();
    }
}