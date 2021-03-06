/*
This module contains React components that can be used to display values
extracted from the stepper by the analysis module.
*/

import React from 'react';
import classnames from 'classnames';
import * as C from 'persistent-c';

import {LocalizedError} from '../../lang/index';

export const readScalarBasic = function (core, refType, address) {
  // Produce a 'basic stored scalar value' object whose shape is
  //   {kind, ref, current}
  // where:
  //   - 'kind' is always 'scalar'
  //   - 'ref' holds the value's reference (a pointer value)
  //   - 'current' holds the current value
  const kind = 'scalar';
  const ref = new C.PointerValue(refType, address);
  const current = C.readValue(core, ref);
  return {kind, ref, current};
};

export const readScalar = function (context, refType, address) {
  // Produce a 'stored scalar value' object whose shape is
  //   {kind, ref, current, previous, load, store}
  // where:
  //   - 'kind', 'ref', 'current' are as returned by readScalarBasic
  //   - 'load' holds the smallest rank of a load in the memory log
  //   - 'store' holds the greatest rank of a store in the memory log
  //   - 'previous' holds the previous value (if 'store' is defined)
  const {core, oldCore} = context;
  const result = readScalarBasic(core, refType, address);
  core.memoryLog.forEach(function (entry, i) {
    /* FIXME: when ref is a pointer type, the length of the value written
              to it should be used to decide if the ranges intersect */
    if (refsIntersect(result.ref, entry[1])) {
      if (entry[0] === 'load') {
        if (result.load === undefined) {
          result.load = i;
        }
      } else if (entry[0] === 'store') {
        result.store = i;
      }
    }
  });
  if ('store' in result) {
    result.previous = C.readValue(oldCore, result.ref);
  }
  return result;
};

export const readValue = function (context, refType, address, limits) {
  const type = refType.pointee;
  if (type.kind === 'array') {
    if (type.count === undefined) {
      /* Array of unknown size, display as pointer */
      return {kind: 'scalar', current: new C.PointerValue(refType, address)};
    } else {
      const cells = readArray(context, type, address, limits);
      return {kind: 'array', count: type.count, cells};
    }
  }
  if (type.kind === 'record') {
    const fields = readRecord(context, type, address, limits);
    return {kind: 'record', name: type.name, fields};
  }
  if (limits) {
    limits.scalars += 1;
  }
  return readScalar(context, refType, address);
};

export const readArray = function (context, arrayType, address, limits) {
  const elemCount = arrayType.count.toInteger();
  const elemType = arrayType.elem;
  const elemSize = elemType.size;
  const elemRefType = C.pointerType(elemType);
  const cells = [];
  let index;
  for (index = 0; index < elemCount; index += 1) {
    const content = readValue(context, elemRefType, address, context);
    cells.push({index, address, content});
    address += elemSize;
    if (limits && limits.scalars >= limits.maxScalars) {
      break;
    }
  }
  if (index < elemCount) {
    index += 1;
    cells.push({index, address, content: {kind: 'ellipsis'}});
  }
  return cells;
};

export const readRecord = function (context, recordType, address, limits) {
  const fields = [];
  for (let fieldName of recordType.fields) {
    const {offset, type} = recordType.fieldMap[fieldName];
    const fieldAddress = address + offset;
    const content = readValue(context, C.pointerType(type), fieldAddress, limits);
    fields.push({name: fieldName, address: fieldAddress, content});
    if (limits && limits.scalars >= limits.maxScalars) {
      break;
    }
  }
  if (fields.length < recordType.fields.length) {
    fields.push({ellipsis: true});
  }
  return fields;
};


export const refsIntersect = function (ref1, ref2) {
  const base1 = ref1.address, limit1 = base1 + ref1.type.pointee.size - 1;
  const base2 = ref2.address, limit2 = base2 + ref2.type.pointee.size - 1;
  const result = (base1 <= base2) ? (base2 <= limit1) : (base1 <= limit2);
  return result;
};

