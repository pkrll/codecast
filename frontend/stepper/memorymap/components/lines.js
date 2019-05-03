import React from 'react';
import { PointerType } from '../memorycontent';

class Lines extends React.PureComponent {
	render() {
		const { heap, stack, positions } = this.props;
		let values = [];

	  Object.keys(heap.values).forEach((key, index) => values.push(heap.values[key]));
	  Object.keys(stack.values).forEach((key, index) => values.push(stack.values[key]));

		const elements = values.map((cell, index) => {
			if (cell.constructor.name !== PointerType.name) return;
			const sourceAddress = cell.address;
			const targetAddress = cell.value;

			if (positions[sourceAddress] && positions[targetAddress]) {
				const props = {sourceAddress, targetAddress, positions};
				return (<Line key={index} {...props}/>);
			}
		});

		return elements;
	}
}

class Line extends React.PureComponent {
	render() {
		const { sourceAddress, targetAddress, positions } = this.props;

		const source = positions[sourceAddress];
    const target = positions[targetAddress];
    const startY = source.y;
    const finalY = target.y;
    const startX = source.x;
    const finalX = target.x;

		const d = " M " + startX + "," + startY
						+ " L " + finalX + "," + finalY;

		return (<path className="pointerArrow" d={d} />);
	}
}

export default Lines;
