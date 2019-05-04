import React from 'react';
import { Properties, getTypeOf, getValueOf, buildPosition } from '../helpers';
import { Types } from '../memorycontent';

class Data extends React.PureComponent {
	render() {
		const { data, positions } = this.props;
		const props = { literals: data.literals, positions };

		return (<StringLiterals {...props} />);
	}
}

class StringLiterals extends React.PureComponent {
	render() {
		const { literals, positions } = this.props;

		let previousBottom = Properties.DATA.OFFSETY;

		const elements = Object.keys(literals).map((key, index) => {
			const literal = literals[key];
			const offsetTop = previousBottom;
			previousBottom += Properties.DATA.HEIGHT;

			positions[key] = buildPosition(
				Properties.DATA.OFFSETX - 10, offsetTop + 10,
				Properties.DATA.WIDTH, Properties.DATA.HEIGHT
			);

			const props = { literal, offsetTop };

			return (<StringLiteral key={key} {...props} />);
		});

		return elements;
	}
}

class StringLiteral extends React.PureComponent {
	render() {
		const { literal, offsetTop } = this.props;

		return (
			<svg y={offsetTop} x={Properties.DATA.OFFSETX}>
				<text y={15} className="frameName">{literal.value}</text>
			</svg>
		);
	}
}

export default Data;
