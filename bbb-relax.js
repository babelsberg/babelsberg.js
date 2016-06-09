import PlainRelax from '../relax/relax.js';
import Constraint from './constraint.js';


// Babelsberg required interface
// addConstraint, removeConstraint

export default class Relax extends PlainRelax {
  always(opts, func) {
      if (opts.priority) {
          throw 'soft constraints not implemented for relax';
      }
      func.varMapping = opts.ctx;
      var constraint = new Constraint(func, this);
      this.addConstraint(constraint.constraintobjects[0]);
      //this.solve();
      return constraint;
  }
  
  constraintVariableFor(value, ivarname) {
      if ((typeof(value) == 'number') ||
              (value === null) ||
              (value instanceof Number)) {
          var name = ivarname + ':' + Strings.newUUID();
          var v = new RelaxNode('vars[\"' + name + '\"]', [name], this);
          this.addVar(name, value);
          return v;
      } else {
          return null;
      }
  }
}
