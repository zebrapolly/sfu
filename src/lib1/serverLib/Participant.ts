import { ServerLib } from "./api";
import { Observable, of, empty } from "rxjs";


export class Participant implements ServerLib.Participant {

    dialogId: string;
    publisher: ServerLib.Pubsilher;
    subscriptions = [];

    constructor(dialogId: string, publisher: ServerLib.Pubsilher) {
        this.dialogId = dialogId;
        this.publisher = publisher;
    }

    createRoom = (roomId?: number) => {
        return of({
            id: roomId || 2
        })
    }

    leaveRoom = (roomId: number) => {
        return empty()
    }

    joinRoom = () => {
        return empty()
    }
}