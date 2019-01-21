import {from, Subscription, never} from 'rxjs';
import { tap, map } from 'rxjs/operators';
import React, { Component } from 'react';
import { Button, message, Card } from 'antd';
const ButtonGroup = Button.Group;
import {Participant} from '../../lib/Participant';
import { WebRTCClient } from '../../lib/WebRTCClient';

import {Video} from '../Video/Video';
import { Publisher } from '../../lib/Publisher';
import { WebSocketAdapter } from '../../lib/janus/WebSocketAdapter';
import { JanusHandler } from '../../lib/janus/JanusHandler';
import { Subscriber } from '../../lib/Subscriber';

interface Props {
    id: number
    roomId: number
    unmount: (id: number) => void
    deviceId: string
}

interface State {
    unpublished: boolean


    subscrubersKey: number
    connectionstate?: string
    iceconnectionstate?: string
    icegatheringstate?: string
    signalingstate?: string
    subscriptions: {
        key: number
        component: any
        peerConntectoion: WebRTCClient
    }[]
}

export class ParticipantView extends Component<Props, State>{

    private localVideoStream?: MediaStream;
    
    private readonly webSocket = new WebSocketAdapter('ws://localhost:8090/', 'janus-protocol');

    private publisher: Publisher | null = null;
    private subscribersListener: Subscription | null = null;
    private webrtcStateListener: Subscription | null = null;
    componentWillUnmount = () => {
        if (this.localVideoStream) {
            this.localVideoStream.stop()
        }
        if (this.subscribersListener) {
            this.subscribersListener.unsubscribe();
        }
        if (this.webrtcStateListener) {
            this.webrtcStateListener.unsubscribe();
        }
    }
    videoTag:React.RefObject<HTMLVideoElement>;
    state: State = {
        unpublished: true,
        subscrubersKey: 0,
        subscriptions: []
    }
    constructor(props: Props) {
        super(props);
        this.setLocalVideo().subscribe();
        this.videoTag = React.createRef();
        this.webSocket.connect()
            .do(() => {
                this.getRoomPublishers();
                this.publish();
            }
            )
            .subscribe();
    }
    private getRoomPublishers = () =>  {
        const handeler = new JanusHandler(this.webSocket);
        handeler.connect()
        .do(() => {
            handeler.send({
                body: {
                    request: 'listparticipants',
                    room: this.props.roomId,
                }
            })
        })
        .subscribe();

        handeler.publisher
            .flatMap(message => {
                console.log('message from getRoomPublishers', message)
                if (message.janus == 'success') {
                    if ((message.plugindata) &&(message.plugindata.data.videoroom == 'participants') && (message.plugindata.data.participants)) {
                        message.plugindata.data.participants.forEach(participant => {
                            if (participant.publisher) {
                                this.addSubscriber(participant.id);
                            }
                        })
                    }
                }
                return never();
            })
            .subscribe();

    }
    private addSubscriber = (participantId: number) => {
        const subscriber = new Subscriber(this.webSocket, participantId, this.props.roomId);
        subscriber.subscriberStateBus
        .do(obj => {
            const subscrubersKey = this.state.subscrubersKey + 1;

            let videoTag:React.RefObject<HTMLVideoElement> = React.createRef();
            obj.webRTC.pc.ontrack = (event: RTCTrackEvent) => {
                let stream = new MediaStream();
                stream.addTrack(event.track);
                if (videoTag.current) {
                    videoTag.current.srcObject = stream;
                }
            }
            obj.webRTC.statePublisher
                .do(target => {
                    if (target.iceConnectionState === 'disconnected') {
                        const subscriptions = this.state.subscriptions.filter(subscription => subscription.key != subscrubersKey);
                        this.setState({
                            ...this.state,
                            subscriptions
                        })
                    }
                })
                .subscribe()

            this.setState({
                subscrubersKey,
                subscriptions: [
                    ...this.state.subscriptions,
                    {   
                        key: subscrubersKey,
                        component: <Video key={this.state.subscrubersKey} title={`publisher: ${obj.publisher}`} statePublisher={obj.webRTC.statePublisher} videoTag={videoTag}/>,
                        peerConntectoion: obj.webRTC
                    }
                ]
            })
        })
        .subscribe();

    }
    public setLocalVideo = () => {
        return this.getVideoStream ()
            .pipe(
                map((stream: MediaStream) => {
                    if (this.videoTag.current) {
                        this.videoTag.current.srcObject = stream
                    }
                })
            );
    }

    private getVideoStream = () =>
        from(navigator.mediaDevices.getUserMedia({
            audio: false, 
            video: {deviceId: this.props.deviceId} 
        }))
            .pipe(
                tap((stream:MediaStream) => this.localVideoStream = stream),
                tap((stream:MediaStream) => stream.stop = () => stream.getTracks().forEach(track => track.stop()))
            )
    
    private leaveRoom = () => {
        const subs = this.state.subscriptions
        subs.forEach(element => {
            element.peerConntectoion.pc.close();
        });
        this.setState({
            subscriptions: []
        });
        this.unpublish();
        this.publisher = null;
        this.webSocket.close();

        this.props.unmount(this.props.id);
    }
    private unpublish = () => {
        if (this.publisher) {
            this.publisher.unpublish();
        }
    }
    private publish = () => {
        if (!this.publisher) {
            this.publisher = new Publisher(
                this.webSocket,
                this.props.id,
                this.props.deviceId,
                this.props.roomId
            )
            this.subscribersListener = this.publisher.subscribersPublisher
                .do(publisherId => this.addSubscriber(publisherId))
                .subscribe();

            this.webrtcStateListener = this.publisher.webrtcStateBus
                .do((target) => {
                    this.setState({
                        ...this.state,
                        iceconnectionstate: target.iceConnectionState,
                        icegatheringstate: target.iceGatheringState,
                        signalingstate: target.signalingState
                    })
                })
                .subscribe();
    
            this.publisher.publisherStateBus
                .do(state => {
                    console.log('state', state)
                    if (state === 'publishing') {
                        this.setState({
                            ...this.state,
                            unpublished: false
                        })
                    } else if (state == 'unpublished') {
                        this.setState({
                            ...this.state,
                            unpublished: true
                        })
                    }
                })
                .subscribe((x) => console.log('publisher', x))
        } else {
            this.publisher.publish();
        }

    }
    render() {
        return <div>
            <div>
                <ButtonGroup>
                    <Button size='small' type='danger' onClick={this.leaveRoom}>Leave Room</Button>
                    <Button disabled={this.state.unpublished} size='small' type='dashed' onClick={this.unpublish}>Unpublish</Button>
                    <Button disabled={!this.state.unpublished} size='small' type='dashed' onClick={this.publish}>Publish</Button>
                </ButtonGroup>
            </div>
            <div style={{display:'grid'}}>
                <Card size='small' title='Local video' style={{width:250}}>
                    <div>
                        <div><strong>IceConnection state:</strong> {this.state.iceconnectionstate}</div>
                        <div><strong>Icegathering state:</strong> {this.state.icegatheringstate}</div>
                        <div><strong>Signaling state:</strong> {this.state.signalingstate}</div>
                    </div>
                    <video autoPlay style={{height: 50, width: 50}} ref={this.videoTag}></video>
                </Card>
                {this.state.subscriptions.map(subscription => subscription.component)}
            </div>
        </div>
    }
}