import React, { Component } from 'react';
import { Tabs, Button } from 'antd';
import './App.css';

import {RoomView} from './components/RoomView/RoomView'
import { Subject } from 'rxjs';

const TabPane = Tabs.TabPane;

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

  constructor() {

    super({}, initState);

    this.state = initState;
  }
  
  add = () => {
    const panes = this.state.panes;
    const key = this.state.key + 1;
    const publisher: Subject<number> = new Subject();
    const content = <RoomView publisher={publisher}></RoomView>
    publisher
      .do((X) => console.log('X:', X))
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

    panes.push({ title: 'createing...', content, key: key + ''});
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

  onChange = (activeKey: string) => {
    this.setState({ activeKey: activeKey + '' });
  }

  render() {
    return (
      <div>
        <Button style={{margin: '5px' }} onClick={this.add}>Create Room</Button>
        <Tabs
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
