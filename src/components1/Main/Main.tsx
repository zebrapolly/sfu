

import React, { Component } from "react";
import { Input } from "antd";
import { Participant } from "../Participant/Participant";

const Search = Input.Search;

interface State {
    participantInc: number

    participants: Array<{
        key: string
        component: React.ReactNode
    }>
}

export class Main extends Component<{}, State> {

    state = {
        participantInc: 0,
        participants: new Array()
    }
    private createParticipant = (name: string) => {
        console.log('creating participant');

        const participantInc = this.state.participantInc + 1;
        let participantName = 'Participant' + participantInc;
        if (name) {
            participantName = name;
        }
        const component = <Participant key={participantInc} name={participantName}></Participant>

        const participants = this.state.participants;
        participants.push({
            participantInc,
            component
        });
        this.setState({
            ...this.state,
            participantInc,
            participants
        });
    }

    render() {
        return <div>
            <Search 
                size='small' 
                style={{marginLeft: 5, width: 350}} 
                onSearch={this.createParticipant}
                placeholder="input name"
                enterButton="Create participant"
            />
            <div>
                {this.state.participants.map(participant => participant.component)}
            </div>
        </div>

    }
}