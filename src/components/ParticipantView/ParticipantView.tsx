import {from} from 'rxjs';
import { tap, map } from 'rxjs/operators';
import React, { Component } from 'react';
import {Participant} from '../../lib/Participant';
interface Props {
    id: number
    roomId: number
}

interface State {
    subscriptions: Array<any>
}

export class ParticipantView extends Component<Props, State>{

    private localVideoStream?: MediaStream;
    private participant?: Participant

    state = {
        subscriptions: []
    }

    componentWillUnmount = () => {
        if (this.localVideoStream) {
            this.localVideoStream.stop()
        }
    }
    videoTag:React.RefObject<HTMLVideoElement>;

    constructor(props: Props) {
        super(props);
        this.setLocalVideo().subscribe();
        this.videoTag = React.createRef();
        this.participant = new Participant('ws://localhost:8090/', this.props.id);
        this.participant.create(this.props.roomId).subscribe();
        this.participant.subscribersPublisher
            .map((webRtc) => {
                console.log('webRtc', webRtc)
                let videoTag:React.RefObject<HTMLVideoElement> = React.createRef();
                webRtc.pc.ontrack = (event: RTCTrackEvent) => {
                    console.log('ontrack', event)
                    let stream = new MediaStream();
                    stream.addTrack(event.track);
                    if (videoTag.current) {
                        videoTag.current.srcObject = stream;
                    }
                }
                this.setState({
                    subscriptions: [
                        ...this.state.subscriptions,
                        <video autoPlay style={{height: 200, width: 200}} ref={videoTag} />
                    ]
                })
            })
            .subscribe();
    }
    public setLocalVideo = () => 
    this.getVideoStream ()
        .pipe(
            map((stream: MediaStream) => {
                if (this.videoTag.current) {
                    this.videoTag.current.srcObject = stream
                }
            })
        );

private getVideoStream = () =>
    from(navigator.mediaDevices.getUserMedia({audio: false, video: true}))
        .pipe(
            tap((stream:MediaStream) => this.localVideoStream = stream),
            tap((stream:MediaStream) => stream.stop = () => stream.getTracks().forEach(track => track.stop()))
        )

    render() {
        return <div>
            <video autoPlay style={{height: 200, width: 200}} ref={this.videoTag}></video>
            <div className="subscriptions-container">
                {this.state.subscriptions.map(subscription => subscription)}
            </div>
        </div>
    }
}