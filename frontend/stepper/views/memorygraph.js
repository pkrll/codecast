import React from 'react';
import Slider from 'rc-slider';
import * as C from 'persistent-c';
import { getNumber, readValue } from './utils';
import { enumerateHeapBlocks } from '../heap';

const types = {
  BUILTIN: "builtin",
  POINTER: "pointer",
  SCALAR: "scalar",
  RECORD: "record"
};

class MemoryGraph extends React.PureComponent {

	render() {
		const { Frame, localMap, directive, context, centerAddress, startAddress, maxAddress, nBytesShown, widthFactor } = this.props;
    const { memory, globalMap } = context.core;
		let { scope } = context.core;
    let variables = {};
    let pointers = {};

	  while (scope && scope.limit <= maxAddress + 1) {
	    const {limit, kind} = scope;
      if (kind == "variable") {
        const {name, ref} = scope;
        const variable = unpack(context, name, ref, startAddress, maxAddress);
        if (variable.type.kind == types.POINTER) {
          pointers[variable.address] = variable;
        } else {
          variables[ref.address] = variable;
        }
      }

	    scope = scope.parent;
	  }

    for (let block of enumerateHeapBlocks(context.core)) {
      if (pointers.hasOwnProperty(block.start) && block.free) {
        pointers[block.start].free = block.free;
      }
    }

    for (let entry of context.core.memoryLog) {
      // console.log(entry);
      const operation = entry[0];
      if (operation == "store") {

        //entry[1].constructor.name);
        //console.log(entry[2].constructor.name);
      }
    }

    let offset = 20;
    const height = Object.keys(pointers).length * 400;
		return (
      <Frame {...this.props}>
        <div className="memory-controls directive-controls">
          <div className="memory-slider-container" style={{width: `${Math.round(400 * widthFactor)}px`}}>
            <Slider prefixCls="memory-slider" tipFormatter={null} value={centerAddress} min={0} max={maxAddress} onChange={this.onSeek}>
              <div className="memory-slider-background"/>
            </Slider>
          </div>
          </div>
			<div style={{background: `rgb(240, 240, 240)`, width: `100%`, height: height, overflow: `scroll-y`}}>
        <svg width="100%" height="100%" aria-labelledby="title desc">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" fill="black" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" />
            </marker>
          </defs>
          {
            Object.keys(pointers).map((key, index) => {
              const y = offset + (30 * index);
              offset += getSizeOf(pointers[key]) * 80;

              return (
                <svg y={y} key={index}>
                  <Variable key={index} variable={pointers[key]} />
                </svg>
              )
            })
          }
        </svg>
			</div>
      </Frame>
		);
	}

  onSeek = (centerAddress) => {
    // Clear nibbles 0 and 1.
    centerAddress = centerAddress ^ (centerAddress & 0xFF);
    // Copy nibble 2 into nibble 1 (0xAB00 → 0xABB0)
    centerAddress |= 0xF0 & (centerAddress >> 4);
    this.props.onChange(this.props.directive, {centerAddress});
  };
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


function clipCenterAddress ({nBytesShown, context}, address) {
  //address -= nBytesShown / 2;
  address = Math.max(0, address);
  address = Math.min(context.core.memory.size - 1, address);
  //address += nBytesShown / 2;
  return address;
}

function unpack(context, name, ref, startAddress, endAddress) {
  const {core, oldCore} = context;
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

  const value = readValue(context, refType, ref.address);

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
  }

  return block;
}

/**
 * Converts a number to another base and returns it as a string.
 *
 * @param  {(Number|String)} number   The number to convert.
 * @param  {Number}          base     The base to convert to (default = 10).
 * @param  {Object}          options  Additional options (optional).
 * @return {String} The number converted to the specified base as a string.
 */
function convertBase(number, base = 10, options = {}) {
  // A stringified number (i.e. "22" is a number in JS)
  if (isNaN(number)) return 0;

  number = (typeof(number) == "string")
         ? parseInt(number).toString(base)
         : number.toString(base);

  if (options.padding) {
    for (let i = number.length; i < options.padding.width; i++) {
      number = options.padding.content + number;
    }
  }

  return number;
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

function MemoryGraphSelector ({scale, directive, context, controls, frames}) {
  const localMap = frames[0].get('localMap');
	const {byName, byPos} = directive;
	const nBytesShown = getNumber(byName.bytes, 32);
  const widthFactor = getNumber(byName.width, 1);
	const maxAddress  = context.core.memory.size - 1;

  let centerAddress = controls.get('centerAddress');

  if (centerAddress === undefined) {
    centerAddress = clipCenterAddress(
      {nBytesShown, context},
      getNumber(byName.start, nBytesShown / 2)
    );
  }

  const startAddress = centerAddress - nBytesShown / 2;

  return {
		localMap, directive, context, controls, centerAddress, startAddress, maxAddress, nBytesShown, widthFactor
	}
}

export default {View: MemoryGraph, selector: MemoryGraphSelector};
