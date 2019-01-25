import { Observable } from "rxjs";

export namespace SFU {
    export interface Room {
        id: number
        roomObservable: Observable<{}> //?

        create: (id?: number) => Observable<{}>
        destroy: (id: number) => Observable<{}>
        edit: () => Observable<{}>
        getInfo: (id: number) => Observable<{}>
        kick: () => Observable<{}>
        listParticipants: (id: number) => {}
        list: () => Observable<Array<JanusTransport.JanusResponse.RoomProps>>
    }
    export interface Participant {
        subscribersObservable: Observable<{
            publisher: string
            peerConnection: RTCPeerConnection
        }>
        publisherObservable: Observable<string>

        join: (roomId: number, display: string) => Observable<{}>
        leave: () => Observable<{}>
        toggleVideo: () => Observable<{}>
        toggleAudio: () => Observable<{}>
        publish: () => Observable<{}>
        unpublish: () => Observable<{}>
    }
}

export namespace Janus {
    export interface Publisher {
        webRTCObservable: Observable<RTCPeerConnection>
        stateObservable: Observable<string>

        publish: () => {}
        unpublish: () => {}
        configure: () => {}
    }
    export interface Subscriber {
        publisher: string
        stateObservable: Observable<string>
        webRTCObservable: Observable<RTCPeerConnection>
    }
}

export namespace JanusTransport {
    export interface handler {
        connect: () => {}
        send: () => void
    }
    export interface JanusRequest {

    }

    export namespace JanusResponse {
        export interface RoomProps {
            room: number
            description?: string
            pinRequired: boolean
            maxPublishers: number
            bitrate: string
            bitrateCap: boolean
            firFreq: string
            audiocodec: string
            videocodec: string
            record: boolean
            recordDir: string
            numParticipants: number
        }
    }
}

