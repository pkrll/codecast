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

import './../../../style.scss';

class Graph extends React.PureComponent {

  render() {
		const { heap, stack, scale, heapStart, height } = this.props;
    let refs = {}

    Object.assign(refs, this.refs);

    const frames = drawFrames(stack);
    const blocks = drawBlocks(heap, heapStart, refs, scale);
    const lines  = drawLines(heap, refs, scale);

    return (
      <svg ref='svgRef' width="100%" height="100%" aria-labelledby="title desc">
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
        <svg y="40">{frames}</svg>
        {blocks}
        <svg>{lines}</svg>
      </svg>
    )

	}
}

function drawFrames(stack) {
  const frames = stack.frames.map((frame, index) => {
    const previousSize  = (index > 0)
                        ? stack.frames[index - 1].numberOfVariables
                        : 0;

    return (<StackFrame key={index} frame={frame} previousSize={previousSize}/>)
  });

  return frames;
}

function drawBlocks(heap, heapStart, refs, scale) {
  const blocks = Object.keys(heap.allocatedBlocks);

  const elements = blocks.map((key, index) => {
    const block = heap.allocatedBlocks[key];
    const y = (block.address - heapStart) * Dimensions.HEIGHT * scale - Dimensions.HEIGHT * 2;
    let content = [];
    let previousSize = 0;
    const height = Dimensions.HEIGHT * scale;

    if (block.fields) {
      content = block.fields.map((field, i) => {
        const FieldComponent = React.forwardRef((props, ref) => (
          <Field elRef={ref} {...props}/>
        ));

        const offsetTop = previousSize;
        previousSize += field.size * height;
        const ref = React.createRef();
        refs[field.address] = ref;
        return (<FieldComponent key={i} ref={ref} field={field} offsetTop={offsetTop} values={heap.values} scale={scale} />)
      });
    } else {
      console.log("Error: Fields missing");
    }

    return (
      <svg y={y} x={Dimensions.X} key={index}>
      <g fill="white" opacity={block.free ? '0.5': '1'}>
        <text y={previousSize + 15 * scale} style={{fontSize: 12 * scale + `px`}} fontWeight='bold' fill='grey'>
          {block.type.name}
        </text>
        {content}
      </g>
      </svg>
    );
  });

  return elements;
}

function drawLines(heap, refs, scale) {
  let n = 0;

  const lines = Object.keys(heap.values).map((key, index) => {
    const cell = heap.values[key];
    if (cell.constructor.name == PointerType.name && heap.cellMapping[cell.value] && heap.cellMapping[cell.address]) {
        n += 1;

        return (<Line refs={refs} key={key} index={n} fromAddress={cell.address} toAddress={cell.value} scale={scale}/>)
      }
    });

  return lines;
}

export default Graph;
