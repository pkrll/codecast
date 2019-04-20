import React from 'react';
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
		const { localMap, directive, context, centerAddress, startAddress, maxAddress, nBytesShown } = this.props;
    const { memory, globalMap } = context.core;
		let { scope } = context.core;
    let variables = {};

	  while (scope && scope.limit <= maxAddress + 1) {
	    const {limit, kind} = scope;
      if (kind == "variable") {
        const {name, ref} = scope;
        const variable = unpack(context, name, ref, startAddress, maxAddress);
        if (variable.type.kind == types.POINTER) {
          variables[variable.address] = variable;
        } else {
          variables[ref.address] = variable;
        }
      }

	    scope = scope.parent;
	  }

    for (let block of enumerateHeapBlocks(context.core)) {
      if (variables.hasOwnProperty(block.start) && block.free) {
        variables[block.start].free = block.free;
      }
    }

    console.log(variables);
    for (let entry of context.core.memoryLog) {
      // console.log(entry);
      const operation = entry[0];
      if (operation == "store") {

        //entry[1].constructor.name);
        //console.log(entry[2].constructor.name);
      }
    }

		return (
			<div>Hello World!
				<Graph variables={variables}/>
			</div>
		);
	}
}

function Graph({variables}) {
  return (
    <div>
      {
        Object.keys(variables).map((key, index) => (
          <Variable key={index} variable={variables[key]}/>
        ))
      }
    </div>
  )
}

function Variable({variable}) {
  const isFreed = (variable.free) ? "Free'd" : "Allocated";
  return (
    <div>
      {variable.name}: {isFreed}
    </div>
  )
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
		localMap, directive, context, centerAddress, startAddress, maxAddress, nBytesShown
	}
}

export default {View: MemoryGraph, selector: MemoryGraphSelector};
