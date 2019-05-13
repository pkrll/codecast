import React from 'react';
import * as C from 'persistent-c';
import Circles from './circles';
import { PointerType } from '../memorycontent';

import './../../../style.scss';

class Graph extends React.PureComponent {

  render() {
		const { context } = this.props;
    const { heap, stack, data } = context.memoryGraph;
    const heapStart = context.core.heapStart;
    let positions = {};

    const height = "250px";

    return (
      <div style={{background: `rgb(240, 240, 240)`, width: `100%`, height: height}}>
        <svg ref='svgRef' width="100%" height="100%" aria-labelledby="title desc">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" fill="black" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker>
            <marker id="arrow-hover" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" fill="red" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker>
          </defs>
          <Circles heap={heap} positions={positions} />
          <Lines heap={heap} stack={stack} positions={positions} />
        </svg>
      </div>
    )

	}
}

class Lines extends React.PureComponent {
  render() {
    const { heap, stack, positions } = this.props;
		let values = Object.keys(heap.values);

		const elements = values.map((key, index) => {
      const value = heap.values[key];
			if (value.constructor.name !== PointerType.name) return;
			const sourceAddress = value.address;
			const targetAddress = value.value;

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

		let d = "";

    if (source.in.x == target.in.x) {
    } else if (source.in.x == (target.in.x - 150)) {
      const startX = source.out.x + source.out.width;
      const startY = source.out.y;
      const finalY = target.in.y;
      const finalX = target.in.x - target.in.width;
      d = " M " + startX + "," + startY
        + " L " + finalX + "," + finalY;
    } else if (source.in.x == (target.in.x + 150)) {
      const startX = source.in.x - source.in.width;
      const startY = source.in.y;
      const finalY = target.out.y;
      const finalX = target.out.x + target.out.width;
      d = " M " + startX + "," + startY
        + " L " + finalX + "," + finalY;
    } else {
      const startX = source.out.x;
      const startY = source.out.y + source.out.height;
      const middleY = startY + (100 - Math.abs(sourceAddress - targetAddress));
      const finalX = target.in.x;
      const finalY = target.in.y + source.out.height;
      d = " M " + startX + "," + startY
        + " C " + startX + "," + middleY
        + "   " + finalX + "," + middleY
        + "   " + finalX + "," + finalY;
    }

		return (<path className="pointerArrow" d={d} />);
	}
}

export default Graph;
