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
	bundle.addReducer('memoryChanged', memoryChanged);
	bundle.use('stepperViewControlsChanged', 'getStepperDisplay');

	function MemoryMapSelector (state, props) {
		const stepperState = deps.getStepperDisplay(state);
		return {state: stepperState};
	}

	bundle.defineView('MemoryMap', MemoryMapSelector, class MemoryMap extends React.PureComponent {
		/**
		 * Updates the memoryContent structure in the store.
		 *
		 * @param  {Object} payload  The new memoryContent object.
		 */
		updateMemoryContent = payload => {
			this.props.dispatch({type: "memoryChanged", payload});
		};

		render () {
			const { state } = this.props;
			if (!state) return false;

			const { core, oldCore, memoryContents, directives, controls } = state;
			const { ordered }  = directives;
			const context      = { core, oldCore, memoryContents };
			const maxAddress   = core.memory.size - 1;
			const startAddress = 0;

			let components = [];
			// This component is displayed only when the directive showGraph is active.
			for (let directive of ordered) {
				const {key, kind} = directive;
				const dirControls = controls.get(key, Immutable.Map());
				const hide = dirControls.get('hide', false);

				if (kind == "showGraph" && hide == false) {
					const detailLevel = (directive.byName.detail)
					? directive.byName.detail[1]
					: 1;

					if (detailLevel >= 1) {
						components.push(<DetailedGraph key={key} context={context} startAddress={startAddress} maxAddress={maxAddress}/>);
					} else {
						components.push(<div key={key}>Hello World!</div>);
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
		let { memoryContents } = stepperState;

		// Object.keys(payload.blocks).map((key, _) => {
		// 	memoryContents.blocks[key] = payload.blocks[key];
		// });
    //
		// Object.keys(payload.fields).map((key, _) => {
		// 	memoryContents.fields[key] = payload.fields[key];
		// });
    //
		// Object.keys(payload.values).map((key, _) => {
		// 	memoryContents.values[key] = payload.values[key];
		// });

		stepperState.memoryContents = payload;

		return stepperState;
	});
}
