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
        <text y={previousSize + 15} x={Dimensions.X} fontSize='12px' fontWeight='bold' fill='grey'>
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
  const fieldNameY = offsetTop + 15;
  const contentY = offsetTop + 30;
  const content = getValueOf(memory.values[field.address]);
  const transformation = "";//"translate("+(Dimensions.X * scale)+" "+(offsetTop)+") scale("+scale+" " + scale +") translate("+(-Dimensions.X * scale)+" "+(-offsetTop)+")";

  return (
    <g>
      <rect y={offsetTop} x={Dimensions.X} width={width} height={height} stroke="blue" transform={transformation}></rect>
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
