import { WebSocketAdapter } from "./WebSocketAdapter";
import { JanusHandler } from "./JanusHandler";
import { of, never, Subject } from "rxjs";
import { map, flatMap, tap } from "rxjs/operators";
import { ServerLib } from "./api";

export class Publisher implements ServerLib.Publisher {

    private janusHandler = new JanusHandler(this.webSocket);
    private roomJoined = new Subject<void>();
    public published = new Subject<RTCSessionDescriptionInit>();
    public observer = new Subject<any>();
    constructor(private webSocket: WebSocketAdapter, private displayName: string) {
        this.observer
            .pipe(
                tap(ice => {
                    if (ice.type == 'icecandidate') {
                        this.janusHandler.send({
                                janus : 'trickle',
                                candidate : ice.candidate
                            })
                    }
                }),
                // tap(ice => )
            )
            .subscribe();
        this.janusHandler.responseObserver
            .pipe(
                flatMap(response => {
                    if (response.janus == 'event') {
                        if (response.plugindata.data.videoroom == 'joined') {
                            this.roomJoined.next();
                            this.roomJoined.complete();
                        } else if (response.plugindata.data.configured == 'ok') {
                            this.published.next(response.jsep);
                        }
                    } else if (response.janus == 'trickle') {
                        if (response.candidate && !response.candidate.completed) {
                            this.observer.next(response.candidate)
                        }
                    }
                    return never();
                })
            )
            .subscribe();
    }
    public init = () => this.janusHandler.init();

    public joinRoom = (roomId: number) => 
        of({})
            .pipe(
                tap(() => this.janusHandler.send({
                    body: {
                        request: 'join',
                        ptype: 'publisher',
                        room: roomId
                    }
                })),
                flatMap(() => this.roomJoined)
            )

    public configure = (options: {
        audio: boolean,
        video: boolean,
        sdp?: string
    }) => 
        of({})
            .pipe(
                tap(() => this.janusHandler.send({
                    body : {
                        request: "configure",
                        // audio: options.audio,
                        video: options.video,
                        display: 'participant ' + this.displayName 
                    },
                    jsep : {
                        type : "offer",
                        sdp : options.sdp
                    }
                })),
                flatMap(() => this.published.take(1))
            )
}