import { Observable, Subject } from "rxjs";

export namespace ServerLib {
    export interface SFU {
        createConversation: (options: conversationOptions) => Observable<RTCSessionDescriptionInit>
        // createParticipant: (id: number) => Observable<void>
    }
    export interface conversationOptions {
        offer: RTCSessionDescriptionInit
        roomId?: number
        dialogId: string
        audio: boolean
        video: boolean
    }
    export interface Room {
        id: number | null
    }
    export interface Participant {
        // dialogId: string
        // observer: Subject<any>
        publisher?: Publisher
        subscriptions: Array<Subscriber>
        init: () => Observable<void>
        joinRoom: (sdp: RTCSessionDescriptionInit) => Observable<RTCSessionDescriptionInit>
        leaveRoom: (roomId: number) => Observable<void>
    }
    export interface Publisher {
        observer: Subject<any>
        init: () => Observable<void>
        joinRoom: (roomId: number) => Observable<void>
        // publish: () => Observable<void>
        // unpublish: () => Observable<void>
        // configure: (config: any) => Observable<void>
    }
    export interface Subscriber {

    }
}