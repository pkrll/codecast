import React from 'react';
import HeapGraph from './heapgraph';
import classnames from 'classnames';

export default function (bundle, deps) {

  bundle.defineAction('memoryChanged', 'memoryChanged');
  bundle.addReducer('memoryChanged', memoryChanged);
  // bundle.use('stepperProgress');
  bundle.use('stepperViewControlsChanged', 'getStepperDisplay');

  function MemoryMapSelector (state, props) {
    const getMessage = state.get('getMessage');
    const stepperState = deps.getStepperDisplay(state);
    return {state: stepperState, getMessage};
  }

  bundle.defineView('MemoryMap', MemoryMapSelector, class MemoryMap extends React.PureComponent {
    updateMemoryContent = payload => {
      this.props.dispatch({type: "memoryChanged", payload});
    };

    render () {
      const { state } = this.props;
      if (!state) return false;

      const { core, oldCore, memoryContents } = state;

      const context      = { core, oldCore, memoryContents };
      const maxAddress   = core.memory.size - 1;
      const startAddress = 0;

      return (
        <div>
          <HeapGraph context={context} startAddress={startAddress} maxAddress={maxAddress}/>
        </div>
      );
    };

  });
};

function memoryChanged(state, action) {
  const { payload } = action;
  return state.updateIn(['stepper', 'current'], function(stepperState) {
    let { memoryContents } = stepperState;

    Object.keys(payload.blocks).map((key, index) => {
      memoryContents.blocks[key] = payload.blocks[key];
    });

    Object.keys(payload.fields).map((key, index) => {
      memoryContents.fields[key] = payload.fields[key];
    });

    Object.keys(payload.values).map((key, index) => {
      memoryContents.values[key] = payload.values[key];
    });

    stepperState.memoryContents = memoryContents;

    return stepperState;
  });
}
