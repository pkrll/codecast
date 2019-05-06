import React from 'react';
import { Properties } from '../helpers';
import { PointerType } from '../memorycontent';

class Lines extends React.PureComponent {
	render() {
		const { heap, stack, positions } = this.props;
		let values = [];

	  Object.keys(heap.values).forEach((key, index) => values.push({
			cell: heap.values[key], dimensions: Properties.BLOCKS
		}));
	  Object.keys(stack.values).forEach((key, index) => values.push({
			cell: stack.values[key], dimensions: Properties.FRAMES
		}));

		const elements = values.map((value, index) => {
			if (value.cell.constructor.name !== PointerType.name) return;
			const sourceAddress = value.cell.address;
			const targetAddress = value.cell.value;

			if (positions[sourceAddress] && positions[targetAddress]) {
				const dimensions = value.dimensions;
				const props = {sourceAddress, targetAddress, positions, dimensions};
				return (<Line key={index} {...props}/>);
			}
		});

		return elements;
	}
}

class Line extends React.PureComponent {
	render() {
		const { sourceAddress, targetAddress, positions, dimensions } = this.props;

		const source = positions[sourceAddress].out;
    const target = positions[targetAddress].in;
		console.log(positions);
		let d = "";

		if (source.x == target.x || source.y == target.y) {
			const startX = dimensions.OFFSETX + dimensions.WIDTH;
			const startY = source.y;
			const finalX = dimensions.OFFSETX + dimensions.WIDTH
			             + 100 - Math.abs(sourceAddress - targetAddress);
			const finalY = target.y;
			d = " M " + startX + "," + startY
			  + " C " + finalX + "," + startY
			  + "   " + finalX + "," + finalY
				+ "   " + startX + "," + finalY;
		} else {
			const startX = (source.x > target.x) ? source.x : source.x + source.width;
			const startY = source.y;
			const finalY = target.y;
	    const finalX = target.x;
			d = " M " + startX + "," + startY
			  + " L " + finalX + "," + finalY;
		}

		return (<path className="pointerArrow" d={d} />);
	}
}

export default Lines;
