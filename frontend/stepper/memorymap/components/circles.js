import React from 'react';
import { getValueOf, buildPosition, Properties } from '../helpers';
import { Types } from '../memorycontent';

class Circles extends React.PureComponent {
	render() {
		const { heap, heapStart, positions } = this.props;
		const blocks = Object.keys(heap.allocatedBlocks);
		const values = heap.values;

		const positionY = 75;
		const radius = 50;
		// For offset purposes
		let previousX = 75;

		const elements = blocks.map((key, index) => {
			const block = heap.allocatedBlocks[key];
			const positionX = previousX;
			previousX += 150;

			block.fields.map((field, index) => {
				const position = buildPosition(positionX, positionY, radius, radius);
				positions[field.address] = { out: position, in: position };
			});

			const opacity = (block.free) ? 0.5 : 1;

			return (<circle key={key} style={{opacity}} cx={positionX} cy={positionY} r={radius} className="blockCircle"/>)
		});

		return elements;
	}
}


export default Circles;
