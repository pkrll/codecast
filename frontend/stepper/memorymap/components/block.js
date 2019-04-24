import React from 'react';
import { getType, getValueOf, Dimensions } from '../helpers';

class Block extends React.Component {
  shouldComponentUpdate(nextProps) {
    return true;
  }

  render() {
    const { memory, block } = this.props;

    let content = [];
    let previousSize = 0;

    if (block.fields) {
      content = block.fields.map((field, i) => {
        const offsetTop = previousSize;
        previousSize += field.size * Dimensions.HEIGHT;
        return (<Field key={i} field={field} offsetTop={offsetTop} memory={memory} />)
      });
    } else {
      console.log("Error: Fields missing");
    }

    return (
      <g fill="white" opacity={block.free ? '0.5': '1'}>
        <text y={previousSize + 15} x={Dimensions.X} fontSize='12px' fontWeight='bold' fill='grey'>
          {block.type.name}
        </text>
        {content}
      </g>
    );
  }
}

function Field({memory, field, offsetTop}) {
  const height = field.size * Dimensions.HEIGHT;
  const fieldNameY = offsetTop + 15;
  const contentY = offsetTop + 30;
  const content = getValueOf(memory.values[field.address]);

  return (
    <g>
      <rect y={offsetTop} x={Dimensions.X} width="60" height={height} stroke="blue"></rect>
      <text y={fieldNameY} x={Dimensions.X} fontSize='12px' fontWeight='bold' fill='crimson'>
        {field.name}
      </text>
      <text y={contentY} x={Dimensions.X} dominantBaseline="middle" fontSize='15px' fill='black'>
        {content}
      </text>
    </g>
  );
}

export default Block;
