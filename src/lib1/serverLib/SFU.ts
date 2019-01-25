import { ServerLib } from "./api";
import { Room } from "./Room";
import { WebSocketAdapter } from "./WebSocketAdapter";

export default class SFU implements ServerLib.SFU {

    participants: Array<ServerLib.Participant> = [];
    constructor(private readonly url:string) {
    }

    private readonly webSocket = new WebSocketAdapter(this.url, 'janus-protocol');

    // public createParticipant = (id: number) => {

    // }
}