import {from, Subscription} from 'rxjs';
import { tap, map } from 'rxjs/operators';
import React, { Component } from 'react';
import { Button } from 'antd';
const ButtonGroup = Button.Group;
import {Participant} from '../../lib/Participant';
import { WebRTCClient } from '../../lib/WebRTCClient';

import {Video} from '../Video/Video';

interface Props {
    id: number
    roomId: number
    unmount: (id: number) => void
    deviceId: string
}

interface State {
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
    private participant: Participant

    private subscribersListener: Subscription;
    private webrtcStateListener: Subscription;
    componentWillUnmount = () => {
        if (this.localVideoStream) {
            this.localVideoStream.stop()
        }
        this.subscribersListener.unsubscribe();
        this.webrtcStateListener.unsubscribe();
    }
    videoTag:React.RefObject<HTMLVideoElement>;
    state: State = {
        subscrubersKey: 0,
        subscriptions: []
    }
    constructor(props: Props) {
        super(props);
        this.setLocalVideo().subscribe();
        this.videoTag = React.createRef();
        this.participant = new Participant('ws://localhost:8090/', this.props.id, this.props.deviceId);
        this.participant.create(this.props.roomId).subscribe();
    
        this.subscribersListener = this.participant.subscribersPublisher
            .map((obj) => {
                const subscrubersKey = this.state.subscrubersKey + 1;

                let videoTag:React.RefObject<HTMLVideoElement> = React.createRef();
                obj.webRTC.pc.ontrack = (event: RTCTrackEvent) => {
                    console.log('track event' ,event);
                    let stream = new MediaStream();
                    stream.addTrack(event.track);
                    if (videoTag.current) {
                        videoTag.current.srcObject = stream;
                    }
                }
                obj.webRTC.statePublisher
                    .do(target => {
                        if (target.iceConnectionState === 'disconnected') { // TODO
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

        this.webrtcStateListener = this.participant.webrtcStatePublisher   
            .do((target) => {
                this.setState({
                    ...this.state,
                    iceconnectionstate: target.iceConnectionState,
                    icegatheringstate: target.iceGatheringState,
                    signalingstate: target.signalingState
                })
            })
            .subscribe()
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
        this.participant.leaveRoom();
        const subs = this.state.subscriptions
        subs.forEach(element => {
            element.peerConntectoion.pc.close();
        });
        this.setState({
            subscriptions: []
        });
        if (this.localVideoStream) {
            this.localVideoStream.stop()
        }
        this.props.unmount(this.props.id);
    }
    private unpublish = () => {
        this.participant.unpublish();
    }
    private publish = () => {
        this.participant.createPublisherPeerConnection();
    }
    render() {
        return <div>
            <div>
               <div><strong>IceConnection state:</strong> {this.state.iceconnectionstate}</div>
               <div><strong>Icegathering state:</strong> {this.state.icegatheringstate}</div>
               <div><strong>Signaling state:</strong> {this.state.signalingstate}</div>
            </div>
            <div>
                <ButtonGroup>
                    <Button size='small' type='danger' onClick={this.leaveRoom}>Leave Room</Button>
                    <Button size='small' type='dashed' onClick={this.unpublish}>Unpublish</Button>
                    <Button size='small' type='dashed' onClick={this.publish}>Publish</Button>
                </ButtonGroup>
            </div>
            <h6>Local video</h6>
            <video autoPlay style={{height: 50, width: 50}} ref={this.videoTag}></video>
            <div className="subscriptions-container">
                <h6>Remote video</h6>
                {this.state.subscriptions.map(subscription => subscription.component)}
            </div>
        </div>
    }
}