import React from 'react';
import { getTypeName, getValueOf, buildPosition, Properties } from '../helpers';
import { Types } from '../memorycontent';

class Circles extends React.PureComponent {
	render() {
		const { heap, heapStart, positions } = this.props;
		const blocks = Object.keys(heap.allocatedBlocks);
		const values = heap.values;

		const positionY = Properties.CIRCLES.OFFSETX;
		const radius = Properties.CIRCLES.RADIUS;
		// For offset purposes
		let previousX = Properties.CIRCLES.OFFSETX;

		const elements = blocks.map((key, index) => {
			const block = heap.allocatedBlocks[key];
			const positionX = previousX;
			previousX += 150;

			block.fields.map((field, index) => {
				const position = buildPosition(positionX, positionY, radius, radius);
				positions[field.address] = { out: position, in: position };
			});

			const opacity  = (block.free) ? 0.5 : 1;
			const typeName = getTypeName(block.type);
			const labelX = positionX - getTextWidth(typeName) + 15;
			return (
				<g key={key}>
				<text x={labelX} y={10} className="blockTypeLabel">
					{typeName}
				</text>
				<circle style={{opacity}} cx={positionX} cy={positionY} r={radius} className="blockCircle"/>
				</g>
			)
		});

		return elements;
	}
}

function getTextWidth(text, font) {
    // re-use canvas object for better performance
    var canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"));
    var context = canvas.getContext("2d");
    // context.font = font;
    var metrics = context.measureText(text);
    return metrics.width;
}

export default Circles;
