import {from, Subject} from 'rxjs';
import React, { Component } from 'react';
import { Button, Collapse } from 'antd';
import { ParticipantView } from '../ParticipantView/ParticipantView';
import {Room} from '../../lib/Room';

const Panel = Collapse.Panel;

const initState: State = {
    key: 0,
    children: [],
    buttonEnabled: false
}
  
interface State {
    children: Array<any>
    key: number
    buttonEnabled: boolean
}
interface Props {
    publisher: Subject<number>
}

export class RoomView extends Component<Props, State> {
    private room: Room;
    private roomId: number | null = null;

    constructor(props: Props) {
        super(props);
        console.log('constructor')
        this.room = new Room('ws://localhost:8090/');
        this.room.create()
            .do(roomId => this.roomId = roomId)
            .do(() => this.setState({buttonEnabled: true}))
            .subscribe(props.publisher);
    }
    state = initState;
      
    createParticipant = () => {
        if (this.roomId) {
            const key = this.state.key + 1
            console.log(key)
            this.setState({
                key,
                children: [
                    ...this.state.children,
                    <Panel key={key + ''} header={`Participant ${key}`}><ParticipantView  id={key} roomId={this.roomId}/></Panel>
                ]
            });
        }
        else {
            console.log('room doesn\'t create');
        }
    }
        
    componentWillUnmount = () => {
        this.room.close().subscribe();
    }
    render() {
        return <div>
            {this.state.buttonEnabled && <Button style={{marginLeft: '5px'}} onClick={this.createParticipant}>Create Participant</Button>}
            <Collapse style={{marginTop: '10px'}} className="room-container">
                {this.state.children.map(child => child)}
            </Collapse>
        </div>
    }
}