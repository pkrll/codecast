import React from 'react';
import classnames from 'classnames';

export default function (bundle, deps) {

  bundle.use('stepperViewControlsChanged', 'getStepperDisplay');

  function MemoryGraphSelector (state, props) {
    const getMessage = state.get('getMessage');
    const stepperState = deps.getStepperDisplay(state);
    return {state: stepperState, getMessage};
  }

  bundle.defineView('MemoryGraph', MemoryGraphSelector, class MemoryGraph extends React.PureComponent {
    render () {
      return (
        <div className='directive-group'>
          Hello World!
        </div>
      );
    };

  });

};
