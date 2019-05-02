import React from 'react';
import { Dimensions } from '../helpers';

import './../../../style.scss';

class Line extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      component: null
    };
  }
  componentDidMount() {
    this.setState({component: this.drawLine()});
  }
  render() {
    if (this.state.component) return this.state.component;
    return null;
  }

  drawLine() {
    const {fromAddress, toAddress, index, scale, refs } = this.props;
    const offset = refs["svgRef"].getBoundingClientRect();
    const source = refs[fromAddress].current.getBoundingClientRect();
    const target = refs[toAddress].current.getBoundingClientRect();
    const startY = source.y - offset.y;
    const finalY = target.y - offset.y;
    const startX = (index % 2)
                 ? Dimensions.X + (Dimensions.WIDTH * scale)
                 : Dimensions.X;
    const finalX = (index % 2)
                 ? Dimensions.X + (Dimensions.WIDTH * scale) + 100 + Math.abs(fromAddress - toAddress)
                 : Dimensions.X - 100 - Math.abs(fromAddress - toAddress);

    const d = " M " + startX + "," + startY
            + " C " + finalX + "," + startY
            + "   " + finalX + "," + finalY
            + "   " + startX + "," + finalY;

    return (
        <path className="pointerArrow" pointerEvents="visiblePoint" d={d} markerEnd="url(#arrow)"/>
    );
  };
}

export default Line;
