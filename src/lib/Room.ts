import * as rx from "rxjs/Rx"

import {JanusResponse} from "./janus/JanusResponse";
import {JanusClient} from "./janus/JanusClient";
import { WebSocketAdapter } from "./janus/WebSocketAdapter";
import { never } from "rxjs";

export class Room {
    
    public roomId : number | null= null;
    private readonly webSocket = new WebSocketAdapter(this.url, 'janus-protocol');
    private connection: JanusClient;
    
    constructor(private readonly url: string) {
        this.connection = new JanusClient (this.webSocket);
    }

    public create = () => rx.Observable.of (this.connection)
        // .do (client => this.connection = client)
        .flatMap (client => client.connect ())
        .do (() =>
            this.connection.send ({
                body: {
                    request: 'create',
                    publishers: 3
                }
            })
        )
        .flatMap(() => this.connection.publisher
        .flatMap(this.onMessage))

    public close = () => {
        return rx.Observable.of({})
            .do(() => {
                this.connection.send ({
                    body: {
                        request: 'destroy',
                        publishers: 6,
                        room: this.roomId
                    }
                })
            })
    }
    
    private onMessage = (response: JanusResponse) => 
        rx.Observable.of(response)
        .flatMap (message => {
            if (message.janus == 'success'){
                if (this.roomId == null) {
                    return this.onRoomCreated(message)
                }
                if (message.plugindata.data.videoroom == 'destroyed') {
                    console.log(`room ${this.roomId} destrioyed!!!`);
                    this.webSocket.close();
                }
                return never();
            }
            return never();
        })
    
    private onRoomCreated = (message : JanusResponse) => rx.Observable.of(message)
        .map (message => {
            return message.plugindata.data.room
        })
        .do(roomId => this.roomId = roomId)
        .do(() => console.log(this.roomId))
}