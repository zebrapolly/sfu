import {from, Subscription, never} from 'rxjs';
import { tap, map } from 'rxjs/operators';
import React, { Component } from 'react';
import { Button, Switch } from 'antd';
const ButtonGroup = Button.Group;
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
    audio: boolean
    video: boolean
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
        audio: true,
        video: false,
        unpublished: true,
        subscrubersKey: 0,
        subscriptions: []
    }
    constructor(props: Props) {
        super(props);
        
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
    private destoySubscriber = (subscrubersKey: number) => {
        console.log('subscrubersKey', subscrubersKey, this.state)
        const subscriptions = this.state.subscriptions.filter(subscription => subscription.key != subscrubersKey);
        this.setState({
            ...this.state,
            subscriptions
        })
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

            this.setState({
                subscrubersKey,
                subscriptions: [
                    ...this.state.subscriptions,
                    {   
                        key: subscrubersKey,
                        component: <Video onDestroy={this.destoySubscriber} key={this.state.subscrubersKey} title={`publisher: ${obj.publisher}`} statePublisher={obj.webRTC.statePublisher} videoTag={videoTag}/>,
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

                        if (this.localVideoStream) {
                            if (!this.localVideoStream.active) {
                                this.setLocalVideo().subscribe()
                            }
                        } else {
                            this.setLocalVideo().subscribe()
                        }
                            

                        this.setState({
                            ...this.state,
                            unpublished: false
                        })
                    } else if (state == 'unpublished') {


                        this.localVideoStream!.stop()
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
    private toggleVideo = (checked: boolean) => {
        this.setState({
            ...this.state,
            video: checked
        })
        if (this.publisher) {
            this.publisher.configure(
                this.state.audio,
                checked
            )
        }
    }
    private toggleAudio = (checked: boolean) => {
        this.setState({
            ...this.state,
            audio: checked
        })
        if (this.publisher) {
            this.publisher.configure(
                checked,
                this.state.video
            )
        }
    }
    render() {
        return <div>
            <div style={{display:'flex'}}>
                <ButtonGroup style={{marginBottom: '5px'}}>
                    <Button size='small' type='danger' onClick={this.leaveRoom}>Leave Room</Button>
                    <Button disabled={this.state.unpublished} size='small' type='dashed' onClick={this.unpublish}>Unpublish</Button>
                    <Button disabled={!this.state.unpublished} size='small' type='dashed' onClick={this.publish}>Publish</Button>
                </ButtonGroup>
                <Switch checkedChildren='Video' defaultChecked={this.state.video} onChange={this.toggleVideo} unCheckedChildren="Video" style={{marginLeft: 5}}/>
                <Switch checkedChildren='Audio' defaultChecked={this.state.audio} onChange={this.toggleAudio} unCheckedChildren="Audio" style={{marginLeft: 5}}/>
            </div>
            <div style={{display:'flex'}}>
                {this.publisher && <Video title='Local video' videoTag={this.videoTag} statePublisher={this.publisher.webrtcStateBus}/>}
                {this.state.subscriptions.map(subscription => subscription.component)}
            </div>

        </div>
    }
}