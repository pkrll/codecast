import React from 'react';
import * as C from 'persistent-c';
import { getNumber, readValue } from './utils';

const types = {
  BUILTIN: "builtin",
  POINTER: "pointer",
  SCALAR: "scalar",
  RECORD: "record"
};

class MemoryGraph extends React.PureComponent {

	render() {
		const { localMap, directive, context, centerAddress, startAddress, maxAddress, nBytesShown } = this.props;
    const variables = {};
		return (
			<div>
				<Graph variables={variables}/>
			</div>
		);
	}
}

function Graph({variables}) {

  return (
    <div>
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

function MemoryGraphSelector ({scale, directive, context, controls, frames}) {
  const localMap = frames[0].get('localMap');
	const {byName, byPos} = directive;
	const nBytesShown = getNumber(byName.bytes, 32);
	const maxAddress = context.core.memory.size - 1;
	let centerAddress = controls.get('centerAddress');
  if (centerAddress === undefined) {
    centerAddress = clipCenterAddress({nBytesShown, context}, getNumber(byName.start, nBytesShown / 2));
  }
  const startAddress = centerAddress - nBytesShown / 2;
	return {
		localMap, directive, context, centerAddress, startAddress, maxAddress, nBytesShown
	}
}

export default {View: MemoryGraph, selector: MemoryGraphSelector};
