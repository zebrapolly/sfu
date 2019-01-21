import { WebSocketAdapter } from "./janus/WebSocketAdapter";
import { Publisher } from "./Publisher";

export class Participant {
    private publisher: Publisher | null = null;

    private readonly webSocket = new WebSocketAdapter(this.url, 'janus-protocol');

    constructor(
        private readonly url: string,
        private id: number,
        private deviceId: string
        ) {

        }
    public createPublisher = () => {
        // this.publisher = new Publisher(this.webSocket, this.id, this.deviceId, );
    }
}