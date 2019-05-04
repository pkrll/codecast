import * as C from 'persistent-c';
import { readValue } from '../views/utils';

export const Types = {
  BUILTIN: "builtin",
  POINTER: "pointer",
  SCALAR: "scalar",
  RECORD: "record",
  ARRAY: "array"
};
/**
 * Returns a data structure representing a memory value.
 *
 * @param  {Int}    address The source address.
 * @param  {Object} value   The value type.
 * @return {Object}         A ValueType, PointerType or ArrayType.
 */
export function constructDataTypeFromValue(address, value) {
  const valueType = value.constructor.name;

  switch (valueType) {
    case "IntegralValue":
      return new ValueType(address, value.number);
    case "PointerValue":
      return new PointerType(address, value.address);
    case "ArrayValue":
      return new ArrayType(address, value.elements, value.type);
  }

  return undefined;
}
/**
 * Represents a value type data type, such as
 * integers or chars.
 *
 * @param       {Int} address The source memory address.
 * @param       {Any} value   The value.
 * @constructor
 */
export function ValueType(address, value) {
  this.address = address;
  this.value = value;
}
/**
 * Represents a pointer type data type.
 *
 *
 * @param       {Int} address The source memory address.
 * @param       {Int} value   The target memory address.
 * @constructor
 */
export function PointerType(address, value) {
  this.address = address;
  this.value = value;
}
/**
 * Represents an array data type.
 *
 * @param       {Int}    address  The source memory address.
 * @param       {Object} elements The elements of the array.
 * @param       {Object} type     The type of the array.
 * @constructor
 */
export function ArrayType(address, elements, type) {
  this.address = address;
  this.elements = {};
  this.count = type.count.number;
  this.type = getType(type);

  for (let index in elements) {
    const element = elements[index];
    const address = this.address + (index * element.type.size);
    const value = constructDataTypeFromValue(address, element);

    this.elements[address] = value;
  }
}
/**
 * Represents a string literal.
 *
 * @param       {Object} elements The elements of the char array.
 * @param       {Object} ref      The pointer to the string.
 * @constructor
 */
export function StringLiteral(elements, ref) {
  this.size = ref.type.count.number;
  this.type = getType(ref.type);
  this.address = ref.address;
  this.elements = [];
  this.value = "";

  for (let i in elements) {
    const element = elements[i].number;
    if (element == 0) break;
    this.elements.push(element);
    this.value += String.fromCharCode(parseInt(element));
  }
}
/**
 * Represents an initialized stack variable.
 *
 * @param       {String} name The name of the variable.
 * @param       {Object} ref  The reference.
 * @constructor
 */
export function StackVariable(name, ref, type) {
  this.name = name;
  this.type = type || getType(ref.type.pointee);
  this.address = ref.address;
}
/**
 * Represents a stack frame.
 *
 * @param       {Object} frame     Information on the frame.
 * @param       {Object} stack     The stack object.
 * @constructor
 */
export function StackFrame(frame, stack) {
  const func       = frame.get('func');
  const args       = frame.get('args');
  const localMap   = frame.get('localMap');
  const localNames = frame.get('localNames');

  this.name = func.name;
  this.type = getType(func.type.pointee.result);
  this.arguments = {};
  this.variables = {};
  this.uninitialized = Object.assign({}, stack.functions[this.name].uninitialized);
  this.numberOfVariables = stack.functions[this.name].numberOfVariables + args.length;
  // Adds all initialized stack variables to the
  // function's lists of variables.
  localNames.forEach(name => {
    const type = localMap.get(name);
    const variable = new StackVariable(name, type.ref)
    this.variables[variable.address] = variable;
    // Remove an initialized variable from the uninitialized list
    if (this.uninitialized[name]) delete this.uninitialized[name];
    // This is so that we can access variables faster?
    stack.variables[variable.address] = variable;
  });
  // TODO: Add arguments?
  // args.forEach(arg => this.arguments[arg.address] = this.variables[arg.address]);
}
/**
 * Represents a data type allocated on the heap.
 *
 * The MemoryContent type consists of the properties:
 *
 *     - type:           The data type.
 *     - size:           The size of the block in bytes.
 *     - free:           A boolean indicating whether the block is free'd or not.
 *     - address:        The start address of the block.
 *     - end:            The end address of the block.
 *     - fields:         A collection of all associated fields.
 *     - fieldAddresses: Addresses to all the fields.
 *
 * The fields represents either a struct's fields, or an array's slots.
 *
 * @param       {Object} context [description]
 * @param       {Object} ref     [description]
 * @param       {Object} start   [description]
 * @constructor
 */
export function MemoryContent(context, ref, {start, end, free}) {
  if (ref.type.kind !== Types.POINTER) return undefined;

  const {core}  = context;
  const pointer = ref.type.pointee;

  const value = (pointer.repr == "void")
              ? {fields: []}
              : readValue(context, ref.type, ref.address);

  // The type of the allocated block consist of kind and name
  // where kind is pointer|scalar|record and name is either the
  // name of a record/structure or the name of the built-in type.
  this.type = getType(pointer);
  this.size = pointer.size || (end - start + 1); // void types have size 0
  this.address = ref.address;
  this.fields  = [];
  this.free = free;
  this.end = end;
  this.fieldAddresses = {};

  if (this.type.kind == Types.SCALAR) {
    // Scalar types does not have fields built in
    const numberOfFields = (end - start + 1) / this.size;
    for (let i = 0; i < numberOfFields; i++) {
      const name    = i.toString();
      const size    = this.size;
      const type    = this.type;
      const address = this.address + (i * this.size);

      this.fields.push(buildField(i.toString(), this.size, this.type, address));
      this.fieldAddresses[address] = this.address;
    }
    // Update the size to reflect the actual size of the memory block
    this.size = numberOfFields * this.size;
  } else {
    for (let index in value.fields) {
      const field = value.fields[index];
      const name  = field.name;
      const size  = field.content.current.type.size;
      const type  = getType(field.content.current.type);

      this.fields.push(buildField(name, size, type, field.address));
      this.fieldAddresses[field.address] = this.address;
    }
  }
}

function buildField(name, size, type, address) {
  return {name, size, type, address};
}

function getType(type) {
  switch (type.kind) {
    case Types.POINTER:
      return {kind: type.kind, type: getType(type.pointee)};
      break;
    case Types.BUILTIN:
      return {kind: Types.SCALAR, size: type.size, name: type.repr};
      break;
    case Types.RECORD:
      return {kind: type.kind, size: type.size, name: type.name};
      break;
    case Types.SCALAR:
      return {kind: type.current.type.kind, name: type.current.type.repr};
      break;
    case Types.ARRAY:
      return {kind: type.kind, count: type.count.number, size: type.size, type: getType(type.elem)};
      break;
    default:
      return {kind: "unknown", name: "unknown"};
  }
}
