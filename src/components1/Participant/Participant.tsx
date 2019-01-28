import React, { Component } from "react";
import {Button, Input, Card, message, Select} from 'antd';
import SFU from "../../lib1/clientLib/SFU";
import { Room } from "../../lib1/clientLib/Room";
import { of, from } from "rxjs";
import { tap, flatMap } from "rxjs/operators";
import { Meta } from "antd/lib/list/Item";


const ButtonGroup = Button.Group;
const Search = Input.Search;
const Option = Select.Option;


interface Props {
    name: string
}

interface State {
    selectedDeviceId?: string
    devices: string[]

}

export class Participant extends Component<Props, State>{

    state:State = {
        devices: []
    }
    constructor(props: Props) {
        super(props);
        this.getDevices().subscribe();
    }
    private selecteChangeHandle = (selectedDeviceId: string) => {
        this.setState({
            ...this.state,
            selectedDeviceId
        })
    }
    
    private getDevices = () => 
        from(navigator.mediaDevices.enumerateDevices())
            .pipe(
                tap((mediaDevices) => {
                    let devices: any[] = [];
                    mediaDevices.forEach((device) => {
                        if (device.kind === 'videoinput') {
                            devices.push(<Option key={device.deviceId} value={device.deviceId}>{device.label}</Option>)
                        }
                    });
                    this.setState({
                        ...this.state,
                        devices,
                    });
                })
            )

    private getVideoStream = (deviceId: string) =>
        from(navigator.mediaDevices.getUserMedia({audio: false, video: { deviceId }}))
            .pipe(
                tap(stream => stream.stop = () => stream.getTracks().forEach(track => track.stop()))
            )
    
    private createConversation = () => {
        if (this.state.selectedDeviceId) {
            return this.getVideoStream(this.state.selectedDeviceId)
                .pipe(
                    flatMap((stream) => SFU.createConversation(stream))
                )
                .subscribe(x => console.log('from participant', x))
        } else {
            message.error('choose device');
        }
        
    }
    private joinRoom = (room: string) => {
    }
    render() {
        return <Card size='small' title={this.props.name}>
            <Select size='small' onChange={this.selecteChangeHandle} defaultValue={this.state.selectedDeviceId} style={{ width: '320px', marginLeft: '5px' }}>
                {this.state.devices.map(device => device)}
            </Select>
            <Meta description={<Button size='small' type="primary" style={{margin: 5, width: 350}} onClick={this.createConversation}>create conversation</Button>}></Meta>     
        </Card>
    }
}