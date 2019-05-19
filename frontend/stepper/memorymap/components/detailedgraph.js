import React from 'react';
import {Button, ButtonGroup} from '@blueprintjs/core';
import { Properties } from '../helpers.js';
import Blocks from './blocks';
import Frames from './frames';
import Lines from './lines';
import Data from './data';

import './../../../style.scss';

class DetailedGraph extends React.PureComponent {

  render() {
    const { context } = this.props;
    const { heap, stack, data } = context.memoryMap;
    const heapStart = context.core.heapStart;

    const stackHeight = stack.height * Properties.FRAMES.HEIGHT
                      + stack.frames.length * Properties.FRAMES.OFFSETY + 100;
    const heapHeight  = heap.bytesAllocated * Properties.BLOCKS.HEIGHT  + 100;
    const dataHeight  = Object.keys(data.literals).length * Properties.DATA.HEIGHT
                      + Properties.DATA.OFFSETY;
    const height = Math.max(stackHeight, heapHeight, dataHeight);

    let positions = {};

    return (
        <svg ref='svgRef' width="100%" height={height} aria-labelledby="title desc">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" fill="black" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker>
            <marker id="arrow-hover" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" fill="red" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker>
          </defs>
          <svg y="10">
              <text y="15" x="10" height="10" style={{fontSize: `15px`}} fontWeight='bold' fill='grey'>stack</text>
              <text y="15" x="200" style={{fontSize: `15px`}} fontWeight='bold' fill='grey'>heap</text>
              <line x1="175" x2="175" y1="0" y2="100%" stroke="grey" strokeWidth="1" style={{opacity: 0.5}}/>
              <text y="15" x="655" style={{fontSize: `15px`}} fontWeight='bold' fill='grey'>data</text>
              <line x1="645" x2="645" y1="0" y2="100%" stroke="grey" strokeWidth="1" style={{opacity: 0.5}}/>
          </svg>
          <Frames stack={stack} positions={positions} />
          <Blocks heap={heap} heapStart={heapStart} positions={positions} />
          <Data data={data} positions={positions} />
          <Lines heap={heap} stack={stack} positions={positions} />
        </svg>
    )
  }
}

export default DetailedGraph;
