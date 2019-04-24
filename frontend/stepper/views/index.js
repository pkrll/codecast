
import MainBundle from './main';
import StackBundle from './stack';
import DirectivesBundle from './directives';
import MemoryMapBundle from '../memorymap';

export default function (bundle) {
  bundle.include(MainBundle);
  bundle.include(StackBundle);
  bundle.include(DirectivesBundle);
  bundle.include(MemoryMapBundle);
};
