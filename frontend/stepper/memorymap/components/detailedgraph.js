import React from 'react';
import Slider from 'rc-slider';
import {Button, ButtonGroup} from '@blueprintjs/core';
import classnames from 'classnames';
import Immutable from 'immutable';
import * as C from 'persistent-c';
import { Dimensions, mapMemory, getType, getValueOf } from '../helpers';
import { PointerType, ValueType } from '../memorycontent';
import Line from './line';
import Field from './block';
import StackFrame from './stackframe';
import Graph from './graph';
import './../../../style.scss';

class DetailedGraph extends React.PureComponent {

  render() {
    const { context, scale, onZoom } = this.props;
    const { heap, stack } = context.memoryGraph;
    console.log(context.memoryGraph);
    const height = heap.bytesAllocated * Dimensions.HEIGHT * scale + 100;


    return (
      <div style={{background: `rgb(240, 240, 240)`, width: `100%`, height: height}}>
        <div>
            <ButtonGroup>
              <Button small icon='zoom-out' onClick={() => this.props.onZoom(scale - 1)} />
              <Button small icon='zoom-in' onClick={() => this.props.onZoom(scale + 1)}/>
              <Button small icon='zoom-to-fit' onClick={() => this.props.onZoom(1)}/>
            </ButtonGroup>
        </div>
        <Graph heap={heap} stack={stack} scale={scale} height={height} heapStart={context.core.heapStart} />
      </div>
    )
  }
}

export default DetailedGraph;
