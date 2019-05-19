import { StringLiteral, StackVariable, StackFrame, MemoryContent, ValueType, PointerType, ArrayType, Types, constructDataTypeFromValue } from './memorycontent';
import { enumerateHeapBlocks } from '../heap';
import * as C from 'persistent-c';

export const Properties = {
  CIRCLES: {
    RADIUS: 50,
    OFFSETY: 75,
    OFFSETX: 75
  },
  BLOCKS: {
    HEIGHT: 30,
    WIDTH: 60,
    OFFSETX: 350,
    OFFSETY: 40
  },
  FRAMES: {
    HEIGHT: 30,
    WIDTH: 175,
    OFFSETX: 5,
    OFFSETY: 40
  },
  DATA: {
    HEIGHT: 25,
    WIDTH: 175,
    OFFSETX: 650,
    OFFSETY: 40
  }
}

export const Dimensions = {
  HEIGHT: 30,
  WIDTH: 60,
  X: 350
};

export function buildPosition(x, y, width, height) {
  return {x, y, width, height};
}

export function getTypeName(type) {
	if (type.kind == Types.POINTER) return getTypeName(type.type) + "*";
	if (type.kind == Types.RECORD)  return "struct " + type.name;

	return type.name;
}
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
      return {kind: Types.POINTER, type: getTypeFromNode(node[0][2])};
    case "BuiltinType":
      return {kind: Types.SCALAR, name: node[0][1].name};
    case "RecordType":
      return {kind: Types.RECORD, name: node[0][1].name};
    case "ConstantArrayType":
      return {kind: Types.ARRAY, count: node[0][1].size, type: getTypeFromNode(node[0][2])};
    case "IncompleteArrayType":
      return {kind: Types.ARRAY, count: "", type: getTypeFromNode(node[0][2])};
    case "ElaboratedType":
      return getTypeFromNode(node[0][2]);
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
 * @param  {Object} memoryMap   The memory map object.
 * @param  {Object} node        An AST node.
 */
export function mapStaticMemory(core, memoryMap, node) {
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
      memoryMap.data.literals[literal.address] = literal;

      heapStart += value.type.size;
    } else if (node[0] == 'VarDecl') {
      // Adds an unevaluated stack variable to the
      // the dictionary belonging to the current function.
      const func = memoryMap.stack.functions[currentScope]
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
      memoryMap.stack.functions[currentScope] = {
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
    if (type == PointerType.name) return "0x"+data.value.toString(16);
    if (type == ArrayType.name) {
      let values = "";
      for (let key in data.elements) {
        if (values) values += ", ";

        values += getValueOf(data.elements[key]);
      }

      return "{ " + values + " }"
    }

    console.error("Data type not defined");
    console.error(data);

    return undefined;
  }

  return randomString(7);
}

export function getTypeOf(variable) {
	const type = variable.type;
	let prefix = "";
	let suffix = "";

	switch (type.kind) {
		case Types.POINTER:
			const pointerSubType = getTypeOf(type);
			prefix = pointerSubType.prefix + "*";
			suffix = pointerSubType.suffix;
			break;
		case Types.RECORD:
			prefix = "struct " + type.name + " ";
			break;
		case Types.SCALAR:
			prefix = type.name + " ";
			break;
		case Types.ARRAY:
			const arraySubType = getTypeOf(type);
			prefix = arraySubType.prefix;
			suffix = "["+type.count+"]"+arraySubType.suffix;
			break;
		default:
			prefix = "unknown";
	}

	return {prefix, suffix};
}
/**
 * Generates a random string of specified length.
 *
 * @param  {Int}    length The number of characters.
 * @return {String}        A random string.
 */
export function randomString(length) {
  return (Math.random() + 1).toString(36).substring(length);
}
/**
 * This function maps the memory of the running program.
 *
 * @param  {Object} context      The current context.
 * @return {Object}              memoryMap updated.
 */
export function mapMemory(context) {
  const { memoryMap, analysis } = context;
  let heap  = memoryMap.heap;
  let stack = memoryMap.stack;

  let stackFrames = [];
  let stackHeight = 0;
  // Build the stack frames
  analysis.frames.forEach(function(frame, depth) {
    if (frame.get('func').body[1].range) {
      const stackFrame = new StackFrame(frame, stack);
      stackHeight += stackFrame.numberOfVariables;
      stackFrames.push(stackFrame);
    }
  });

  stack.frames = stackFrames;
  stack.height = stackHeight;

  let allocatedBlocks = {};
  let bytesAllocated  = 0;
  // Collects information on allocated blocks, used below for
  // building a representation of the heap memory.
  for (let block of enumerateHeapBlocks(context.core)) {
    allocatedBlocks[block.start] = { start: block.start, end: block.end, free: block.free };

    if (block.free) {
      // Makes sure a free'd block is marked as free
      if (heap.allocatedBlocks.hasOwnProperty(block.start)) {
        heap.allocatedBlocks[block.start].free = block.free;
      }
      // This is mainly used for the height of the SVG canvas
      if (block.start > bytesAllocated) {
        bytesAllocated = block.start - context.core.heapStart;
      }
    }
  }

  if (bytesAllocated > heap.bytesAllocated) heap.bytesAllocated = bytesAllocated;
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

  memoryMap.heap  = heap;
  memoryMap.stack = stack;

  return memoryMap;
}

function setValue(memory, source, value) {
  const address = source.address;
  const data = constructDataTypeFromValue(address, value);
  memory.values[address] = data;
}
