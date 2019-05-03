import React from 'react';
import {Button, ButtonGroup} from '@blueprintjs/core';
import * as C from 'persistent-c';
import { Properties } from '../helpers.js';
import Graph from './graph';

import './../../../style.scss';

class DetailedGraph extends React.PureComponent {

  render() {
    const { context, scale, onZoom } = this.props;
    const { heap, stack, data } = context.memoryGraph;
    console.log(context.memoryGraph);

    const stackHeight = stack.height * Properties.FRAMES.HEIGHT
                      + stack.frames.length * Properties.FRAMES.OFFSETY + 100;
    const heapHeight  = heap.bytesAllocated * Properties.BLOCKS.HEIGHT * scale + 100;
    const height = Math.max(stackHeight, heapHeight);
    // Should check against stack and data also, get the maximum height

    return (
      <div style={{background: `rgb(240, 240, 240)`, width: `100%`, height: height}}>
        <div>
            <ButtonGroup>
              <Button small icon='zoom-out' onClick={() => this.props.onZoom(scale - 1)} />
              <Button small icon='zoom-in' onClick={() => this.props.onZoom(scale + 1)}/>
              <Button small icon='zoom-to-fit' onClick={() => this.props.onZoom(1)}/>
            </ButtonGroup>
        </div>
        <Graph context={context} scale={scale} height={height} />
      </div>
    )
  }
}

export default DetailedGraph;
