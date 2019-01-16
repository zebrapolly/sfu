import * as rx from "rxjs/Rx"

import * as rxws from "rxjs/webSocket"

import {JanusResponse} from "./JanusResponse";

export interface JanusConnection {
    transactionId : string,
    sessionId : number,
    handlerId : number,
    listen: rx.Observable<JanusResponse>,
    send: (message: any) => rx.Observable<any>,
    sender: rx.Observer<any>
}
