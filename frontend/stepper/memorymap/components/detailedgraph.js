import React from 'react';
import Slider from 'rc-slider';
import {Button, ButtonGroup} from '@blueprintjs/core';
import classnames from 'classnames';
import Immutable from 'immutable';
import * as C from 'persistent-c';
import { Dimensions, PointerType, ValueType, mapMemory } from '../helpers';
import Line from './line';
import Block from './block';

import './../../../style.scss';

class DetailedGraph extends React.PureComponent {

  render() {
    const { context, startAddress, maxAddress, scale, onZoom } = this.props;
    const { heapArea } = context.memoryGraph;
    let offset = 20;
    let n = 0;
    const height = memory.endAddress * Dimensions.HEIGHT * scale + 100;

    const heapStart = context.core.heapStart;

    return (
      <div style={{background: `rgb(240, 240, 240)`, width: `100%`, height: height}}>
        <div>
            <ButtonGroup>
              <Button small icon='zoom-out' onClick={() => this.props.onZoom(scale - 1)} />
              <Button small icon='zoom-in' onClick={() => this.props.onZoom(scale + 1)}/>
              <Button small icon='zoom-to-fit' onClick={() => this.props.onZoom(1)}/>
            </ButtonGroup>
        </div>
        <svg width="100%" height="100%" aria-labelledby="title desc">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" fill="black" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker>
          </defs>
          <svg y={10}>
            <g>
            <text y={10 * scale + 5} x="10" style={{fontSize: 15 * scale + `px`}} fontWeight='bold' fill='grey'>stack</text>
            <text y={10 * scale + 5} x="200" style={{fontSize: 15 * scale + `px`}} fontWeight='bold' fill='grey'>heap</text>
            <line x1="175" x2="175" y1="0" y2="100%" stroke="grey" strokeWidth="1" style={{opacity: 0.5}}/>
            </g>
          </svg>
          <svg y="20">
            <rect y="20" width="175" height="100" stroke="blue"/>
          </svg>
          {
            Object.keys(heapArea.allocatedBlocks).map((key, index) => {
              const content = heapArea.allocatedBlocks[key];
              const y = (content.address - heapStart) * Dimensions.HEIGHT * scale - Dimensions.HEIGHT * 2;

              return (
                <svg y={y} x={Dimensions.X} key={index}>
                  <Block key={index} block={content} memory={heapArea} scale={scale} />
                </svg>
              )
            })
          }
          {
            Object.keys(heapArea.values).map((key, index) => {
              const value = heapArea.values[key];

              if (value.constructor.name == PointerType.name) {
                if (heapArea.fields[value.target] && heapArea.fields[value.source]) {
                  n += 1;
                  return (<Line key={key} index={n} fromAddress={value.source} toAddress={value.target} startAddress={heapStart} scale={scale}/>)
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
