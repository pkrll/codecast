import React from 'react';
import { Dimensions } from '../helpers';

import './../../../style.scss';

class Line extends React.PureComponent {
  render() {
    const {fromAddress, toAddress, startAddress} = this.props;

    const startY = (fromAddress - startAddress) * Dimensions.HEIGHT + 5;
    const finalY = (toAddress - startAddress) * Dimensions.HEIGHT;

    const startX = Dimensions.X + Dimensions.WIDTH;
    const finalX = Dimensions.X + Dimensions.WIDTH + 100;

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
