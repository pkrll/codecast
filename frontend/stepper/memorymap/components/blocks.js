import React from 'react';
import { getValueOf, buildPosition, Properties } from '../helpers';

class Blocks extends React.PureComponent {
	render() {
		const { heap, heapStart, positions } = this.props;
		const blocks = Object.keys(heap.allocatedBlocks);
		const values = heap.values;

		let previousBottom = Properties.BLOCKS.OFFSETY;

		const elements = blocks.map((key, index) => {
			const block = heap.allocatedBlocks[key];
			const props = { values, block, positions, heapStart, previousBottom };
			previousBottom += block.size * Properties.BLOCKS.HEIGHT + Properties.BLOCKS.OFFSETY;

			return (<Block key={key} {...props}/>)
		});

		return elements;
	}
}

class Block extends React.PureComponent {
	render() {
		const { values, block, positions, heapStart } = this.props;
		const blockOffsetTop = this.props.previousBottom;
		// Used for the relative positions of the fields
		let previousBottom = 0;

		const fields = block.fields.map((field, index) => {
			const fieldOffsetTop = previousBottom;
			const props = { values, field, fieldOffsetTop, blockOffsetTop, positions };
			previousBottom += field.size * Properties.BLOCKS.HEIGHT;

			return (<Field key={field.address} {...props} />)
		});

		const blockTypeLabelOffset = previousBottom + 15;
		const opacity = (block.free) ? 0.5 : 1;
		return (
			<svg y={blockOffsetTop} x={Properties.BLOCKS.OFFSETX}>
				<g fill="white" style={{opacity}}>
					<text y={blockTypeLabelOffset} className="blockTypeLabel">
						{block.type.name}
					</text>
					{fields}
				</g>
			</svg>
		);
	}
}

class Field extends React.PureComponent {
	render() {
		const { values, field, fieldOffsetTop, blockOffsetTop, positions } = this.props;
		const height = field.size * Properties.BLOCKS.HEIGHT;
		const width  = Properties.BLOCKS.WIDTH;
		const nameOffset  = fieldOffsetTop + 15;
		const valueOffset = fieldOffsetTop + 30;
		const value = getValueOf(values[field.address]);

		positions[field.address] = buildPosition(
			fieldOffsetTop + blockOffsetTop, Properties.BLOCKS.OFFSETX, width, height
		);

		return (
			<g>
				<rect y={fieldOffsetTop} width={width} height={height} className="blockField" />
				<text y={nameOffset} className="blockFieldName">{field.name}</text>
				<text y={valueOffset} className="blockFieldValue">{value}</text>
			</g>
		);
	}
}

export default Blocks;
