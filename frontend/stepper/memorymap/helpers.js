import { StringLiteral, StackVariable, StackFrame, MemoryContent, Types, ValueType, PointerType } from './memorycontent';
import { enumerateHeapBlocks } from '../heap';
import * as C from 'persistent-c';

export const Dimensions = {
  HEIGHT: 30,
  WIDTH: 60,
  X: 350
};
/**
 * Retrieves the type of a variable from a node in the AST.
 *
 * @param  {Array}  node The AST node.
 * @return {Object}      The type of the variable.
 */
function getTypeFromNode(node) {
  const type = node[0][0];

  switch (type) {
    case "PointerType":
      return {kind: type, type: getTypeFromNode(node[0][2])};
      break;
    case "BuiltinType":
    case "RecordType":
      return {kind: type, name: node[0][1].name};
      break;
    case "ElaboratedType":
      return getTypeFromNode(node[0][2]);
      break;
    default:
      return {kind: 'unknown'};
  }
}
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
      memoryGraph.data.literals[literal.address] = literal;

      heapStart += value.type.size;
    } else if (node[0] == 'VarDecl') {
      // Adds an unevaluated stack variable to the
      // the dictionary belonging to the current function.
      const func = memoryGraph.stack.functions[currentScope]
      if (func !== undefined) {
        const name = node[1].name;
        const type = getTypeFromNode(node[2]);
        const ref  = {name, type};

        func.uninitialized[name] = ref;
        func.numberOfVariables += 1;
      }
    } else if (node[0] == 'FunctionDecl') {
      currentScope = node[2][0][1].identifier;
      // Initializes a dictionary for the current function
      // analyzed. The keys of the dictionary will be the
      // name of unevaluated variables (set above).
      // When the variable is evaluated, the values of the
      // entry will be a reference to that (StackVariable) object.
      memoryGraph.stack.functions[currentScope] = {
        identifier: currentScope,
        variables: {},
        uninitialized: {},
        numberOfVariables: 0
      };
    }
  });
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

  let heap  = memoryGraph.heap;
  let stack = memoryGraph.stack;

  let stackFrames = [];
  // Build the stack frames
  analysis.frames.forEach(function(frame, depth) {
    if (frame.get('func').body[1].range) {
      const stackFrame = new StackFrame(frame, stack);
      stackFrames.push(stackFrame);
    }
  });

  stack.frames = stackFrames;

  let allocatedBlocks = {};
  let endAddress = 0;
  // Collects information on allocated blocks, used below for
  // building a representation of the heap memory.
  for (let block of enumerateHeapBlocks(context.core)) {
    allocatedBlocks[block.start] = { start: block.start, end: block.end, free: block.free };

    if (block.free) {
      // Makes sure a free'd block is marked as free
      if (block.start > endAddress) {
        endAddress = block.start;
      }
    }
  }

  heap.bytesAllocated = endAddress - context.core.heapStart;
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
        Object.assign(heap.cellMapping, content.fieldAddresses);
      }

      if (heap.cellMapping.hasOwnProperty(source.address)) {
        setValue(heap, source, value);
      } else if (stack.variables.hasOwnProperty(source.address)) {
        setValue(stack, source, value);
      }
    }
  }

  memoryGraph.heap  = heap;
  memoryGraph.stack = stack;

  return memoryGraph;
}

function setValue(memory, source, value) {
  const valueType  = value.constructor.name;
  const srcAddress = source.address;

  const data = (valueType === "IntegralValue")
             ? new ValueType(srcAddress, value.number)
             : new PointerType(srcAddress, value.address);

  memory.values[srcAddress] = data;
}