/**
  Evaluator for expressions found in directives.
  If asRef is false, the (scalar) value of expr (in the given context) is
  returned.
  If asRef is true, expr is interpreted as an l-value and its address
  is returned.
  If any error occurs, an Error is thrown.
*/
export const evalExpr = function (core, localMap, expr, asRef) {
  if (expr[0] === 'ident') {
    const name = expr[1];
    const decl = localMap.get(name);
    if (!decl) {
      if (name in core.globalMap) {
        const value = core.globalMap[name];
        if (value instanceof C.PointerValue) {
          return evalRef(core, value, asRef);
        }
      }
      throw new LocalizedError('EVAL_REF_UNDEF_VAR', {name});
    }
    return evalRef(core, decl.ref, asRef);
  }
  if (expr[0] === 'deref') {
    const ref = evalExpr(core, localMap, expr[1], false);
    if (ref.type.kind !== 'pointer') {
      throw new LocalizedError('EVAL_DEREF_NONPTR');
    }
    return evalRef(core, ref, asRef);
  }
  if (expr[0] === 'subscript') {
    const arrayRef = evalExpr(core, localMap, expr[1], false);
    if (arrayRef.type.kind !== 'pointer') {
      throw new LocalizedError('EVAL_SUBSC_NONPTR');
    }
    const index = evalExpr(core, localMap, expr[2], false);
    if (index.type.kind !== 'builtin') {
      throw new LocalizedError('EVAL_SUBSC_NONBLT');
    }
    const elemType = arrayRef.type.pointee;
    const address = arrayRef.address + elemType.size * index.toInteger();
    const ref = C.makeRef(elemType, address);
    if (asRef || elemType.kind === 'array') {
      return ref;
    } else {
      return C.readValue(core, ref);
    }
  }
  if (asRef) {
    throw new LocalizedError('EVAL_ADDR_NONLVAL');
  }
  if (expr[0] === 'number') {
    return new C.IntegralValue(C.builtinTypes['int'], expr[1] | 0);
  }
  if (expr[0] === 'addrOf') {
    return evalExpr(core, localMap, expr[1], true);
  }
  throw new LocalizedError('EVAL_UNSUP_EXPR');
};

const evalRef = function (core, ref, asRef) {
  if (asRef) {
    if (ref.type.pointee.kind === 'array') {
      // Taking the address of an array, returns a decayed pointer to the array.
      // Perhaps this should be already be done in persistent-c?
      return C.makeRef(ref.type.pointee, ref.address);
    }
    return ref;
  } else {
    const valueType = ref.type.pointee;
    if (valueType.kind === 'array') {
      return C.makeRef(valueType, ref.address);
    } else {
      return C.readValue(core, ref);
    }
  }
};

const strParensIf = function (cond, str) {
  return cond ? `(${str})` : str;
};

export const stringifyExpr = function (expr, precedence) {
  precedence = precedence || 0;
  if (expr[0] === 'parens') {
    return strParensIf(true, stringifyExpr(expr[1], 0));
  }
  if (expr[0] === 'ident' || expr[0] === 'number') {
    return expr[1].toString();
  }
  if (expr[0] === 'deref') {
    return strParensIf(precedence > 1, `*${stringifyExpr(expr[1], 1)}`);
  }
  if (expr[0] === 'subscript') {
    return strParensIf(
      precedence > 2,
      `${stringifyExpr(expr[1], 2)}[${stringifyExpr(expr[2], 0)}]`);
  }
  if (expr[0] === 'addrOf') {
    return `&${stringifyExpr(expr[1], 0)}`;
  }
  return JSON.stringify(expr);
};

export const viewExprs = function (core, frame, exprs) {
  const localMap = frame.get('localMap');
  const views = [];
  exprs.forEach(function (expr) {
    const label = stringifyExpr(expr, 0);
    try {
      const value = evalExpr(core, localMap, expr, false);
      views.push({label, value});
    } catch (ex) {
      views.push({label, error: ex.toString});
    }
  });
  return views;
};

