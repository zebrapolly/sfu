
export interface JanusResponse {
    janus: string
    sender: number
    session_id: number
    transaction: string
    data: {
        id: number
    },
    plugindata: {
        data: {
            leaving: string
            room: number
            videoroom: string
            id: number
            display: string
            publishers: Array<Participant>
            participants: Array<Participant>
            error_code: number
            configured: string
            unpublished: string
        }
    },
    jsep: RTCSessionDescriptionInit
    candidate?: RTCIceCandidateInit & {
        completed: boolean
    }
}

interface Participant {
    id: number,
    publisher: boolean
}