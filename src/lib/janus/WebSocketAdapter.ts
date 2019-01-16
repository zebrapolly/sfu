import * as rx from "rxjs/Rx"
import { JanusResponse } from "./JanusResponse";
import {v4} from 'uuid';
export class WebSocketAdapter {
    private ws? : WebSocket;

    private sessionId: number | null = null;
    private seq = 0;

    // private get transactionId() {
    //     this.seq +=1
    //     return new Date().getTime() + this.seq + "";
    // }

    private readonly observable = new rx.Subject<JanusResponse> ();

    private preparedConnection = new rx.Subject();

    public observer = this.observable
        .finally (()=> this.ws!.close)
        .share();


    constructor (private readonly url : string, private readonly protocol : string) {
    }

    public connect = () => {
        if (this.ws == null) {
            this.doConnect ()
                .do(() => this.send({
                    janus: 'create',
                    transaction: v4()
                }))
                .subscribe();
            return this.preparedConnection;
        }
        else {
            return rx.Observable.of ({})
        }
    }

    private doConnect = () => this.connectWebSocket ()
        .do (ws => this.ws = ws)
        .do (this.listen)
        .map (()=> rx.Observable.empty ())

    private listen = (ws : WebSocket) => this.listenOnMessage (ws)
        .map (data => JSON.parse(data.data))
        .flatMap(message => {
            if (message.janus == 'success') {
                if (this.sessionId == null) {
                    this.sessionId = message.data.id;
                    this.preparedConnection.next();
                    this.preparedConnection.complete();
                    return rx.Observable.never();
                }
            }
            return rx.Observable.of(message);
        })
        .takeUntil (this.waitForClose (this.ws!))
        .subscribe (this.observable)

    public send = (data : any) => {
        const message = {
            // transaction : this.transactionId,
            session_id : this.sessionId,
            ...data
        }
        this.ws!.send (JSON.stringify (message))
    }
    public close = () => {
        this.ws!.close();
    }
    private connectWebSocket = () => this.createWebSocketObservable ()
        .flatMap (ws => this.waitForOpen (ws)
            .map (()=> ws)
            .takeUntil (this.waitFoError (ws)
                .flatMap (error => rx.Observable.throwError (error))
            )
        )

    private createWebSocketObservable = () => rx.Observable.of ({})
    .map (()=> new WebSocket(this.url, this.protocol))
    
    private listenOnMessage = (ws : WebSocket) => rx.Observable.fromEventPattern<MessageEvent> (handler => ws.onmessage = message => handler (message))
    
    private waitForClose = (ws : WebSocket) => rx.Observable.fromEventPattern (handler => ws.onclose = ()=> handler ())

    private waitForOpen = (ws : WebSocket) => rx.Observable.fromEventPattern (handler => ws.onopen = ()=> handler ())

    private waitFoError = (ws : WebSocket) => rx.Observable.fromEventPattern (handler => ws.onerror = error => handler (error))
}