export const viewFrame = function (context, frame, options) {
  const view = {
    key: frame.get('scope').key,
    func: frame.get('func'),
    args: frame.get('args')
  };
  if (options.locals) {
    const localMap = frame.get('localMap');
    const locals = view.locals = [];
    frame.get('localNames').forEach(function (name) {
      const {type, ref} = localMap.get(name);
      // type and ref.type.pointee are assumed identical
      locals.push(viewVariable(context, name, type, ref.address));
    });
  }
  return view;
};

export const viewVariable = function (context, name, type, address) {
  const limits = {scalars: 0, maxScalars: 15};
  return {
    name,
    type,
    address,
    value: readValue(context, C.pointerType(type), address, limits)
  };
};

//

const parensIf = function (cond, elem) {
  return cond ? <span>{'('}{elem}{')'}</span> : elem;
};

export const renderValue = function (value) {
  if (value === undefined) {
    return 'noval';
  }
  if (value === null) {
    return 'void';
  }
  return value.toString();
};

export function StoredValue ({value}) {
  if (value.kind === 'ellipsis') {
    return <span className='value value-ellipsis'>{'…'}</span>;
  }
  if (value.kind === 'scalar') {
    // Value shape is {ref, current, previous, load, store}, see analysis.js for
    // details.
    return (
      <span className='value'>
        <span className={classnames(['load' in value && 'value-load'])}>
          {renderValue(value.current)}
        </span>
        {'store' in value &&
          <span className='value-previous'>
            {renderValue(value.previous)}
          </span>}
      </span>
    );
  }
  if (value.kind === 'array') {
    const {cells} = value;
    return (
      <span className='value value-array'>
        {'{'}
        {cells.map((cell, i) =>
          <span key={cell.index}>
            <span className='value-array-cell'>
              <StoredValue value={cell.content}/>
            </span>
            {i + 1 === cells.length || ', '}
          </span>
        )}
        {'}'}
      </span>
    );
  }
  if (value.kind === 'record') {
    const {fields} = value;
    return (
      <span className='value value-record'>
        {'{'}
        {fields.map((field, i) =>
          <span key={field.name}>
            <span className='value-record-field' title={field.name}>
              <StoredValue value={field.content}/>
            </span>
            {i + 1 === fields.length || ', '}
          </span>
        )}
        {'}'}
      </span>
    );
  }
  return <span className='value'>{`unknown value kind ${value.kind}`}</span>;
}

export const renderDeclType = function (type, subject, prec) {
  switch (type.kind) {
    case 'function':
      // TODO: print param types?
      return renderDeclType(type.result, <span>{parensIf(prec > 0, subject)}{'()'}</span>, 0);
    case 'pointer':
      return renderDeclType(type.pointee, <span>{'*'}{subject}</span>, 1);
    case 'array':
      return renderDeclType(type.elem, <span>{parensIf(prec > 0, subject)}{'['}{type.count && type.count.toString()}{']'}</span>, 0);
    case 'record':
      return <span>{'struct'}{' '}{type.name}{' '}{subject}</span>;
    case 'builtin':
      return <span>{type.repr}{' '}{subject}</span>;
    default:
      return `<invalid kind ${type.kind}>`;
  }
};

export function VarDecl ({name, type, address, value}) {
  const subject = <span className='vardecl-name' title={address && '0x'+address.toString(16)}>{name}</span>;
  return (
    <div className='vardecl'>
      {renderDeclType(type, subject, 0)}
      {value && ' = '}
      {value && <span className='vardecl-value'><StoredValue value={value}/></span>}
    </div>
  );
}

export function FunctionCall ({func, args}) {
  const argCount = args.length;
  return (
    <span>
      {func.name}
      {'('}
      <span>
        {args.map(function (value, i) {
          return (
            <span key={i}>
              {renderValue(value)}
              {i + 1 < argCount && ', '}
            </span>
          );
        })}
      </span>
      {')'}
    </span>
  );
}

export const getIdent = function (expr, noVal) {
  if (!expr) {
    return noVal;
  }
  return expr[0] === 'ident' ? expr[1] : noVal;
};

