import React, { Component } from 'react';
import {Card} from 'antd';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

interface State {
    statusContent: any
}

interface Props {
    statePublisher: Observable<RTCPeerConnection>
    videoTag: React.RefObject<HTMLVideoElement>
    title: string
}


export class Video extends Component<Props> {
    state = {
        statusContent: ''
    }
    stateSubscription = this.props.statePublisher
    .pipe(
        tap(target => this.setState({
            statusContent: this.createStatusContent(target)
            })
        )
    )
    .subscribe();

    componentWillUnmount = () => {
        this.stateSubscription.unsubscribe();
    }
    private createStatusContent = (target:RTCPeerConnection) => {
        return <div>
            <div><strong>IceConnection state:</strong> {target.iceConnectionState}</div>
            <div><strong>Icegathering state:</strong> {target.iceGatheringState}</div>
            <div><strong>Signaling state:</strong> {target.signalingState}</div>
        </div>
    }
    render() {
    return <Card size='small' title={this.props.title} style={{width:300, marginRight: 5}}>
            {this.state.statusContent}
            <video autoPlay style={{height: 50, width: 50}} ref={this.props.videoTag} />
        </Card>
    }
}