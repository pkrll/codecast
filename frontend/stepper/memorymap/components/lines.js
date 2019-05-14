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

		const source = positions[sourceAddress];
    const target = positions[targetAddress];

		let d = "";

		if (source.in.x == target.in.x || source.in.y == target.in.y) {
			const startX = dimensions.OFFSETX + dimensions.WIDTH;
			const startY = source.out.y;
			const finalX = dimensions.OFFSETX + dimensions.WIDTH
			             + Math.abs(100 - Math.abs(sourceAddress - targetAddress));
			const finalY = target.in.y;
			d = " M " + startX + "," + startY
			  + " C " + finalX + "," + startY
			  + "   " + finalX + "," + finalY
				+ "   " + startX + "," + finalY;
		} else {
			const startX = (source.in.x > target.in.x) ? source.out.x : source.out.x + source.out.width;
			const startY = source.out.y;
			const finalY = target.in.y;
	    const finalX = target.in.x;
			d = " M " + startX + "," + startY
			  + " L " + finalX + "," + finalY;
		}

		return (<path className="pointerArrow" d={d} />);
	}
}

export default Lines;
