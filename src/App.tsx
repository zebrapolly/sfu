import React, { Component, Props } from 'react';
import { Tabs, Button, Input } from 'antd';
import './App.css';

import {RoomView} from './components/RoomView/RoomView'
import { Subject } from 'rxjs';

const TabPane = Tabs.TabPane;
const Search = Input.Search;

const initState: State = {
  key: 0,
  activeKey: undefined,
  panes: []
}
interface Pane {
  key: string
  title: string
  content: any
}
interface State {
  panes: Array<Pane>
  key: number
  activeKey?: string
}
class App extends Component <any, State>{
  state = initState;
  
  add = () => {
    const panes = this.state.panes;
    const key = this.state.key + 1;
    const publisher: Subject<number> = new Subject();

    const content = <RoomView roomType='created' publisher={publisher}></RoomView>
    // roomStarter.complete();

    publisher
      .do(roomId => {
        const panes = this.state.panes;
        panes.forEach(elem => {
          if (elem.key == key + '') {
            elem.title = roomId + '';
          }
        });
        this.setState({ panes });
      })
      .subscribe();

    panes.push({ title: 'creating...', content, key: key + ''});
    this.setState({ panes, activeKey: key + '', key});
  
  }

  private joinRoom = (roomId: string) => {
    const panes = this.state.panes;
    const key = this.state.key + 1;
    const content = <RoomView roomType='joined' roomId={+roomId}></RoomView>

    panes.push({ title: roomId, content, key: key + ''});
    this.setState({ panes, activeKey: key + '', key});
  }

  onEdit = (targetKey: string | React.MouseEvent<HTMLElement, MouseEvent>, action: any) => {
    if (action == 'remove') {
      let activeKey = this.state.activeKey;
      let lastIndex = 0;
      this.state.panes.forEach((pane, i) => {
        if (pane.key === targetKey) {
          lastIndex = i - 1;
        }
      });
      const panes = this.state.panes.filter(pane => pane.key !== targetKey);
      if (lastIndex >= 0 && activeKey === targetKey) {
        activeKey = panes[lastIndex].key;
      }
      this.setState({ panes, activeKey });
    }
  }

  private onChange = (activeKey: string) => {
    this.setState({ activeKey: activeKey + '' });
  }

  render() {
    return (
      <div>
        <Button size='small' style={{margin: '5px' }} onClick={this.add}>Create Room</Button>
        <Search size='small' style={{margin: '5px', width: 200 }} enterButton="Join" placeholder="input room id" onSearch={this.joinRoom}/>
        <Tabs
          hideAdd={true}
          type="editable-card"
          onChange={this.onChange}
          activeKey={this.state.activeKey}
          onEdit={this.onEdit}>
          {this.state.panes.map(pane => <TabPane tab={pane.title} key={pane.key}>{pane.content}</TabPane>)}
        </Tabs>
      </div>
    );
  }
}

export default App;
