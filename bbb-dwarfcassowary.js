import {default as ClBasicSimplexSolver} from '../dwarfcassowary.js/dwarfcassowary.js';
import ConstraintInterpreter from './constraintinterpreter.js';


// Babelsberg required interface
// addConstraint, removeConstraint

export default class ClSimplexSolver extends ClBasicSimplexSolver {
  always(opts, func) {
      var ctx = opts.ctx,
          priority = this.strength[opts.priority];
      func.varMapping = ctx;
      var constraint = ConstraintInterpreter.newConstraint(func, this);
      constraint.priority = priority;
      return constraint;
  }
}

ClSimplexSolver.prototype.weight = 100;
