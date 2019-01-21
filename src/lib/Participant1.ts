import * as rx from 'rxjs/Rx';

import { JanusHandler } from "./janus/JanusHandler";
import { JanusResponse } from './janus/JanusResponse';
import { WebRTCClient } from './WebRTCClient';
import { WebSocketAdapter } from './janus/WebSocketAdapter';


export class Participant {

    private readonly webSocket = new WebSocketAdapter(this.url, 'janus-protocol');
    
    private connection: JanusHandler;
    
    private webRTCClient: WebRTCClient | null = null;

    public prepareParticipant = new rx.Subject();
    public webrtcStatePublisher = new rx.Subject<RTCPeerConnection>();
    public subscribersPublisher: rx.Subject<{webRTC: WebRTCClient, publisher: string}> = new rx.Subject();

    private roomId: number | null = null;

    constructor(private readonly url: string, private id: number, private deviceId: string) {
        this.connection = new JanusHandler (this.webSocket);

        this.connection.publisher.flatMap(this.participantProcedure).subscribe();


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
    
    public leaveRoom = () => {
        this.connection.send({
            body: {
                request: 'leave'
            }
        })
        this.webSocket.close();
        if (this.webRTCClient) {
            this.webRTCClient.pc.close();
        }

    }

    public createPublisherPeerConnection = () => {
        console.log('this.webRTCClient', this.webRTCClient)
        if (!this.webRTCClient) {
        // const webRTCClient = new WebRTCClient();
            console.log('CREATE this.webRTCClient')
            this.webRTCClient = new WebRTCClient();
            this.webRTCClient.statePublisher.subscribe(this.webrtcStatePublisher)

        }
        console.log('this.webRTCClient!.pc.localDescription', this.webRTCClient.pc.localDescription)
        console.log('this.webRTCClient!.pc.remoteDescription', this.webRTCClient.pc.remoteDescription)
        this.webRTCClient.create(this.deviceId)    
            .flatMap(() => {
                if (this.webRTCClient 
                     ) {
                    return rx.Observable.from(this.webRTCClient.pc.createOffer({
                        offerToReceiveVideo : true,
                        offerToReceiveAudio : true
                    }))
                    } 
                    return rx.Observable.never();
                }).do(offer => this.connection.send({
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
                }))
            .do(offer => this.webRTCClient!.pc.setLocalDescription (offer))
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
        const client = new JanusHandler(this.webSocket);
        let webRTC: WebRTCClient
        client.publisher
        .flatMap(async message => {
            console.log('message from client.publisher', message)
            if (message.janus == 'event') {
                
                if (message.plugindata.data.videoroom == 'attached') {
                    console.log('subscribed', this.id, message.plugindata.data.display)
                    
                    webRTC = new WebRTCClient();
                    rx.Observable.of(webRTC)
                        .do(webRTC => {
                            this.subscribersPublisher.next({
                                webRTC,
                                publisher: message.plugindata.data.display
                            })
                        })
                        .flatMap(() => webRTC.pc.setRemoteDescription (message.jsep))
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
                        .do(answer => webRTC.pc.setLocalDescription (answer))
                        .subscribe()

                    webRTC.pc.onicecandidate = ice => {

                        if (ice.candidate != null) {

                            client.send ({
                                janus : 'trickle',
                                candidate : ice.candidate
                            })

                        }
                    }
                }
            } 
            // else if (message.janus == 'trickle') {
            //     if (message.candidate && webRTC && !message.candidate.completed) {
            //         webRTC.addCandidate ({
            //             ...message.candidate,
            //         })
            //     }
            // }
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
    public unpublish = () => {
        if (this.webRTCClient) {
            this.webRTCClient.pc.close();
        }
        this.webRTCClient = null;
        this.connection.send({
            body: {
                request: "unpublish"
            }
        })
    }
    // public publish = () => {
    //     this.webRTCClient.pc.get
    // }
    private participantProcedure = (message: JanusResponse) => {
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
                console.log('message lalalal', message)
                if (this.webRTCClient) {
                    this.webRTCClient.pc.setRemoteDescription (message.jsep)
                }
                this.prepareParticipant.next();
                this.prepareParticipant.complete();
            }
            else if (message.plugindata.data.publishers != undefined) {
                if (message.plugindata.data.publishers[0] !== undefined) {
                    this.createSubscriberPeerConnection(message.plugindata.data.publishers[0].id);
                }
            }
            else if (message.plugindata.data.leaving === 'ok') {
                this.connection.send ({
                    janus: 'detach'
                })
            }
            // else if (message.plugindata.data.error_code === 432 && this.webRTCClient) {
            //     this.webRTCClient.pc.close();
            //     this.webRTCClient = null;
            // }
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