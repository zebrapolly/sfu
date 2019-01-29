import * as rx from "rxjs/Rx"

import {WebSocketAdapter} from './WebSocketAdapter';
import { JanusResponse } from "./JanusResponse";
import { Subject } from "rxjs/Rx";
import { v4 } from "uuid";

export class JanusHandler {

    private handleId: number | null = null;
    
    public responseObserver: rx.Subject<JanusResponse>  = new Subject();

    private readonly ready: rx.Subject<void>= new rx.Subject();
    private transactions = new Map();
    constructor(private readonly webSocket: WebSocketAdapter) {
        
        webSocket.observer
            .flatMap((message: JanusResponse) => {
                if (message.transaction) {
                    if (!this.transactions.has(message.transaction)) {
                        return rx.Observable.never();
                    }
                }
                if (message.sender) {
                    if (message.sender != this.handleId) {
                        return rx.Observable.never();
                    }
                }
                if (message.janus == 'success') {
                    if (this.handleId == null) {
                        this.handleId = message.data.id;
                        this.ready.next();
                        this.ready.complete();
                        return rx.Observable.never()
                    }
                }
                return rx.Observable.of(message);
            })
        .subscribe(this.responseObserver);
    }

    init = () => rx.Observable.of({})
        .do(() => {
            const transaction = v4();
            this.transactions.set(transaction, true);
            this.webSocket.send({
                janus : "attach",
                transaction,
                plugin : "janus.plugin.videoroom"
            })
        })
        .flatMap(() => this.ready)

    send = (message: any) => {
        const transaction = v4();
        const subject = new rx.Subject<void>()
        this.transactions.set(transaction, subject);
        let janus = "message";
        if (message.janus) {
            janus = message.janus;
        }
        this.webSocket.send({
            janus,
            handle_id: this.handleId,
            transaction,
            ...message
        })
        return subject;
    }
}