import {from, Subject} from 'rxjs';
import React, { Component } from 'react';
import { Button, Collapse } from 'antd';
import { ParticipantView } from '../ParticipantView/ParticipantView';
import {Room} from '../../lib/Room';

const Panel = Collapse.Panel;

const initState: State = {
    key: 0,
    participants: [],
    buttonEnabled: false,
    activePanels: []
}
  
interface State {
    participants: Array<{key: number, component: any}>
    key: number
    buttonEnabled: boolean
    activePanels: Array<string>
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
    private unMountParticipant = (id: number) => {
        const participants = this.state.participants.filter(participant => participant.key != id)
        this.setState({
            ...this.state,
            participants
        })
        console.log('unMountParticipant', id);
        console.log('UNMOUNT!')
    }
    createParticipant = () => {
        if (this.roomId) {
            const key = this.state.key + 1
            const activePanels = this.state.activePanels;
            activePanels.push(key + '')
            console.log(key)
            this.setState({
                key,
                activePanels,
                participants: [
                    ...this.state.participants,
                    {
                        key,
                        component: <Panel key={key + ''} header={`Participant ${key}`}><ParticipantView unmount={this.unMountParticipant} id={key} roomId={this.roomId}/></Panel>
                    }
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
    private onChangeActivePanel = (activePanels: any) => {
        this.setState({
            ...this.state,
            activePanels
        })
    }
    render() {
        return <div>
            {this.state.buttonEnabled && <Button size='small' style={{marginLeft: '5px'}} onClick={this.createParticipant}>Create Participant</Button>}
            <Collapse onChange={this.onChangeActivePanel} activeKey={this.state.activePanels} style={{marginTop: '10px'}} className="room-container">
                {this.state.participants.map(child => child.component)}
            </Collapse>
        </div>
    }
}