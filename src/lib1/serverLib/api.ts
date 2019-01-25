import { Observable } from "rxjs";

export namespace ServerLib {
    export interface SFU {
        // createParticipant: (id: number) => Observable<void>
    }
    export interface Room {
        id: number | null
    }
    export interface Participant {
        dialogId: string
        publisher: Pubsilher
        subscriptions: Array<Subscriber>

        createRoom: (roomId?: number) => Observable<Room>
        joinRoom: () => Observable<void>
        leaveRoom: (roomId: number) => Observable<void>
    }
    export interface Pubsilher {
        publish: () => Observable<void>
        unpublish: () => Observable<void>
        configure: (config: any) => Observable<void>
    }
    export interface Subscriber {

    }
}