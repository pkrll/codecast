import React from 'react';
import { getType, getValueOf, Dimensions } from '../helpers';

class StackFrame extends React.PureComponent {
	render() {
		const { frame, previousSize } = this.props;
		const positionY = previousSize * 30 + 10;
		const stackHeight = 30;

 		return (
			<g>
				<text y={positionY} x="5" style={{fontSize: `15px`, fontWeight: `bold`}}>
					{frame.name}
				</text>
				<svg y={positionY + 5}>
					<Variable frame={frame} />
				</svg>
			</g>
		)
	}
}

class Variable extends React.PureComponent {
	render() {
		const { frame } = this.props;
		const stackHeight = 30;

		let index = 0;

 		const uninitialized = Object.keys(frame.uninitialized).map((key, i) => {
			const variable = frame.uninitialized[key];
			const y = index * stackHeight;
			index += 1;

			return (
				<svg key={i} y={y}>
					<rect width="175" height="30" stroke="blue" fill="none"/>
					<text y="20" x="5" style={{fontSize: `15px`}}>{variable.name}</text>
				</svg>
			)
		});

		const initialized = Object.keys(frame.variables).map((key, i) => {
		 	const variable = frame.variables[key];
		 	const y = index * stackHeight;
		 	index += 1;

		 	return (
		 		<svg key={i} y={y}>
		 			<rect width="175" height="30" stroke="blue" fill="none"/>
		 			<text y="20" x="5" style={{fontSize: `15px`}}>{variable.name}</text>
		 		</svg>
		 	)
	 });

		return (<g>{uninitialized}{initialized}</g>);
	}
}

export default StackFrame;
