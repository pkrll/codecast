import { StringLiteral, StackVariable, StackFrame, MemoryContent, Types } from './memorycontent';
import { enumerateHeapBlocks } from '../heap';
import * as C from 'persistent-c';

export const Dimensions = {
  HEIGHT: 30,
  WIDTH: 60,
  X: 350
};
/**
 * Builds a representation over the stack area, with
 * all its uninitialized variables.
 *
 * The function also retrieves all string literals.
 *
 * @param  {Object} core        The current context.
 * @param  {Object} memoryGraph Empty memory graph object.
 * @param  {Object} node        An AST node.
 */
export function mapStaticMemory(core, memoryGraph, node) {
  let heapStart = core.heapStart;
  let currentScope = undefined;
  C.forEachNode(node, function (node) {
    if (node[0] === 'StringLiteral') {
      // Create a StringLiteral object
      // This code is borrowed from Persistent-C.
      const value = C.stringValue(node[1].value);
      const ref = new C.PointerValue(value.type, heapStart);
      const ptr = core.literals.get(node, ref);
      const literal = new StringLiteral(value.elements, ptr);
      memoryGraph.stringLiterals[literal.address] = literal;

      heapStart += value.type.size;
    } else if (node[0] == 'VarDecl') {
      // Adds an uninitialized stack variable to the
      // the dictionary belonging to the current function.
      if (memoryGraph.stackArea.variables[currentScope]) {
        const name = node[1].name;
        const ref  = {};
        memoryGraph.stackArea.variables[currentScope][name] = ref;
      }
    } else if (node[0] == 'FunctionDecl') {
      currentScope = node[2][0][1].identifier;
      const prototype = node[2][1];
      if (prototype[0] == "FunctionNoProtoType") {
        // Initializes a dictionary for the current function
        // analyzed. The keys of the dictionary will be the
        // name of uninitialized variables (set above).
        // When the variable is initialized, the values of the
        // entry will be a reference to that (StackVariable) object.
        memoryGraph.stackArea.variables[currentScope] = {};
      }
    }
  });
}
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
  const { memoryGraph, analysis } = context;
  let { scope } = context.core;

  let heap = memoryGraph.heapArea;
  let stackArea = memoryGraph.stackArea;

  let stack = [];
  // Retrieve stack content
  analysis.frames.forEach(function(frame, depth) {
    if (frame.get('func').body[1].range) {
      const stackFrame = new StackFrame(frame, stackArea);
      stack.unshift(stackFrame);
    }
  });

  stackArea.callStack = stack;

  let allocatedBlocks = {};
  let endAddress = 0;
  // Collects information on allocated blocks, used below for
  // building a representation of the heap memory.
  for (let block of enumerateHeapBlocks(context.core)) {
    allocatedBlocks[block.start] = {
      start: block.start,
      end: block.end,
      free: block.free
    };

    if (block.free) {
      // Makes sure a free'd block is marked as free
      if (heap.allocatedBlocks.hasOwnProperty(block.start)) {
        heap.allocatedBlocks[block.start].free = block.free;
      }

      if (block.start > endAddress) {
        endAddress = block.start;
      }
    }
  }

  heap.endAddress = endAddress - context.core.heapStart;
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
        heap.allocatedBlocks[content.address] = content;
        Object.assign(heap.fields, content.fieldAddresses);
      }

      if (heap.fields.hasOwnProperty(source.address)) {
        const type = value.constructor.name;

        if (type == "IntegralValue") {
          heap.values[source.address] = new ValueType(source.address, value.number);
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

          heap.values[source.address] = ref;
        }
      }
    }
  }

  memoryGraph.heapArea = heap;
  memoryGraph.stackArea = stackArea;

  return { memory: memoryGraph, stack };
}
