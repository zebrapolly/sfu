import { ServerLib } from "./api";
import { Observable, of, empty, never, throwError, Subject } from "rxjs";
import { WebSocketAdapter } from "./WebSocketAdapter";
import { Publisher } from "./Publisher";
import { tap, flatMap, map } from "rxjs/operators";


export class Participant implements ServerLib.Participant {

    publisher?: Publisher;
    subscriptions = [];

    constructor(private dialogId: string, private webSocket: WebSocketAdapter, private roomId?: number) {

    }
    init = () => {
        return of().pipe(map(() => {}));
    }
    configure = (sdp: string) => {
        if (this.publisher && this.roomId) {
            return 
        }
        return throwError('publisher doesn\'t init');
    }

    leaveRoom = (roomId: number) => {
        return empty()
    }

    joinRoom = (offer: RTCSessionDescriptionInit) => {
        return this.createPublisher()
            .pipe(
                flatMap(() => {
                    if (this.roomId) {
                        return this.publisher!.joinRoom(this.roomId);
                    } else {
                        return throwError('need roomId');
                    }
                }),
                flatMap(() => this.publisher!.configure({
                    audio: false,
                    video: true,
                    sdp: offer.sdp
                })),
                tap((sdp) => console.log('sdp', sdp))
            )
    }

    private createPublisher = () => {
        return of(new Publisher(this.webSocket, this.dialogId))
            .pipe(
                tap(publisher => this.publisher = publisher),
                flatMap(publisher => publisher.init())
            )
    }
}