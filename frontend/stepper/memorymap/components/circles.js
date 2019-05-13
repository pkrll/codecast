import React from 'react';
import { getValueOf, buildPosition, Properties } from '../helpers';
import { Types } from '../memorycontent';

class Circles extends React.PureComponent {
	render() {
		const { heap, heapStart, positions } = this.props;
		const blocks = Object.keys(heap.allocatedBlocks);
		const values = heap.values;

		let previousX = 75;

		const elements = blocks.map((key, index) => {
			const block = heap.allocatedBlocks[key];
			const x = previousX;
			previousX += 150;

			block.fields.map((field, index) => {
				positions[field.address] = {
					out: buildPosition(
						x, 75, 50, 50
					),
					in: buildPosition(
						x, 75, 50, 50
					)
				};
			});

			const opacity = (block.free) ? 0.5 : 1;

			return (<circle key={key} style={{opacity}} cx={x} cy="75" r="50" stroke="blue" strokeWidth="3" fill="transparent"/>)
		});

		return elements;
	}
}


export default Circles;
