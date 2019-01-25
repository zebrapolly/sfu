import * as rx from "rxjs/Rx"

export namespace sfu_client {

    export interface Participant {
        videoObservable : rx.Observable<MediaStreamTrack>
        audioObservable :  rx.Observable<MediaStreamTrack>
        finishedObservable : rx.Observable<void>
        hangup () : void
    }

    export interface Room {
        hangup : () => void,
        addParticipant : (id : string) => rx.Observable<Participant>
        participantObservable : rx.Observable<Participant>
    }

    export interface SFU {
        createRoom () : Room,
        joinRoom : (id : string) => Room
    }
}

export namespace sfu_server {
    export interface Participant {
        id : string,
    
        hangup : () => void
        publish : (offer : string) => rx.Observable<string>,
        otherParticipantsofferObservable : rx.Observable<{id : string, sdp : string}>
        sendAnswerToOtherParticipant : (id : string, answer : string) => void
    }
    
    export interface Room {
        hangup : () => void
        participanObservable : rx.Observable<Participant>
        addParticipant : (id : string) => rx.Observable<Participant>
    }
    
    export interface SFU {
        createRoom () : rx.Observable<Room>
    }
}
