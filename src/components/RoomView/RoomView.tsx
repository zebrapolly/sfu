import { Subject } from 'rxjs';
import React, { Component } from 'react';
import { Button, Collapse, Select, message } from 'antd';
import { ParticipantView } from '../Participant/Participant';
import {Room} from '../../lib/Room';

const Option = Select.Option;
const Panel = Collapse.Panel;

const initState: State = {
    key: 0,
    participants: [],
    buttonEnabled: false,
    activePanels: [],
    devices: [],
}
  
interface State {
    participants: Array<{key: number, component: any}>
    devices: any[]
    key: number
    buttonEnabled: boolean
    selectedDeviceId?: string
    activePanels: Array<string>
}
interface Props {
    publisher: Subject<number>
}

export class RoomView extends Component<Props, State> {
    private room: Room;
    private roomId: number | null = null;
    state = initState;

    constructor(props: Props) {
        super(props);
        this.room = new Room('ws://localhost:8090/');
        this.room.create()
            .do(roomId => this.roomId = roomId)
            .do(() => this.setState({buttonEnabled: true}))
            .subscribe(props.publisher);

        this.getDevices()
    }
    
    private unMountParticipant = (id: number) => {
        const participants = this.state.participants.filter(participant => participant.key != id)
        this.setState({
            ...this.state,
            participants
        })
    }
    createParticipant = () => {
        if (!this.state.selectedDeviceId) {
            message.info('Chose device!!');
        }
        if (this.roomId && this.state.selectedDeviceId) {
            const key = this.state.key + 1
            const activePanels = this.state.activePanels;
            activePanels.push(key + '')
            this.setState({
                key,
                activePanels,
                participants: [
                    ...this.state.participants,
                    {
                        key,
                        component: <Panel key={key + ''} header={`Participant ${key}`}><ParticipantView deviceId={this.state.selectedDeviceId} unmount={this.unMountParticipant} id={key} roomId={this.roomId}/></Panel>
                    }
                ]
            });
        }
        else {
        }
    }
    private getDevices = () => {
        navigator.mediaDevices.enumerateDevices()
        .then((mediaDevices) => {
        console.log('devices', mediaDevices);
        let devices: any[] = [];
        mediaDevices.forEach((device) => {
            if (device.kind === 'videoinput') {
                if (device.label.indexOf('FaceTime HD Camera') !== -1) {
                    this.setState({
                        ...this.state,
                        selectedDeviceId: device.deviceId
                    })
                }
                devices.push(<Option key={device.deviceId} value={device.deviceId}>{device.label}</Option>)
            }})
            this.setState({
                ...this.state,
                devices
            })
        })
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
    private selecteChangeHandle = (selectedDeviceId: string) => {
        this.setState({
            ...this.state,
            selectedDeviceId
        })
    }
    render() {
        return <div>
            {this.state.buttonEnabled && 
            <div>
                <Button size='small' style={{marginLeft: 5}} onClick={this.createParticipant}>Create Participant</Button>
                <Select size='small' onChange={this.selecteChangeHandle} defaultValue={this.state.selectedDeviceId} style={{ width: '320px', marginLeft: '5px' }}>
                    {this.state.devices.map(device => device)}
                </Select>
            </div>}
                
            <Collapse onChange={this.onChangeActivePanel} activeKey={this.state.activePanels} style={{marginTop: 10}} className="room-container">
                {this.state.participants.map(participant => participant.component)}
            </Collapse>
        </div>
    }
}