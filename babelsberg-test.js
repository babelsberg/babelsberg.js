import bbb, {ConstraintInterpreter} from './constraintinterpreter.js'
import * as acorn from './jsinterpreter/acorn.js'
import Interpreter from './jsinterpreter/interpreter.js'

import {assert} from '../lively4-core/node_modules/chai/chai.js'

describe("bbb", function() {
  it("should interpret", function() {
    var predicate = function () {
      return 23;
    }
    var i = new Interpreter(`var returnValue = (${predicate.toString()})();`);
    i.run();
    assert.equal(23, i.stateStack[0].scope.properties.returnValue)
  })
  
  it("should interpret constrained", function() {
    var predicate = function () {
      return 23;
    }
    var r = ConstraintInterpreter.runAndReturn(predicate.toString())
    assert.equal(23, r)
  })

  it("should solve a simple constraint", function() {
    var obj = {a: 2, b: 3};
        bbb.always({
            solver: new ClSimplexSolver(),
            ctx: {
                obj: obj
            }
        }, function() {
            return obj.a + obj.b == 3;
        });
        this.assert(obj.a + obj.b == 3, "Solver failed: " + obj.a + ", " + obj.b)
  })
})
