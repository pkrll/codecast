import React from 'react';
import classnames from 'classnames';
import * as C from 'persistent-c';
import { getNumber, readValue } from './utils';
import { enumerateHeapBlocks } from '../heap';
import Immutable from 'immutable';

const Types = {
  BUILTIN: "builtin",
  POINTER: "pointer",
  SCALAR: "scalar",
  RECORD: "record"
};

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
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" fill="black" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" />
            </marker>
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

function Line({fromAddress, toAddress, startAddress}) {
  const startY = (fromAddress - startAddress) * Dimensions.HEIGHT + 5;
  const finalY = (toAddress - startAddress) * Dimensions.HEIGHT;

  const startX = Dimensions.X + Dimensions.WIDTH;
  const finalX = Dimensions.X + Dimensions.WIDTH + 100;

  const path = " M " + startX + "," + startY
             + " C " + finalX + "," + startY
             + "   " + finalX + "," + finalY
             + "   " + startX + "," + finalY;

  return (
      <path fill="transparent" stroke="black" d={path} markerEnd="url(#arrow)" />
  )
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
        {variable.type.type.name}
      </text>
      {content}
    </g>
  );
  // <line x1={arrow_x1} y1="30" x2={arrow_x2} y2="30" stroke="black" markerEnd="url(#arrow)"/>
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

function getSizeOf(pointer) {
  if (pointer.fields) {
    return pointer.fields.length;
  }

  return 1;
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
  const { core, oldCore } = context;
  let { scope } = context.core;

  let variables = {};
  let pointers  = {};
  let fields = {};

  while (scope && scope.limit <= maxAddress + 1) {
    const {kind, name, ref} = scope;
    if (kind == "variable") {
      const {block, addr} = unpack(context, name, ref, startAddress, maxAddress);
      if (block.type.kind == Types.POINTER) {
        pointers[block.address] = block;
        fields[block.address] = addr;
      } else {
        variables[ref.address] = block;
      }
    }

    scope = scope.parent;
  }

  let lastAddress = core.heapStart;

  for (let block of enumerateHeapBlocks(core)) {
    if (pointers.hasOwnProperty(block.start)) {
      let content = pointers[block.start];

      content.free = block.free;
      if (content.endAdress == undefined) {
        content.endAdress = block.end;

        const sizeOfType = content.size;
        const blockSize  = (block.end - block.start + 1);
        // Arrays
        if (sizeOfType <= blockSize && content.fields.length < 1) {
          addFieldsToBlock(content, sizeOfType, blockSize, memory);
        }
      }
      memory.blocks[block.start] = content;
      Object.assign(memory.fields, fields[block.start]);
    } else if (block.free) { // The first available memory block
      lastAddress = block.ref.address;
    }
  }

  lastAddress -= core.heapStart;
  pointers = {};

  for (let entry of core.memoryLog) {
    const op = entry[0];
    if (op == "store") {
      const source = entry[1];
      const target = entry[2];
      if (memory.fields.hasOwnProperty(source.address)) {
        const type = target.constructor.name;

        if (type == "IntegralValue") {
          memory.values[source.address] = new ValueType(source.address, target.number);
        } else {
          memory.values[source.address] = new PointerType(source.address, target.address);
        }
      }
    }
  }

  return {memory, lastAddress};
}

function unpack(context, name, ref, startAddress, endAddress) {
  const { core } = context;
  const type = ref.type.pointee.kind;
  let refType;

  switch (type) {
    case Types.BUILTIN:
      refType = ref.type;
    break;
    case Types.POINTER:
      refType = ref.type.pointee;
    break;
    default:
      console.log("Unrecognized type: " + ref.type.pointee.kind);
    return;
  }

  const value = (refType.pointee.repr == "void")
              ? {}
              : readValue(context, refType, ref.address);

  let block = {
    name: name,
    type: getType(ref.type.pointee),
    size: refType.pointee.size,
    fields: []
  };

  if (block.type.kind == Types.POINTER) {
    block.address = C.readValue(core, ref).toInteger();
    block.free = false;
  } else {
    block.content = C.readValue(core, ref).toInteger();
  }

  let addr = {};
  addr[block.address] = block.address;

  for (let index in value.fields) {
    const field   = value.fields[index];
    const address = block.address + refType.pointee.fieldMap[field.name].offset;

    block.fields.push({
      name: field.name,
      size: field.content.current.type.size,
      type: getType(field.content.current.type),
      address: address
    });

    addr[address] = block.address;
  }

  return { block, addr };
}

function getType(type) {
  switch (type.kind) {
    case Types.POINTER:
      return {kind: type.kind, type: getType(type.pointee)};
      break;
    case Types.BUILTIN:
      return {kind: Types.SCALAR, name: type.repr};
      break;
    case Types.RECORD:
      return {kind: type.kind, name: type.name};
      break;
    case Types.SCALAR:
      return {kind: type.current.type.kind, name: type.current.type.repr};
      break;
    default:
      return {kind: "unknown", name: "unknown"};
  }
}

function addFieldsToBlock(content, sizeOfType, blockSize, memory) {
  const numberOfSlots = blockSize / sizeOfType;
  let fields = {};

  for (let i = 0; i < numberOfSlots; i++) {
    const address = content.address + (i * sizeOfType);
    content.fields.push({
      name: i.toString(),
      size: sizeOfType,
      type: content.type,
      address: address
    });

    fields[address] = content.address;
    // if (memory.values[address] == undefined) {
    //   memory.values[address] = new ValueType(address, randomString(7));
    // }
  }

  Object.assign(memory.fields, fields);
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
