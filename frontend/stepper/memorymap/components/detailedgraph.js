import React from 'react';
import classnames from 'classnames';
import Immutable from 'immutable';
import * as C from 'persistent-c';
import { Dimensions, PointerType, ValueType, mapMemory } from '../helpers';
import Line from './line';
import Block from './block';

import './../../../style.scss';

class DetailedGraph extends React.PureComponent {
  render() {
    const { context, startAddress, maxAddress } = this.props;
    const { memory, lastAddress } = mapMemory(context, startAddress, maxAddress);

    let offset = 20;
    const height = lastAddress * Dimensions.HEIGHT + 100;

    const heapStart = context.core.heapStart;

    return (
      <div style={{background: `rgb(240, 240, 240)`, width: `100%`, height: height}}>
        <svg width="100%" height="100%" aria-labelledby="title desc">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" fill="black" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker>
          </defs>
          {
            Object.keys(memory.blocks).map((key, index) => {
              const content = memory.blocks[key];
              const y = (content.address - heapStart) * Dimensions.HEIGHT;

              return (
                <svg y={y} key={index}>
                  <Block key={index} variable={content} memory={memory} />
                </svg>
              )
            })
          }
          {
            Object.keys(memory.values).map((key, index) => {
              const value = memory.values[key];

              if (value.constructor.name == PointerType.name) {
                if (memory.fields[value.target] && memory.fields[value.source]) {
                  return (<Line key={key} fromAddress={value.source} toAddress={value.target} startAddress={heapStart} />)
                }
              }
            })
          }
        </svg>
			</div>
    )
  }
}


export default DetailedGraph;
