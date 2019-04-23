import React from 'react';
import classnames from 'classnames';
import * as C from 'persistent-c';
import { getNumber, readValue } from './utils';
import { enumerateHeapBlocks } from '../heap';
import { MemoryContent, Types } from '../memorycontent';
import Immutable from 'immutable';

import './../../style.scss';

const Dimensions = {
  HEIGHT: 20,
  WIDTH: 60,
  X: 100
};

class HeapGraph extends React.PureComponent {
  render() {
    const { context, startAddress, maxAddress } = this.props;
    const { memoryContents } = context;
    const {memory, lastAddress} = mapMemory(context, memoryContents, startAddress, maxAddress);

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
                  <Variable key={index} variable={content} memory={memory} />
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

class Line extends React.PureComponent {
  render() {
    const {fromAddress, toAddress, startAddress} = this.props;

    const startY = (fromAddress - startAddress) * Dimensions.HEIGHT + 5;
    const finalY = (toAddress - startAddress) * Dimensions.HEIGHT;

    const startX = Dimensions.X + Dimensions.WIDTH;
    const finalX = Dimensions.X + Dimensions.WIDTH + 100;

    const d = " M " + startX + "," + startY
            + " C " + finalX + "," + startY
            + "   " + finalX + "," + finalY
            + "   " + startX + "," + finalY;

    return (
        <path className="pointerArrow" pointerEvents="visiblePoint" d={d} markerEnd="url(#arrow)"/>
    );
  };
}

function Variable({memory, variable}) {
  const isFreed = (variable.free) ? "Free'd" : "Allocated";

  let content = [];
  let previousSize = 0;
  if (variable.fields) {
    content = variable.fields.map((field, i) => {
      const offsetTop = previousSize;
      previousSize += field.size * Dimensions.HEIGHT;
      return (<Field key={i} field={field} offsetTop={offsetTop} memory={memory} />)
    });
  } else {
    console.log("Error: Fields missing");
  }

  return (
    <g fill="white">
      <text y={previousSize + 10} x={Dimensions.X} fontSize='12px' fontWeight='bold' fill='grey'>
        {variable.type.name}
      </text>
      {content}
    </g>
  );

}

function Field({memory, field, offsetTop}) {
  const height = field.size * Dimensions.HEIGHT;
  const fieldNameY = offsetTop + 15;
  const contentY = offsetTop + 30;
  const content = getValueOf(memory.values[field.address]);

  return (
    <g>
      <rect y={offsetTop} x={Dimensions.X} width="60" height={height} stroke="blue"></rect>
      <text y={fieldNameY} x={Dimensions.X} fontSize='12px' fontWeight='bold' fill='crimson'>
        {field.name}
      </text>
      <text y={contentY} x={Dimensions.X} dominantBaseline="middle" fontSize='15px' fill='black'>
        {content}
      </text>
    </g>
  );
}

function getValueOf(data) {
  if (data !== undefined) {
    const type = data.constructor.name;
    if (type == ValueType.name)   return data.value;
    if (type == PointerType.name) return data.target;
  }

  return randomString(7);
}

function mapMemory(context, memory, startAddress, maxAddress) {
  let { scope } = context.core;

  while (scope && scope.limit <= maxAddress + 1) {
    const {kind, name, ref} = scope;
    if (kind == "variable") {
      // TODO: Keep track of stack variables?
    }

    scope = scope.parent;
  }

  let lastAddress = context.core.heapStart;
  let blocks = {};

  for (let block of enumerateHeapBlocks(context.core)) {
    blocks[block.start] = {
      start: block.start,
      end: block.end,
      free: block.free
    };

    if (block.free) {
      // Makes sure a free'd block is marked as free
      if (memory.blocks.hasOwnProperty(block.start)) {
        memory.blocks[block.start].free = block.free;
      }

      lastAddress = block.ref.address;
    }
  }

  lastAddress -= context.core.heapStart;

  for (let entry of context.core.memoryLog) {
    const op = entry[0];
    if (op == "store") {
      const source = entry[1];
      const value  = entry[2];

      if (blocks.hasOwnProperty(value.address)) {
        const content = new MemoryContent(context, value, blocks[value.address]);

        memory.blocks[content.address] = content;
        Object.assign(memory.fields, content.fieldAddresses);
      }

      if (memory.fields.hasOwnProperty(source.address)) {
        const type = value.constructor.name;

        if (type == "IntegralValue") {
          memory.values[source.address] = new ValueType(source.address, value.number);
        } else {
          memory.values[source.address] = new PointerType(source.address, value.address);
        }
      }
    }
  }

  return {memory, lastAddress};
}

function ValueType(source, value) {
  this.source = source;
  this.value = value;
}

function PointerType(source, target) {
  this.source = source;
  this.target = target;
}

function randomString(length) {
  return (Math.random() + 1).toString(36).substring(length);
}

export default HeapGraph;
