import { MemoryContent, Types } from './memorycontent';
import { enumerateHeapBlocks } from '../heap';
import * as C from 'persistent-c';

export const Dimensions = {
  HEIGHT: 30,
  WIDTH: 60,
  X: 350
};
/**
 * Determines whether the given pointer is a string.
 *
 * @param  {Object}  value The pointer.
 * @return {Boolean}       True if it is a string.
 */
export function isString(value) {
  if (value && value.type.kind == "pointer") {
    const pointer = value.type.pointee;

    return (pointer.kind == "builtin" && pointer.repr == "char");
  }

  return false;
}
/**
 * Returns the value of a ValueType or PointerType type.
 *
 * @param  {Object} data The
 * @return {[type]}      [description]
 */
export function getValueOf(data) {
  if (data !== undefined) {
    const type = data.constructor.name;
    if (type == ValueType.name)   return data.value;
    if (type == PointerType.name) return data.target;
  }

  return randomString(7);
}
/**
 * Generates a random string of specified length.
 * @param  {Int}    length The number of characters.
 * @return {String}        A random string.
 */
export function randomString(length) {
  return (Math.random() + 1).toString(36).substring(length);
}
/**
 * A ValueType represents a value type data type, such as
 * integers or chars.
 *
 * Strings are treated as value types here.
 *
 * @param       {Int} source The source memory address.
 * @param       {Any} value  The value.
 * @constructor
 */
export function ValueType(source, value) {
  this.source = source;
  this.value = value;
}
/**
 * A PointerType represents a reference type data type.
 *
 *
 * @param       {Int} source The source memory address.
 * @param       {Int} target The target memory address.
 * @constructor
 */
export function PointerType(source, target) {
  this.source = source;
  this.target = target;
}
/**
 * Retrieves the contents of the memory.
 *
 * This function gathers and returns information on everything
 * allocated on the heap. The return value is an object with:
 *
 *    - MemoryContents: This structure is part of the context,
 *                      and consists of `blocks`, `fields` and
 *                      `values`.
 *    - lastAddress:    This is the first available address on
 *                      the heap, used for drawing purposes.
 *
 * @param  {Object} context      The current context.
 * @param  {Int}    startAddress The start address of the heap.
 * @param  {Int}    maxAddress   The maximum address of the heap.
 *
 * @return {Object}              MemoryContents updated and the
 *                               first available memory address.
 */
export function mapMemory(context, startAddress, maxAddress) {
  const { memoryContents } = context;
  let { scope } = context.core;

  while (scope && scope.limit <= maxAddress + 1) {
    const {kind, name, ref} = scope;
    if (kind == "variable") {
      // TODO: Keep track of stack variables?
    }

    scope = scope.parent;
  }

  let allocatedBlocks = {};
  // Collects information on allocated blocks, used below for
  // building a representation of the memory contents.
  for (let block of enumerateHeapBlocks(context.core)) {
    allocatedBlocks[block.start] = {
      start: block.start,
      end: block.end,
      free: block.free
    };

    if (block.free) {
      // Makes sure a free'd block is marked as free
      if (memoryContents.blocks.hasOwnProperty(block.start)) {
        memoryContents.blocks[block.start].free = block.free;
      }

      if (block.start > memoryContents.endAddress) {
        memoryContents.endAddress = block.start;
      }
    }
  }

  memoryContents.endAddress -= context.core.heapStart;
  // Every memory event is recorded in the memory log. By mapping every
  // "store" operation to an allocated block, we can find information
  // on every allocation made.
  for (let entry of context.core.memoryLog) {
    const op = entry[0];
    if (op == "store") {
      const source = entry[1];
      const value  = entry[2];

      if (allocatedBlocks.hasOwnProperty(value.address)) {
        const content = new MemoryContent(context, value, allocatedBlocks[value.address]);
        memoryContents.blocks[content.address] = content;
        Object.assign(memoryContents.fields, content.fieldAddresses);
      }

      if (memoryContents.fields.hasOwnProperty(source.address)) {
        const type = value.constructor.name;

        if (type == "IntegralValue") {
          memoryContents.values[source.address] = new ValueType(source.address, value.number);
        } else {
          let ref = undefined;
          // Strings are handled as ValueType types, instead of pointers. This
          // makes it a lot easier to display the string in the memory representation.
          if (isString(value)) {
            const string = C.readString(context.core.memory, value);
            ref = new ValueType(source.address, string);
          } else {
            ref = new PointerType(source.address, value.address);
          }

          memoryContents.values[source.address] = ref;
        }
      }
    }
  }

  return { memory: memoryContents };
}
