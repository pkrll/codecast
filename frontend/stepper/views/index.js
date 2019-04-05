
import MainBundle from './main';
import StackBundle from './stack';
import DirectivesBundle from './directives';
import MemoryGraphBundle from './memorygraph';

export default function (bundle) {
  bundle.include(MainBundle);
  bundle.include(StackBundle);
  bundle.include(DirectivesBundle);
  bundle.include(MemoryGraphBundle);
};
