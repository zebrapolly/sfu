import { Observable } from "rxjs";

export namespace ClientLib {
    export interface Room {
        id: number | null
    }
    export interface SFU {
        // createConversation: (publishStream: MediaStream) => Observable<any>
        // createRoom: (name?: number) => Observable<number>
        // createParticipant: (id: number) => Observable<void>
    }
}