import {default as PlainRelax, RelaxNode} from '../relax/relax.js';
import ConstraintInterpreter from './constraintinterpreter.js';

import {newUUID} from './util.js';

// Babelsberg required interface
// addConstraint, removeConstraint

export default class Relax extends PlainRelax {
  always(opts, func) {
      if (opts.priority) {
          throw 'soft constraints not implemented for relax';
      }
      func.varMapping = opts.ctx;
      var constraint = ConstraintInterpreter.newConstraint(func, this);
      this.addConstraint(constraint.constraintobjects[0]);
      //this.solve();
      return constraint;
  }
  
  constraintVariableFor(value, ivarname) {
      if ((typeof(value) == 'number') ||
              (value === null) ||
              (value instanceof Number)) {
          var name = ivarname + ':' + newUUID();
          var v = new RelaxNode('vars[\"' + name + '\"]', [name], this);
          this.addVar(name, value);
          return v;
      } else {
          return null;
      }
  }
}
