import { ServerLib } from "./api";
import { Room } from "./Room";
import { WebSocketAdapter } from "./WebSocketAdapter";
import { of, never, throwError } from "rxjs";
import { JanusHandler } from "./JanusHandler";
import { flatMap, tap } from "rxjs/operators";
import { Participant } from "./Participant";

export default class SFU implements ServerLib.SFU {

    participants: Map<string, ServerLib.Participant> = new Map();

    private readonly webSocket = new WebSocketAdapter(this.url, 'janus-protocol');

    constructor(private readonly url:string) {
        this.webSocket.connect().subscribe();
    }
    public getEventBus = (id: number) => {

    }
    public joinRoom = (options: ServerLib.conversationOptions) => {
        const participant = new Participant(options.dialogId, this.webSocket, options.roomId);
        this.participants.set(options.roomId+options.dialogId, participant)
        return participant.joinRoom(options.offer)
    }
    public getParticipantObserver = (roomId: number, dialogId: string) => {
        const participant = this.participants.get(roomId+dialogId);
        if (participant && participant.publisher) {
            return of(participant.publisher.observer);
        } else {
            return throwError('participant not found');
        }
    }
    public joinRoom1 = (options: ServerLib.conversationOptions) => {
        return of(new JanusHandler(this.webSocket))
            .pipe(
                flatMap(janusHandler => janusHandler.init().mapTo(janusHandler)),
                tap(janusHandler => janusHandler.send({
                    body: {
                        request: 'join',
                        ptype: 'publisher',
                        room: 1234
                    }
                })),
                flatMap(janusHandler => janusHandler.responseObserver
                .pipe(
                    tap(response => console.log('response:', response)),
                    flatMap(response => {
                        if (response.janus == 'event') {
                            if (response.plugindata.data.videoroom == 'joined') {
                                janusHandler.send({
                                    body : {
                                        request: "configure",
                                        video: true,
                                        // audio: false,
                                        display: 'participant'
                                    },
                                    jsep : {
                                        type : "offer",
                                        sdp : options.offer.sdp
                                    }
                                })
                            } else if ((response.plugindata.data.configured == 'ok') && (response.jsep) && (response.jsep.sdp)) {
                                return of(response.jsep);
                            }
                        } 
                        return never();
                    })
                   
                )
            ),
            )
    }
    public createConversation = (options: ServerLib.conversationOptions) => {
        return of(new JanusHandler(this.webSocket))
            .pipe(
                flatMap(janusHandler => {
                    return janusHandler.init()
                            .pipe(
                                tap(() => 
                                    janusHandler.send ({
                                        body: {
                                            request: 'create',
                                            publishers: 4,
                                            id: 1234
                                        }
                                    })),
                                flatMap(() => janusHandler.responseObserver
                                    .pipe(
                                        tap(response => console.log('response:', response)),
                                        flatMap(response => {
                                            if (response.janus === 'success') {
                                                if (response.plugindata.data.room) {
                                                    console.log(`Room ${response.plugindata.data.room} created`)

                                                    janusHandler.send({
                                                        body: {
                                                            request: 'join',
                                                            ptype: 'publisher',
                                                            room: response.plugindata.data.room
                                                        }
                                                    })
                                                } 
                                            } else if (response.janus == 'event') {
                                                if (response.plugindata.data.videoroom == 'joined') {
                                                    janusHandler.send({
                                                        body : {
                                                            request: "configure",
                                                            video: true,
                                                            audio: false,
                                                            display: 'participant'
                                                        },
                                                        jsep : {
                                                            type : "offer",
                                                            sdp : options.offer.sdp
                                                        }
                                                    })
                                                } else if ((response.plugindata.data.configured == 'ok') && (response.jsep) && (response.jsep.sdp)) {
                                                    return of(response.jsep);
                                                }
                                            } 
                                            return never();
                                        })
                                       
                                    )
                                ),
                            )
                })                
            )
        // return of('answer');
    }
    // public createParticipant = (id: number) => {

    // }
}