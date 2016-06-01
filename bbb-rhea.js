import CassowaryRhea from '../rhea/rhea.js'

export default class SimplexSolver extends CassowaryRhea {
  constructor() {
    super("/lively4/rhea/rhea.emscripten.js")
  }

  get weight() { return 1000 }

  constraintVariableFor(value, ivarname) {
      if ((typeof(value) == 'number') ||
          (value === null) ||
          (value instanceof Number)) {
          var v = new this.Variable(value + 0 /* coerce back into primitive */);
          v.solver = this;
          v.stay();
          return v;
      } else {
          return null;
      }
  }

  always(opts, func) {
      var ctx = opts.ctx,
          priority = 0//this.strength[opts.priority];
      func.varMapping = ctx;
      var constraint = new Constraint(func, this);
      // constraint.priority = priority;
      return constraint;
  }
}
