import React from 'react';
import { Properties, getTypeOf, getValueOf, buildPosition } from '../helpers';
import { Types } from '../memorycontent';

class Frames extends React.PureComponent {
	render() {
		const { stack, positions } = this.props;
		const values = stack.values;

		let previousBottom = Properties.FRAMES.OFFSETY;

		const frames = stack.frames.map((frame, index) => {
			const offsetTop = previousBottom;
			previousBottom += frame.numberOfVariables * Properties.FRAMES.HEIGHT + Properties.FRAMES.OFFSETY;

			const props = { frame, values, offsetTop, positions };

			return (<StackFrame key={frame.name} {...props} />)
		});

		return frames;
	}
}

class StackFrame extends React.PureComponent {
	render() {
		const { frame, values, offsetTop, positions } = this.props;
		const props = { frame, values, positions, frameOffsetTop: offsetTop };

		return (
			<svg y={offsetTop}>
				<g>
					<text y={15} x={Properties.FRAMES.OFFSETX} className="frameName">
						{frame.name}
					</text>
					<StackVariables {...props} />
				</g>
			</svg>
		);
	}
}

class StackVariables extends React.PureComponent {
	render() {
		const { frame, values, positions, frameOffsetTop } = this.props;

		let index = 0;

		const uninitialized = Object.keys(frame.uninitialized).map((key, _) => {
			const variable  = frame.uninitialized[key];
			const offsetTop = index * Properties.FRAMES.HEIGHT + 20;
			const props = { variable, values, offsetTop }
			index += 1;

			return (
				<StackVariable key={index} {...props}/>
			);
		});

		const initialized = Object.keys(frame.variables).map((key, _) => {
			const variable  = frame.variables[key];
			const offsetTop = index * Properties.FRAMES.HEIGHT + 20;
			const props = { variable, values, offsetTop }
			index += 1;

			positions[variable.address] = {
				out: buildPosition(
					Properties.FRAMES.OFFSETX,
					offsetTop + frameOffsetTop + (Properties.FRAMES.HEIGHT / 2),
					Properties.FRAMES.WIDTH, Properties.FRAMES.HEIGHT
				),
				in: buildPosition(
					Properties.FRAMES.OFFSETX + Properties.FRAMES.WIDTH,
					offsetTop + frameOffsetTop + (Properties.FRAMES.HEIGHT / 2),
					Properties.FRAMES.WIDTH, Properties.FRAMES.HEIGHT
				),
			};

			return (
				<StackVariable key={index} {...props}/>
			);
		});

		return (
			<g>
				{uninitialized}
				{initialized}
			</g>
		);
	}
}

class StackVariable extends React.PureComponent {
	render() {
		const { variable, values, offsetTop } = this.props;
		const value = getValueOf(values[variable.address]);
		const type  = getTypeOf(variable);
		const name  = type.prefix + variable.name + type.suffix;

		return (
			<g>
				<rect y={offsetTop} width={Properties.FRAMES.WIDTH} height={Properties.FRAMES.HEIGHT} className="stackVariable" />
				<text y={offsetTop + 20} x={Properties.FRAMES.OFFSETX}>{name} = {value}</text>
			</g>
		);
	}
}

export default Frames;
