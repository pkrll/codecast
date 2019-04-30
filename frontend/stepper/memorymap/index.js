import React from 'react';
import classnames from 'classnames';
import Immutable from 'immutable';
import DetailedGraph from './components/detailedgraph';
/**
 * The Memory Map component draws the contents of the memory.
 *
 * This component is regarded as a "directive", though it is still separated from
 * the already existing directives.
 *
 * To activate memory map, use the showGraph directive ( //!showGraph() ).
 *
 * There are currently only one detail level available, which can be chosen
 * by passing detailLevel=1 as an argument to the directive.
 */
export default function (bundle, deps) {

	bundle.defineAction('memoryChanged', 'memoryChanged');
	bundle.defineAction('memoryMapZoom', 'memoryMapZoom');
	bundle.addReducer('memoryChanged', memoryChanged);
	bundle.addReducer('memoryMapZoom', memoryMapZoom);
	bundle.use('stepperViewControlsChanged', 'getStepperDisplay');

	function MemoryMapSelector (state, props) {
		const stepperState = deps.getStepperDisplay(state);
		return {state: stepperState};
	}

	bundle.defineView('MemoryMap', MemoryMapSelector, class MemoryMap extends React.Component {
		/**
		 * Updates the memoryContent structure in the store.
		 *
		 * @param  {Object} payload  The new memoryContent object.
		 */
		updateMemoryContent = (payload) => {
			this.props.dispatch({type: "memoryChanged", payload});
		};

    zoom = zoom => {
      if (zoom < 1) zoom = 1;
      this.props.dispatch({type: deps.stepperViewControlsChanged, key: 'view1', update: {zoom}});
    };

    shouldComponentUpdate(nextProps) {
      return true;
    }

		render () {
			const { state } = this.props;
			if (!state) return false;

			const { core, oldCore, memoryGraph, directives, controls, analysis } = state;
			const { ordered }  = directives;
      const maxAddress   = core.memory.size - 1;
			const startAddress = 0;
			const context      = { core, oldCore, memoryGraph, analysis, maxAddress, startAddress };

			let components = [];
			// This component is displayed only when the directive showGraph is active.
			for (let directive of ordered) {
				const {key, kind} = directive;
				const dirControls = controls.get(key, Immutable.Map());
        const zoom = dirControls.get('zoom', 1);
				const hide = dirControls.get('hide', false);

				if (kind == "showGraph" && hide == false) {
					const detailLevel = (directive.byName.detail)
					? directive.byName.detail[1]
					: 1;

					if (detailLevel >= 1) {
						components.push(<DetailedGraph key={key} context={context} scale={zoom} onZoom={this.zoom}/>);
					} else {
						// TODO: Others??
					}
				}
			}

			return (<div>{components}</div>);
		};

	});
};
/**
 * Updates the state and sets the new memoryContents structure.
 *
 * @param  {Object} state  The current state
 * @param  {Object} action The action.
 * @return {Object}        The new state
 */
function memoryChanged(state, action) {
	const { payload } = action;
	return state.updateIn(['stepper', 'current'], function(stepperState) {
		stepperState.memoryGraph = payload;
		return stepperState;
	});
}

function memoryMapZoom(state, action) {
  const { payload } = action;

  return state.updateIn(['stepper', 'current'], function(stepperState) {


    stepperState.memoryGraph.zoom = zoom;

    return stepperState;
  });
}
