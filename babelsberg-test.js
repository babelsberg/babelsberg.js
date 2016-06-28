import bbb from './babelsberg.js'
import ConstraintInterpreter from './constraintinterpreter.js'
import * as acorn from './jsinterpreter/acorn.js'
import Interpreter from './jsinterpreter/interpreter.js'
import Relax from './bbb-relax.js'
import ClSimplexSolver from './bbb-dwarfcassowary.js';

import {assert} from '../lively4-core/node_modules/chai/chai.js'

function pt(x, y) {
  return new Point(x, y)
}

class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  addPt(other) {
    return pt(this.x + other.x, this.y + other.y);
  }
  equals(other) {
    return this.x == other.x && this.y == other.y;
  }
  leqPt(other) {
    return this.x <= other.x && this.y <= other.y;
  }
}

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

  it("should interpret constrained a unary expression", function() {
    var predicate = function () {
      return -23;
    }
    var r = ConstraintInterpreter.runAndReturn(predicate.toString())
    assert.equal(-23, r)
  })

  it("should interpret constrained a binary expression", function() {
    var predicate = function () {
      return 2-23;
    }
    var r = ConstraintInterpreter.runAndReturn(predicate.toString())
    assert.equal(-21, r)
  })
  
  it("should interpret constrained a logical expression", function() {
    var predicate = function () {
      return true && false;
    }
    var r = ConstraintInterpreter.runAndReturn(predicate.toString())
    assert.equal(false, r)
  })
  
  it("should interpret constrained two logical expressions", function() {
    var predicate = function () {
      return true && false || true;
    }
    var r = ConstraintInterpreter.runAndReturn(predicate.toString())
    assert.equal(true, r)
  })

  xit("should interpret constrained a property access", function() {
    var predicate = function () {
      return window.nonexistingthing;
    }
    var r = ConstraintInterpreter.runAndReturn(predicate.toString())
    assert.equal(undefined, r)
  })

  xit("should interpret constrained a property access", function() {
    var foo = {x: 23};
    var predicate = function () {
      return foo.x;
    }
    var r = ConstraintInterpreter.runAndReturn(predicate.toString(), {foo: foo})
    assert.equal(foo.x, r)
    console.log(foo)
  })

  xit("should allow constrained access to important globals", function() {
    var predicate = function () {
      return [jQuery, $, _, lively];
    }
    var r = ConstraintInterpreter.runAndReturn(predicate.toString())
    assert.equal([jQuery, $, _, lively], r)
  })
  
  xit("should do simple things in constrainted mode", function() {
    var obj = {a: 2, b: 3};
    var predicate = function () {
      return obj.a + obj.b;
    }
    var r = ConstraintInterpreter.runAndReturn(predicate.toString(), {obj: obj})
    assert.equal(obj.a + obj.b, r)
  })

  it("should solve a simple constraint", function() {
    var obj = {a: 2, b: 3};
        bbb.always({
            solver: new Relax(),
            ctx: {
                obj: obj
            }
        }, function() {
            return obj.a + obj.b == 3;
        });
        assert(Math.round(obj.a + obj.b) == 3, "Solver failed: " + obj.a + ", " + obj.b)
  })
  
  it("should solve a simple constraint and keep it satisfied", function() {
    var obj = {a: 2, b: 3};
    bbb.always({
        solver: new Relax(),
        ctx: {
            obj: obj
        }
    }, function() {
        return obj.a + obj.b == 3;
    });
    assert(Math.round(obj.a + obj.b) == 3, "Solver failed: " + obj.a + ", " + obj.b);
    obj.a = 10;
    assert(Math.round(obj.a + obj.b) == 3, "Solver failed: " + obj.a + ", " + obj.b);
  })
  
  it('should Simple', function () {
        var obj = {a: 2, b: 3};
        bbb.always({
            solver: new ClSimplexSolver(),
            ctx: {
                obj: obj
            }
        }, function() {
            return obj.a + obj.b == 3;
        });
        assert(obj.a + obj.b == 3, "Solver failed: " + obj.a + ", " + obj.b)
    })

    it('should Inequality', function() {
        var obj = {a: 8};
        bbb.always({
            solver: new ClSimplexSolver(),
            ctx: {
                obj: obj
            }
        }, function() {
            return obj.a >= 100;
        });
        assert(obj.a == 100);
        obj.a = 110;
        assert(obj.a == 110);
    })
    it('should DisableConstraint', function() {
        var obj = {a: 8};
        var error = false;
        var c = bbb.always({
            solver: new ClSimplexSolver(),
            ctx: {
                obj: obj
            }
        }, function() {
            return obj.a >= 100;
        });
        assert(obj.a == 100);
        obj.a = 110;
        assert(obj.a == 110);
        try {
            obj.a = 90;
        } catch(e) {
            error = true
        }
        assert(error);
        c.disable();
        obj.a = 90;
        assert(obj.a == 90);
        c.enable();
        assert(obj.a == 100);
        error = false;
        try {
            obj.a = 90;
        } catch(e) {
            error = true
        }
        assert(error);
    })

    it('should SimplePath', function () {
        ClSimplexSolver.resetInstance();
        var pointA = {x:1, y:2},
            pointB = {x:2, y:3},
            o = {a: pointA, b: pointB};
        bbb.always({
            solver: new ClSimplexSolver(),
            ctx: {
                o: o
            }
        }, function() {
            return o.a.x + 100 <= o.b.x;
        });
        assert(pointA.x + 100 <= pointB.x, "Solver failed")
    })
    
    it('should AssignStay', function() {
        var obj = {a: 2, b: 3};
        bbb.always({
            solver: new ClSimplexSolver(),
            ctx: {
                obj: obj
            }
        }, function() {
            return obj.a + obj.b == 3;
        });
        assert(obj.a + obj.b == 3, "Solver failed");
        obj.a = -5;
        assert(obj.a + obj.b == 3, "Constraint violated after assignment");
        assert(obj.a == -5, "Assignment without effect");
    })
    
    it('should EqualityComplexObject', function() {
        var solver = new ClSimplexSolver(),
            assignmentFailed = false;
            point = pt(0,0);
        bbb.always({
            solver: solver,
            ctx: {
                solver: solver,
                point: point,
                pt: pt,
                _$_self: this.doitContext || this
            }
        }, function() {
            return point.equals(pt(10, 10).addPt(pt(11, 11)));;
        });
        
        assert(point.equals(pt(21, 21)), "changed invisible point!");
        try {
            point.x = 100;
        } catch(e) {
            assignmentFailed = true;
        }
        assert(point.equals(pt(21, 21)) && assignmentFailed, "changed x!");
        assert(point.equals(pt(21, 21)), "changed x!");
    })


    it('should PointEquals', function() {
        var pt1 = pt(10, 10),
            pt2 = pt(20, 20);
        bbb.always({
            solver: new ClSimplexSolver(),
            ctx: {
                pt1: pt1,
                pt2: pt2
            }
        }, function() {
            return pt1.equals(pt2);
        });
        assert(pt1.equals(pt2));
    })

    it('should PointAddition', function() {
        var pt1 = pt(10, 10),
            pt2 = pt(20, 20),
            pt3 = pt(0, 0);
        bbb.always({
            solver: new ClSimplexSolver(),
            ctx: {
                pt1: pt1,
                pt2: pt2,
                pt3: pt3
            }
        }, function() {
            return pt1.addPt(pt2).equals(pt3);
        });

        assert(pt1.addPt(pt2).equals(pt3));
    })

    it('should PointAssignment', function() {
        var obj = {p: pt(10, 10)};
        bbb.always({
            solver: new ClSimplexSolver(),
            ctx: {
                obj: obj
            }
        }, function() {
            return obj.p.x >= 100 && obj.p.y >= 100;
        });

        assert(pt(100, 100).leqPt(obj.p));

        obj.p.x = 150;
        assert(pt(100, 100).leqPt(obj.p));
        assert(obj.p.x === 150);

        obj.p = pt(150, 100);
        assert(pt(100, 100).leqPt(obj.p));
        assert(obj.p.x === 150, "point assignment failed to keep the new point intact");
    })
})
