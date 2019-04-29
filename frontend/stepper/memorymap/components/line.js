import React from 'react';
import { Dimensions } from '../helpers';

import './../../../style.scss';

class Line extends React.PureComponent {
  render() {
    const {fromAddress, toAddress, startAddress, index, scale, offset} = this.props;

    const startY = (fromAddress - startAddress) * Dimensions.HEIGHT * scale + 5;
    const finalY = (toAddress - startAddress) * Dimensions.HEIGHT * scale - Dimensions.HEIGHT * 2;

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
