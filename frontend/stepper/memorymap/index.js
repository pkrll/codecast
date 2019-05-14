import React from 'react';
import classnames from 'classnames';
import {Button, ButtonGroup} from '@blueprintjs/core';
import Immutable from 'immutable';
import DetailedGraph from './components/detailedgraph';
import Graph from './components/graph';
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

	bundle.use('stepperViewControlsChanged', 'getStepperDisplay');

	function MemoryMapSelector (state, props) {
		const stepperState = deps.getStepperDisplay(state);
		return {state: stepperState};
	}

	bundle.defineView('MemoryMap', MemoryMapSelector, class MemoryMap extends React.Component {

    setDetail = detailLevel => {
      this.props.dispatch({type: deps.stepperViewControlsChanged, key: 'view1', update: {detailLevel}});
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

			let component = "";
			// This component is displayed only when the directive showGraph is active.
			for (let directive of ordered) {
				const {key, kind} = directive;
				const dirControls = controls.get(key, Immutable.Map());
        const detailLevel = dirControls.get('detailLevel', 1);
				const hide = dirControls.get('hide', false);

				if (kind == "showGraph" && hide == false) {
          const props = { context, setDetail: this.setDetail };

					if (detailLevel >= 1) {
						component = (<DetailedGraph key={key} {...props}/>);
					} else {
            component = (<Graph key={key} {...props}/>);
					}
				}
			}

      if (component == "") return null;

			return (
        <div style={{background: `rgb(240, 240, 240)`, width: `100%`, height: `auto`, overflowX: `auto`}}>
          <div>
            <ButtonGroup>
              <Button small icon='minimize' onClick={() => this.setDetail(0)} />
              <Button small icon='maximize' onClick={() => this.setDetail(1)}/>
            </ButtonGroup>
          </div>
          {component}
        </div>
      );
		};

	});
};
