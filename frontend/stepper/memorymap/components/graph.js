import React from 'react';
import * as C from 'persistent-c';
import Blocks from './blocks';
import Frames from './frames';
import Lines from './lines';

import './../../../style.scss';

class Graph extends React.PureComponent {

  render() {
		const { context, scale, height } = this.props;
    const { heap, stack, data } = context.memoryGraph;
    const heapStart = context.core.heapStart;
    let positions = {};

    return (
      <svg ref='svgRef' width="100%" height="100%" aria-labelledby="title desc">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" fill="black" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker>
        </defs>
        <svg y={10}>
          <g>
            <text y={10 * scale + 5} x="10" style={{fontSize: 15 * scale + `px`}} fontWeight='bold' fill='grey'>stack</text>
            <text y={10 * scale + 5} x="200" style={{fontSize: 15 * scale + `px`}} fontWeight='bold' fill='grey'>heap</text>
            <line x1="175" x2="175" y1="0" y2="100%" stroke="grey" strokeWidth="1" style={{opacity: 0.5}}/>
          </g>
        </svg>
        <Frames stack={stack} positions={positions} />
        <Blocks heap={heap} heapStart={heapStart} positions={positions} />
        <Lines heap={heap} stack={stack} positions={positions} />
      </svg>
    )

	}
}

export default Graph;
