import { ServerLib } from "./api";
import { Room } from "./Room";
import { WebSocketAdapter } from "./WebSocketAdapter";
import { of, never } from "rxjs";
import { JanusHandler } from "./JanusHandler";
import { flatMap, tap } from "rxjs/operators";

export default class SFU implements ServerLib.SFU {

    participants: Array<ServerLib.Participant> = [];

    private readonly webSocket = new WebSocketAdapter(this.url, 'janus-protocol');

    constructor(private readonly url:string) {
        this.webSocket.connect().subscribe();
    }


    public createConversation = (options: ServerLib.conversationOptions) => {
        return of(new JanusHandler(this.webSocket))
            .pipe(
                flatMap(janusHandler => {
                    return janusHandler.create()
                            .pipe(
                                tap(() => 
                                    janusHandler.send ({
                                        body: {
                                            request: 'create',
                                            publishers: 4
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
                                                            sdp : options.sdp
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