export const getNumber = function (expr, options) {
  let noVal;
  if (typeof options === 'object') {
    noVal = options.noVal;
  } else {
    noVal = options;
    options = {};
  }
  if (!expr) {
    return noVal;
  }
  if (expr[0] === 'number') {
    return expr[1];
  }
  const core = options.core;
  const frame = options.frame;
  if (expr[0] === 'ident' && core && frame) {
    const decl = frame.get('localMap').get(expr[1]);
    if (decl && decl.type.kind === 'builtin') {
      const value = C.readValue(core, decl.ref);
      if (value) {
        return value.toInteger();
      }
    }
  }
  return noVal;
};

export const getList = function (expr, noVal) {
  if (!expr) {
    return noVal;
  }
  return expr[0] === 'list' ? expr[1] : noVal;
};

export function ShowVar (props) {
  const {Frame, directive, controls, frames, context} = props;
  const {byPos} = directive;
  const name = getIdent(byPos[0]);
  const frame = frames[0];
  const localMap = frame.get('localMap');
  if (!localMap.has(name)) {
    return <p>{name}{" not in scope"}</p>;
  }
  const {type, ref} = localMap.get(name);
  const limits = {scalars: 0, maxScalars: 100};
  const value = readValue(context, C.pointerType(type), ref.address, limits);
  return (
    <Frame {...props}>
      <VarDecl name={name} type={type} address={ref.address} value={value} />
    </Frame>
  );
}

const computeArrowPoints = function (p, headSize, tailSize) {
  const dx1 = headSize;
  const dy1 = headSize;
  const dx2 = headSize / 5;
  const dy2 = tailSize;
  return [p(0,0), p(-dx1,dy1), p(-dx2,dy1), p(-dx2,dy2), p(dx2,dy2), p(dx2,dy1), p(dx1,dy1), p(0,0)].join(' ');
};
const arrowDirFunc = {
  up:    (dx,dy) => `${+dx},${+dy}`,
  down:  (dx,dy) => `${+dx},${-dy}`,
  left:  (dx,dy) => `${+dy},${+dx}`,
  right: (dx,dy) => `${-dy},${+dx}`
};
export const renderArrow = function (x, y, dir, headSize, tailSize, style) {
  const ps = computeArrowPoints(arrowDirFunc[dir], headSize, tailSize);
  return <polygon points={ps} transform={`translate(${x},${y})`} {...style} />;
};

export const highlightColors = [
  {fg: '#2196F3', bg: '#BBDEFB', name: 'blue'},
  {fg: '#4CAF50', bg: '#C8E6C9', name: 'green'},
  {fg: '#F44336', bg: '#FFCDD2', name: 'red'},
  {fg: '#00BCD4', bg: '#B2EBF2', name: 'cyan'},
  {fg: '#FFEB3B', bg: '#FFF9C4', name: 'yellow'},
  {fg: '#9C27B0', bg: '#E1BEE7', name: 'purple'},
  {fg: '#FF9800', bg: '#FFE0B2', name: 'orange'},
  {fg: '#9E9E9E', bg: '#F5F5F5', name: 'grey'},
  {fg: '#03A9F4', bg: '#B3E5FC', name: 'light blue'},
  {fg: '#8BC34A', bg: '#DCEDC8', name: 'light green'},
  {fg: '#E91E63', bg: '#F8BBD0', name: 'pink'},
  {fg: '#009688', bg: '#B2DFDB', name: 'teal'},
  {fg: '#FFC107', bg: '#FFECB3', name: 'amber'},
  {fg: '#673AB7', bg: '#D1C4E9', name: 'deep purple'},
  {fg: '#FF5722', bg: '#FFCCBC', name: 'deep orange'},
  {fg: '#607D8B', bg: '#CFD8DC', name: 'blue grey'},
  {fg: '#795548', bg: '#D7CCC8', name: 'brown'},
  {fg: '#CDDC39', bg: '#F0F4C3', name: 'lime'},
  {fg: '#3F51B5', bg: '#C5CAE9', name: 'indigo'}
];

export const noColor = {fg: '#777777', bg: '#F0F0F0', name: 'light gray'};
