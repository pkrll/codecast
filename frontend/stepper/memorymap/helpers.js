import { MemoryContent, Types } from './memorycontent';
import { enumerateHeapBlocks } from '../heap';

export const Dimensions = {
  HEIGHT: 20,
  WIDTH: 60,
  X: 100
};

export function getValueOf(data) {
  if (data !== undefined) {
    const type = data.constructor.name;
    if (type == ValueType.name)   return data.value;
    if (type == PointerType.name) return data.target;
  }

  return randomString(7);
}

export function randomString(length) {
  return (Math.random() + 1).toString(36).substring(length);
}

export function ValueType(source, value) {
  this.source = source;
  this.value = value;
}

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

  let lastAddress = context.core.heapStart;
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

      lastAddress = block.ref.address;
    }
  }

  lastAddress -= context.core.heapStart;
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
          memoryContents.values[source.address] = new PointerType(source.address, value.address);
        }
      }
    }
  }

  return { memory: memoryContents, lastAddress };
}
