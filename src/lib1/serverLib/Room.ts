import { ServerLib } from "./api";
import { WebSocketAdapter } from "./WebSocketAdapter";
import { JanusHandler } from "./JanusHandler";
import { of, never, throwError } from "rxjs";
import { JanusResponse } from "./JanusResponse";

export class Room implements ServerLib.Room {
    public id: number | null = null;
    private connection: JanusHandler;
    constructor(private readonly webSocket: WebSocketAdapter) {
        this.connection = new JanusHandler (this.webSocket);
    }

    public create = (id?: number) => of (this.connection)
        // .do (client => this.connection = client)
        .flatMap (client => client.connect ())
        .do (() =>
            this.connection.send ({
                body: {
                    request: 'create',
                    room: id,
                    publishers: 4
                }
            })
        )
        .flatMap(() => this.connection.publisher
            .flatMap(this.onMessage)
        )

    private onMessage = (response: JanusResponse) => 
        of(response)
        .flatMap (message => {
            if (message.janus == 'success'){
                if (this.id == null && !message.plugindata.data.error_code) {
                    return this.onRoomCreated(message)
                    
                } else if (message.plugindata.data.videoroom == 'destroyed') {
                    console.log(`room ${this.id} destrioyed!!!`);
                    this.webSocket.close();

                }  else if (message.plugindata.data.error_code) {
                    console.log('error', message.plugindata.data.error_code, message.plugindata.data.error)
                    return throwError(message.plugindata.data.error)
                }
                
                return never();
            }
            return never();
        })
    
    private onRoomCreated = (message : JanusResponse) => of(message)
        .map (message => {
            return message.plugindata.data.room
        })
        .do(id => this.id = id)
        .do(() => console.log(this.id))
}