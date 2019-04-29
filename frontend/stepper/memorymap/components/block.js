import React from 'react';
import { getType, getValueOf, Dimensions } from '../helpers';

class Block extends React.Component {
  shouldComponentUpdate(nextProps) {
    return true;
  }

  render() {
    const { memory, block, scale } = this.props;

    let content = [];
    let previousSize = 0;
    const height = Dimensions.HEIGHT * scale;

    if (block.fields) {
      content = block.fields.map((field, i) => {
        const offsetTop = previousSize;
        previousSize += field.size * height;
        return (<Field key={i} field={field} offsetTop={offsetTop} memory={memory} scale={scale} />)
      });
    } else {
      console.log("Error: Fields missing");
    }

    return (
      <g fill="white" opacity={block.free ? '0.5': '1'}>
        <text y={previousSize + 15 * scale} style={{fontSize: 12 * scale + `px`}} fontWeight='bold' fill='grey'>
          {block.type.name}
        </text>
        {content}
      </g>
    );
  }
}

function Field({memory, field, offsetTop, scale}) {
  const height = field.size * Dimensions.HEIGHT * scale;
  const width = Dimensions.WIDTH * scale;
  const fieldNameY = offsetTop + 15 * scale;
  const contentY = offsetTop + 30 * scale;
  const content = getValueOf(memory.values[field.address]);

  return (
    <g>
      <rect y={offsetTop} width={width} height={height} stroke="blue"></rect>
      <text y={fieldNameY} style={{fontSize: 12 * scale + `px`}} fontWeight='bold' fill='crimson'>
        {field.name}
      </text>
      <text y={contentY} dominantBaseline="middle" style={{fontSize: 15 * scale + `px`}} fill='black'>
        {content}
      </text>
    </g>
  );
}

export default Block;
