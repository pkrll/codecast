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
export function StackVariable(name, ref) {
  this.name = name;
  this.type = getType(ref.type.pointee);
  this.address = ref.address;
}
/**
 * Represents a stack frame.
 *
 * @param       {Object} frame     Information on the frame.
 * @param       {Object} stackArea The stack area object.
 * @constructor
 */
export function StackFrame(frame, stackArea) {
  const func       = frame.get('func');
  const localMap   = frame.get('localMap');
  const localNames = frame.get('localNames');

  this.name = func.name;
  this.type = getType(func.type.pointee.result);
  this.variables = [];
  // Adds all initialized stack variables to the
  // function's lists of variables.
  localNames.forEach(name => {
    const type = localMap.get(name);
    const variable = new StackVariable(name, type.ref)
    this.variables.push(variable);
    // Maps the uninitialized variable to the initialized one.
    stackArea.variables[this.name][name] = variable;
  });
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
  this.size = pointer.size || (end - start + 1); // void types have size 0, for some reason
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
      return {kind: Types.SCALAR, name: type.repr};
      break;
    case Types.RECORD:
      return {kind: type.kind, name: type.name};
      break;
    case Types.SCALAR:
      return {kind: type.current.type.kind, name: type.current.type.repr};
      break;
    case Types.ARRAY:
      return {kind: type.kind, elem: getType(type.elem)};
      break;
    default:
      return {kind: "unknown", name: "unknown"};
  }
}
