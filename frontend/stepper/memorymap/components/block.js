import React from 'react';
import { getValueOf, Dimensions } from '../helpers';

class Block extends React.PureComponent {
  render() {
    const { memory, variable } = this.props;
    const isFreed = (variable.free) ? "Free'd" : "Allocated";

    let content = [];
    let previousSize = 0;
    if (variable.fields) {
      content = variable.fields.map((field, i) => {
        const offsetTop = previousSize;
        previousSize += field.size * Dimensions.HEIGHT;
        return (<Field key={i} field={field} offsetTop={offsetTop} memory={memory} />)
      });
    } else {
      console.log("Error: Fields missing");
    }

    return (
      <g fill="white">
        <text y={previousSize + 10} x={Dimensions.X} fontSize='12px' fontWeight='bold' fill='grey'>
          {variable.type.name}
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
