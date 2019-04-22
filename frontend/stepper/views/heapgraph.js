import React from 'react';
import classnames from 'classnames';
import * as C from 'persistent-c';
import { getNumber, readValue } from './utils';
import { enumerateHeapBlocks } from '../heap';

const types = {
  BUILTIN: "builtin",
  POINTER: "pointer",
  SCALAR: "scalar",
  RECORD: "record"
};

class HeapGraph extends React.PureComponent {
  render() {
    const { context, startAddress, maxAddress } = this.props;
    const { memoryContents } = context;
    const {memory, lastAddress} = mapMemory(context, memoryContents, startAddress, maxAddress);

    let offset = 20;
    const height = lastAddress * 16;

    return (
      <div style={{background: `rgb(240, 240, 240)`, width: `100%`, height: height}}>
        <svg width="100%" height="100%" aria-labelledby="title desc">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" fill="black" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" />
            </marker>
          </defs>
          {
            Object.keys(memory.contents).map((key, index) => {
              const y = offset + (30 * index);
              offset += getSizeOf(memory.contents[key]) * 80;

              return (
                <svg y={y} key={index}>
                  <Variable key={index} variable={memory.contents[key]} />
                </svg>
              )
            })
          }
        </svg>
			</div>
    )
  }
}

function Variable({variable, index, startAddress}) {
  const isFreed = (variable.free) ? "Free'd" : "Allocated";

  let content = "";

  if (variable.fields) {
    content = variable.fields.map((field, i) => (<Field key={i} field={field} index={i}/>))
  } else {
    content = (<Content content={variable.address}/>)
  }

  return (
    <g fill="white">
      <text y="10" x="20%" fontSize='12px' fontWeight='bold' fill='grey'>
        {variable.type.type.name}
      </text>
      {content}
    </g>
  );
  // <line x1={arrow_x1} y1="30" x2={arrow_x2} y2="30" stroke="black" markerEnd="url(#arrow)"/>
}

function Content({content}) {
  return (
    <g>
      <rect y="10" x="30%" width="60" height="80" stroke="blue"></rect>
      <text y="20" x="30%" fontSize='12px' fontWeight='bold' fill='crimson'>
        {content}
      </text>
    </g>
  )
}

function Field({field, index}) {
  const y = index * 80;
  const fieldNameY = y + 15;
  const contentY = y + 30;

  return (
    <g>
      <rect y={y} x="30%" width="60" height="80" stroke="blue"></rect>
      <text y={fieldNameY} x="30%" fontSize='12px' fontWeight='bold' fill='crimson'>
        {field.name}
      </text>
      <text y={contentY} x="30%" dominantBaseline="middle" fontSize='15px' fill='black'>
        {field.address}
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

function mapMemory(context, memory, startAddress, maxAddress) {
  const { core, oldCore } = context;
  let { scope } = context.core;

  let variables = {};
  let pointers  = {};

  while (scope && scope.limit <= maxAddress + 1) {
    const {limit, kind} = scope;
    if (kind == "variable") {
      const {name, ref} = scope;
      const {block, addr} = unpack(context, name, ref, startAddress, maxAddress);
      if (block.type.kind == types.POINTER) {
        pointers[block.address] = block;
        Object.assign(memory.addresses, addr);
      } else {
        variables[ref.address] = block;
      }
    }

    scope = scope.parent;
  }

  let lastAddress = core.heapStart;

  for (let block of enumerateHeapBlocks(core)) {
    if (pointers.hasOwnProperty(block.start)) {
      memory.contents[block.start] = pointers[block.start];
    } else if (block.free) {
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
      if (memory.addresses.hasOwnProperty(source.address)) {
        memory.connections[source.address] = target.address;
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
    case types.BUILTIN:
      refType = ref.type;
    break;
    case types.POINTER:
      refType = ref.type.pointee;
    break;
    default:
      console.log("Unrecognized type: " + ref.type.pointee.kind);
    return;
  }

  const value = (refType.pointee.repr == "void")
              ? {}
              : readValue(context, refType, ref.address);

  let addr = {};

  let block = {
    name: name,
    type: getType(ref.type.pointee),
    size: refType.pointee.size
  };

  if (value.fields !== undefined) {
    block.fields = [];
  }

  if (block.type.kind == types.POINTER) {
    block.address = C.readValue(core, ref).toInteger();
    block.free = false;
  } else {
    block.content = C.readValue(core, ref).toInteger();
  }

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
    case types.POINTER:
      return {kind: type.kind, type: getType(type.pointee)};
      break;
    case types.BUILTIN:
      return {kind: types.SCALAR, name: type.repr};
      break;
    case types.RECORD:
      return {kind: type.kind, name: type.name};
      break;
    case types.SCALAR:
      return {kind: type.current.type.kind, name: type.current.type.repr};
      break;
    default:
      return {kind: "unknown", name: "unknown"};
  }
}

export default HeapGraph;
