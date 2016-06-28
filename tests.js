import bbb from './babelsberg.js'
import ConstraintInterpreter from './constraintinterpreter.js'
import * as acorn from './jsinterpreter/acorn.js'
import Interpreter from './jsinterpreter/interpreter.js'
import Relax from './bbb-relax.js'
import ClSimplexSolver from './../dwarfcassowary.js/dwarfcassowary.js';

import {assert} from '../lively4-core/node_modules/chai/chai.js'

describe("Constraint solving", function() {
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
        var pointA = pt(1,2),
            pointB = pt(2,3),
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
    it('should SimplePathInvalidation', function () {
        var pointA = pt(1,2),
            pointB = pt(2,3),
            o = {a: pointA, b: pointB};
        bbb.always({
            solver: new ClSimplexSolver(),
            ctx: {
                o: o
            }
        }, function() {
            return o.a.x + 100 <= o.b.x;
        });
        assert(pointA.x + 100 <= pointB.x, "Solver failed");
        pointA = pt(12, 12);
        o.a = pointA;
        assert(pointA.x + 100 <= pointB.x, "Recalculating Path failed");
    })

    it('should TemperatureExample', function() {
        var obj = {fahrenheit: 212, centigrade: 100};

        bbb.always({
            solver: new ClSimplexSolver(),
            ctx: {
                obj: obj
            }
        }, function() {
            return obj.fahrenheit - 32 == obj.centigrade * 1.8;
        });

        assert(CL.approx(obj.fahrenheit - 32, obj.centigrade * 1.8));
        obj.fahrenheit = 100;
        assert(CL.approx(obj.fahrenheit - 32, obj.centigrade * 1.8));
        obj.centigrade = 121;
        assert(CL.approx(obj.fahrenheit - 32, obj.centigrade * 1.8));
    })
    it('should UndefinedVariables', function() {
        var obj = {};
        bbb.always({
            allowTests: true,
            solver: ClSimplexSolver.getInstance(),
            ctx: {obj: obj}
        }, function () {
            return obj.a + obj.b == obj.c;
        })
    })

    it('should RecalculateForTextInput', function() {
        var obj = {
                txt: new lively.morphic.Text(),
                a: 10
            };
        obj.txt.setTextString("5");

        bbb.always({
            solver: new ClSimplexSolver(),
            ctx: {
                obj: obj
            }
        }, function() {
            return obj.a == obj.txt.getTextString();
        });
        assert(obj.a == obj.txt.getTextString());
        
        obj.txt.setTextString("15");
        assert(obj.a == obj.txt.getTextString());
        assert(obj.a === 15)
    })

    it('should SimpleAssign', function () {
        ClSimplexSolver.resetInstance();
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
            point = pt();
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
    it('should LivelyPtIsValueClass', function() {
        var c = new ClSimplexSolver();
        
        var m = lively.morphic.Morph.makeCircle(pt(1,1), 10);
        
        var old = m.getPosition();
        m.setPosition(pt(100,100));
        assert(old !== m.getPosition());
        
        bbb.always({
            solver: c,
            ctx: {
                c: c,
                m: m,
                pt: pt,
                _$_self: this.doitContext || this
            }
        }, function() {
            return m.getPosition().leqPt(pt(21, 21));;
        });
        
        assert(m.getPosition().equals(pt(21,21)));
        var old = m.getPosition();
        m.setPosition(pt(10,10));
        assert(m.getPosition().equals(pt(10,10)));
        assert(old === m.getPosition());
    })

    it('should PointAssignmentComplex', function() {
        var obj = {p: pt(10, 10), p2: pt(20, 20)};
        bbb.always({
            solver: new ClSimplexSolver(),
            ctx: {
                obj: obj
            }
        }, function() {
            return (obj.p.equals(obj.p2) &&
             obj.p.x >= 100 &&
             obj.p.y >= 100);
        });

        assert(pt(100, 100).leqPt(obj.p));
        assert(obj.p.equals(obj.p2));

        obj.p.x = 150;
        assert(pt(100, 100).leqPt(obj.p));
        assert(obj.p.x === 150);
        assert(obj.p.equals(obj.p2));

        obj.p = pt(150, 100);
        assert(obj.p.equals(obj.p2));
        assert(obj.p.equals(pt(150, 100)), "point assignment failed to keep the new point intact");

        obj.p2 = pt(200, 200);
        assert(obj.p.equals(obj.p2), "Expected " + obj.p + " to equal " + obj.p2);
        assert(obj.p.equals(pt(200, 200)), "Expected " + obj.p + " to equal 200@200");
    })

    it('should PointAssignmentComplexScaled', function() {
        var obj = {p: pt(10, 10), p2: pt(20, 20)};
        bbb.always({
            solver: new ClSimplexSolver(),
            ctx: {
                obj: obj
            }
        }, function() {
            return (obj.p.equals(obj.p2.scaleBy(2)) &&
             obj.p.x >= 100 &&
             obj.p.y >= 100);
        });

        assert(pt(100, 100).leqPt(obj.p), 'Expected ' + obj.p + ' to be >= pt(100,100)');
        assert(obj.p.equals(obj.p2.scaleBy(2)), 'Expected ' + obj.p + ' to equal ' + obj.p2 + ' times 2');

        obj.p.x = 150;
        assert(pt(100, 100).leqPt(obj.p), 'Expected ' + obj.p + ' to be >= pt(100,100)');
        assert(obj.p.x === 150, 'Expected ' + obj.p + '.x to = 150');
        assert(obj.p.equals(obj.p2.scaleBy(2)), 'Expected ' + obj.p + ' to equal ' + obj.p2 + ' times 2');

        obj.p = pt(150, 100);
        assert(obj.p.equals(obj.p2.scaleBy(2)), 'Expected ' + obj.p + ' to equal ' + obj.p2 + ' times 2');
        assert(obj.p.equals(pt(150, 100)), "point assignment failed to keep the new point intact");

        obj.p2 = pt(200, 200);
        assert(obj.p.equals(obj.p2.scaleBy(2)),
                    "Expected " + obj.p + " to equal " + obj.p2 + " scaled by 2");
        assert(obj.p2.equals(pt(200, 200)),
                    "Expected " + obj.p2 + " to equal 200@200");

        try {
            obj.p2 = pt(15, 15);
        } catch(_) {
            assert(obj.p.equals(obj.p2.scaleBy(2)), 'Expected ' + obj.p + ' to equal ' + obj.p2 + ' times 2');
            assert(obj.p2.equals(pt(200, 200)));
        }
        assert(obj.p2.equals(pt(200, 200)));
        obj.p2 = pt(50, 50);
        assert(obj.p.equals(obj.p2.scaleBy(2)));
        assert(obj.p2.equals(pt(50, 50)));
    })

    it('should SimpleReadonly', function() {
        var obj = {
            a: 10,
            b: 0
        };
        bbb.always({
            solver: ClSimplexSolver.getInstance(),
            ctx: {
                obj: obj,
                r: bbb.readonly
            }
        }, function() {
            return r(obj.a) == obj.b;
        });
        assert(obj.a == 10);
        assert(obj.b == 10);
        
        ClSimplexSolver.resetInstance();
        var obj2 = {
            a: 10,
            b: 0
        };
        bbb.always({
            solver: ClSimplexSolver.getInstance(),
            ctx: {
                obj2: obj2,
                r: bbb.readonly
            }
        }, function() {
            return obj2.a == r(obj2.b);
        });
        assert(obj2.a == 0);
        assert(obj2.b == 0);

        ClSimplexSolver.resetInstance();
        var obj3 = {
            a: 10,
            b: 0
        };
        try {
            bbb.always({
                solver: ClSimplexSolver.getInstance(),
                ctx: {
                        obj3: obj3,
                        r: bbb.readonly
                }
            }, function() {
                    return r(obj3.a) == r(obj3.b);
            });
            assert(false, "this constraint should throw an exception, because both variables are readonly");
        } catch(e) {}
    })

    it('should ItemReadonly', function() {
        var i = {
                time: 1,
                value: 2,
                sum: 0
            },
            i2 = {
                time: 2,
                value: 3,
                sum: 0
            },
            solver = new ClSimplexSolver();
        solver.setAutosolve(false);
        bbb.always({solver: solver, ctx: {i: i, r: bbb.readonly}}, function () {
            return i.sum >= 0;
        });
        bbb.always({solver: solver, ctx: {i: i2, r: bbb.readonly}}, function () {
            return i.sum >= 0;
        });
        
        bbb.always({solver: solver, ctx: {i: i, r: bbb.readonly}}, function () {
            if (i.prev) {
                return i.sum == r(i.value) + i.prev.sum;
            } else {
                return i.sum == r(i.value);
            }
        });
        bbb.always({solver: solver, ctx: {i: i2, r: bbb.readonly}}, function () {
            if (i.prev) {
                return i.sum == r(i.value) + i.prev.sum;
            } else {
                return i.sum == r(i.value);
            }
        });
        assert(i.sum == 2, "expected sum to equal 2, got " + i.sum);
        assert(i2.sum == 3, "expected sum to equal 3, got " + i2.sum);
        i2.prev = i;
        assert(i.sum == 2, "expected sum to equal 2, got " + i.sum);
        assert(i2.sum == 5, "expected sum to equal 5, got " + i2.sum);
        i2.prev = {sum: 100}
        assert(i2.sum == 103, "expected sum to equal 103, got " + i2.sum);
    })
    it('should NoErrorWithStringConstraint', function() {
        var a = pt(0,0),
            b = "hello"
        bbb.always({
            solver: new ClSimplexSolver(),
            ctx: {
                ClSimplexSolver: ClSimplexSolver,
                a: a,
                ro: bbb.readonly,
                b: b,
                _$_self: this.doitContext || this
            }
        }, function() {
            return a.x == ro(b.length);;
        });
        assert(a.x == "hello".length)
    })
    it('should 1LvlReadonly', function() {
        var solver = new ClSimplexSolver(),
            pt1 = lively.pt(0, 0),
            pt2 = lively.pt(10, 10);
        
        // always; { mrect.bottomRight().equals(ro(corner)) }
        bbb.always({
            solver: solver,
            ctx: {
                pt1: pt1,
                pt2: pt2,
                ro: bbb.readonly,
                _$_self: this.doitContext || this
            }
        }, function() {
            return pt1.equals(ro(pt2));
        });
        
        assert(pt1.equals(pt(10,10)))
        assert(pt2.equals(pt(10,10)))
        var failed = false;
        try { pt1.x = 5 } catch(e) { failed = true }
        assert(failed);
        assert(pt1.equals(pt(10,10)));
        assert(pt2.equals(pt(10,10)));
    })


    it('should Conjunction', function() {
        var ctx = {a: 10, b: 100, c: 1000, d: 10000},
            constraint = bbb.always({
                solver: new ClSimplexSolver(),
                ctx: {
                    ctx: ctx
                }
            }, function() {
                return ctx.a == ctx.b && ctx.c == ctx.d;
            });

        assert(ctx.a == ctx.b && ctx.c == ctx.d, "" + ctx.a + "," + ctx.b + "," + ctx.c + "," + ctx.d);
        // should have two primitive constraints
        assert(constraint.constraintobjects.length == 2);
    })
});

describe("Propagation", function() {
    xit("should OneWayConstraintFromEqualsWrapsNestedProperties", function() {
        var o = {a: pt(0,0),
                 b: pt(1,1),
                 c: pt(2,2)};

        bbb.always({
            solver: new DBPlanner(),
            ctx: {
                DBPlanner: DBPlanner,
                o: o,
                _$_self: this.doitContext || this
            }
        }, function() {
            return o.a.equals(o.b.addPt(o.c)) && o.b.equals(o.a.subPt(o.c)) && o.c.equals(o.a.subPt(o.b));;
        });
        
        assert(o.a.equals(o.b.addPt(o.c)));

        o.a = pt(100,100);
        assert(o.a.equals(o.b.addPt(o.c)));
        assert(o.a.equals(pt(100,100)));

        // TODO XXX: these require value class updates
        // o.a.x = 12
        // assert(o.a.equals(o.b.addPt(o.c)));
        // assert(o.a.equals(pt(12,100)));

        // o.b.y = pt(23)
        // assert(o.a.equals(o.b.addPt(o.c)));
        // assert(o.b.y === 23);

        o.c.x = 18
        assert(o.a.equals(o.b.addPt(o.c)));
        assert(o.c.x === 18);
    })

    it('should OneWayConstraintFromEquals', function() {
        var o = {a: pt(0,0),
                 b: pt(1,1),
                 c: pt(2,2)};

        bbb.always({
            solver: new DBPlanner(),
            ctx: {
                DBPlanner: DBPlanner,
                o: o,
                _$_self: this.doitContext || this
            }
        }, function() {
            return o.a.equals(o.b.addPt(o.c)) && o.b.equals(o.a.subPt(o.c)) && o.c.equals(o.a.subPt(o.b));;
        });
        
        assert(o.a.equals(o.b.addPt(o.c)));

        o.a = pt(100,100);
        assert(o.a.equals(o.b.addPt(o.c)));
        assert(o.a.equals(pt(100,100)));

        o.b = pt(20,20)
        assert(o.a.equals(o.b.addPt(o.c)));
        assert(o.b.equals(pt(20,20)));

        o.c = pt(13,13)
        assert(o.a.equals(o.b.addPt(o.c)));
        assert(o.c.equals(pt(13,13)));
    })

    it('should OneWayConstraintFromEq', function() {
        var o = {string: "0",
                 number: 0};

        bbb.always({
            solver: new DBPlanner(),
            ctx: {parseFloat: parseFloat, o: o}
        }, function () {
            return o.string == o.number + "" &&
            o.number == parseFloat(o.string);
        });

        assert(o.string === o.number + "");
        o.string = "1"
        assert(o.number === 1);
        var cannotSatisfy;
        o.number = 12;
        assert(o.number == 12);
        assert(o.string == "12");
    })

    it('should OnlyOneConstraintIsCreatedWithoutAnd', function() {
        var o = {string: "0",
                 number: 0};

        bbb.always({
            solver: new DBPlanner(),
            ctx: {parseFloat: parseFloat, o: o}
        }, function () {
            o.string == o.number + "";
            return o.number == parseFloat(o.string);
        });

        assert(o.string === o.number + "");
        o.string = "1"
        assert(o.number === 1);
        var cannotSatisfy;
        o.number = 12;
        assert(o.number == 1);
        assert(o.string == 1);
    })

    it('should SimplePropagation', function() {
        var o = {string: "0",
                 number: 0};

        bbb.always({
            solver: new DBPlanner(),
            ctx: {
                o: o
            }, methods: function () {
                o.string.formula([o.number], function (num) { return num + "" });
                o.number.formula([o.string], function (str) { return parseInt(str) });
            }
        }, function () {
            return o.string == o.number + "";
        });

        assert(o.string === o.number + "");
        o.string = "1"
        assert(o.number === 1);
        o.number = 12
        assert(o.string === "12");
    })
    it('should JustEquality', function() {
        var db = new DBPlanner(),
            obj = {a: pt(0,0), b: pt(1,1)};
        bbb.always({
            solver: db,
            ctx: {
                db: db,
                obj: obj,
                _$_self: this.doitContext || this
            }
        }, function() {
            return obj.a == obj.b;
        });

        assert(obj.a.equals(obj.b));
        assert(obj.a !== obj.b);
    })
    it('should JustEquality2', function() {
        var db = new DBPlanner(),
            obj = {a: pt(0,0), b: pt(1,1)};
        bbb.always({
            solver: db,
            ctx: {
                db: db,
                obj: obj,
                _$_self: this.doitContext || this
            }
        }, function() {
            return obj.a.equals(obj.b);
        });

        assert(obj.a.equals(obj.b));
        assert(obj.a !== obj.b);
    })

    it('should AutomaticSetterInference', function() {
        var solver = new DBPlanner(),
            r1 = lively.morphic.Morph.makeRectangle(0,0,100,100),
            r2 = lively.morphic.Morph.makeRectangle(10,10,200,200),
            r1setPositionValue, r2setPositionValue;
        
        r1.setPosition = r1.setPosition.wrap(function (proceed, value) {
            r1setPositionValue = value;
            return proceed(value);
        })
        r2.setPosition = r2.setPosition.wrap(function (proceed, value) {
            r2setPositionValue = value;
            return proceed(value);
        })
        
        var c = bbb.always({
            solver: solver,
            ctx: {
                solver: solver,
                r1: r1,
                r2: r2,
                _$_self: this.doitContext || this
            }
        }, function() {
            return r1.getPosition().equals(r2.getPosition());;
        });
        assert(r1.getPosition().equals(r2.getPosition()));
        r2.setPosition(pt(5,5));
        assert(r1.getPosition().equals(r2.getPosition()));
        assert(r1.getPosition().equals(pt(5,5)));
        assert(r1setPositionValue.equals(pt(5,5)));
        r1.setPosition(pt(100,100));
        assert(r1.getPosition().equals(r2.getPosition()));
        assert(r2.getPosition().equals(pt(100,100)));
        assert(r2setPositionValue.equals(pt(100,100)));
    })
    it('should AutomaticSetterInferenceDeep', function() {
        var solver = new ClSimplexSolver(),
            r1 = lively.morphic.Morph.makeRectangle(0,0,100,100),
            r2 = lively.morphic.Morph.makeRectangle(10,10,200,200),
            r1setPositionValue, r2setPositionValue,
            r1setPositionCalls = 0, r2setPositionCalls = 0;
        
        r1.setPosition = r1.setPosition.wrap(function (proceed, value) {
            r1setPositionCalls++;
            r1setPositionValue = value;
            return proceed(value);
        })
        r2.setPosition = r2.setPosition.wrap(function (proceed, value) {
            r2setPositionCalls++;
            r2setPositionValue = value;
            return proceed(value);
        })
        
        var c = bbb.always({
            solver: solver,
            ctx: {
                solver: solver,
                r1: r1,
                r2: r2,
                _$_self: this.doitContext || this
            }
        }, function() {
            return r1.getPosition().equals(r2.getPosition());;
        });
        assert(r1.getPosition().equals(r2.getPosition()));
        r2.setPosition(pt(5,5));
        assert(r1.getPosition().equals(r2.getPosition()));
        assert(r1.getPosition().equals(pt(5,5)));
        
        assert(r1setPositionValue.equals(pt(5,5)));
        this.assertEquals(r1setPositionCalls, 2, "too many calls for r1"); // call each setter just once per
        this.assertEquals(r2setPositionCalls, 2, "too many calls for r2"); // once above
    })
    it('should Identity', function() {
        var db = new DBPlanner(),
            obj = {a: pt(0,0), b: pt(1,1)};
        bbb.always({
            solver: db,
            ctx: {
                db: db,
                obj: obj,
                _$_self: this.doitContext || this
            }
        }, function() {
            return obj.a === obj.b;
        });
        
        assert(obj.a === obj.b, "");
        obj.a = pt(10,10);
        assert(obj.a === obj.b, "");
        obj.b = pt(10,10);
    })
    it('should Identity2', function() {
        var db = new DBPlanner(),
            color = Color.rgb(200,0,0),
            color2 = Color.rgb(0,0,200);
        bbb.always({
            solver: db,
            ctx: {
                db: db,
                color: color,
                color2: color2,
                _$_self: this.doitContext || this
            }
        }, function() {
            return color.equals(color2);
        });
        assert(color.equals(color2));
        color.r = 0.1;
        color2.g = 0.7;
        assert(color.equals(color2));
        assert(color2.r === 0.1);
        assert(color.g === 0.7);
    })
    it('should BoolPropagation', function () {
        var o = {a: true,
                 b: 10};

        bbb.always({
            solver: new DBPlanner(),
            ctx: {
                o: o
            }, methods: function () {
                o.a.formula([o.b], function (b, a) { return b > 15 });
                o.b.formula([o.a], function (a, b) { return a ? 16 : 15 });
            }
        }, function () {
            return o.a == (o.b > 15);
        });

        assert(!o.a, "deltablue changed a");
        o.b = 20;
        assert(o.a, "deltablue changed a");
        o.a = false;
        assert(o.b === 15, "deltablue changed b");
        o.b = 20;
        assert(o.a, "deltablue changed a");
        o.a = true;
        assert(o.b === 20, "deltablue didn't change b, because the predicate was satisfied");
    })

    it('should Arithmetic', function() {
        var o = {x: 0, y: 0, z: 0};

        bbb.always({
            solver: new DBPlanner(),
            ctx: {
                o: o
            }, methods: function () {
                o.x.formula([o.y, o.z], function (y, z) { debugger; return z - y });
                o.y.formula([o.x, o.z], function (x, z) { debugger; return z - x });
                o.z.formula([o.x, o.y], function (x, y) { debugger; return x + y });
            }
        }, function () {
            return o.x + o.y == o.z;
        });

        assert(o.x + o.y == o.z);
        o.x = 10;
        assert(o.x == 10);
        assert(o.x + o.y == o.z);
        o.y = 15;
        assert(o.y == 15);
        assert(o.x + o.y == o.z);
        o.z = 100;
        assert(o.z == 100);
        assert(o.x + o.y == o.z);
    })

    it('should DeltaBlueUserFunction', function() {
        var planner = new DBPlanner(),
            string = new DBVariable("string", "0", planner),
            number = new DBVariable("number", 0, planner);

        var constraint = new UserDBConstraint(function (c) {
            c.formula(string, [number], function (num) { return num + ""; });
            c.formula(number, [string], function (str) { return parseInt(str); });
        }, planner);
        constraint.addDBConstraint();

        number.assignValue(10);
        assert(number.value === 10, "new value should stick");
        assert(string.value === "10", "new value should propagate");

        string.assignValue("12");
        assert(number.value === 12, "new value should propagate");
        assert(string.value === "12", "new value should stick");
    })
    it('should NoPredicate', function () {
        var db = new DBPlanner(),
            element = {color: "red", celsius: 50};
            
        bbb.always({solver: db, ctx: {e: element}}, function() {
            e.color.formula([e.celsius],
                function(c) {
                    return c > 50 ? "red" : "blue";
                });
            }
        );
        
        assert(element.color === "blue", "should have changed to blue");
        assert(element.celsius === 50);
        
        element.celsius = 70
        assert(element.color === "red", "should have changed to red");
        assert(element.celsius === 70);
        
        element.celsius = 30
        assert(element.color === "blue", "should have changed to blue");
        assert(element.celsius === 30);
    })
});

describe("interaction", function() {
    it('should InteractionAssignment', function () {
        var o = {a: true,
                 b: 10};

        bbb.always({
            solver: new ClSimplexSolver(),
            ctx: {
                o: o
            }
        }, function() {
            return o.b >= 11;
        });
        assert(o.a, "a unchanged");
        assert(o.b === 11, "b fixed");

        bbb.always({
            solver: new DBPlanner(),
            ctx: {
                o: o
            }, methods: function () {
                o.a.formula([o.b], function (b, a) { return b > 15 });
                o.b.formula([o.a], function (a, b) { return a ? 16 : 15 });
            }
        }, function () {
            return o.a == (o.b > 15);
        });
        assert(!o.a, "deltablue is downstream from cassowary and has to change a");
        assert(o.b === 11, "deltablue is downstream from cassowary and has to change a");

        o.b = 20;
        assert(o.a, "deltablue changed a");
        assert(o.b === 20, "cassowary updated this");
    })
    it('should DynamicRegions2', function () {
        var f = new lively.morphic.Slider(rect(0,0,100,20)),
            c = new lively.morphic.Slider(rect(0,0,100,20)),
            ft = new lively.morphic.Text(rect(0,0,50,50), ""),
            ct = new lively.morphic.Text(rect(0,0,50,50), ""),
            cassowary = new ClSimplexSolver(),
            deltablue = new DBPlanner(),
            db2 = new DBPlanner();

        bbb.always({
            solver: cassowary,
            ctx: {
                cassowary: cassowary,
                f: f,
                c: c,
                _$_self: this.doitContext || this
            }
        }, function() {
            return f.getValue() * 100 - 32 == c.getValue() * 100 * 1.8 &&
                    f.getValue() >= 0 && c.getValue() >= 0 &&
                    f.getValue() <= 1 && c.getValue() <= 1;
        });
    
        bbb.always({
            solver: deltablue,
            ctx: {
                deltablue: deltablue,
                ft: ft,
                f: f,
                Math: Math,
                parseFloat: parseFloat,
                _$_self: this.doitContext || this
            }
        }, function() {
            ft.getTextString().formula([ f.getValue() ], function(v) {
                return Math.round(v * 100) + "";
            });
            return f.getValue().formula([ ft.getTextString() ], function(v) {
                return parseFloat(v) / 100;
            });;
        });

        bbb.always({
            solver: db2,
            ctx: {
                db2: db2,
                ct: ct,
                c: c,
                Math: Math,
                parseFloat: parseFloat,
                _$_self: this.doitContext || this
            }
        }, function() {
            ct.getTextString().formula([ c.getValue() ], function(v) {
                return Math.round(v * 100) + "";
            });
            return c.getValue().formula([ ct.getTextString() ], function(v) {
                return parseFloat(v) / 100;
            });;
        });

        f.setValue(0.5);
        assert(c.getValue() == 0.1, "1 Cassowary");
        assert(ct.getTextString() == "10", "1 DeltaBlue");
        assert(ft.getTextString() == "50", "1 DeltaBlue2");
        
        c.setValue(0);
        assert(f.getValue() == 0.32, "2 Cassowary");
        assert(ct.getTextString() == "0", "2 DeltaBlue");
        assert(ft.getTextString() == "32", "2 DeltaBlue2");
        
        ft.setTextString("50");
        assert(approxEq(f.getValue(), 0.5), "3 DeltaBlue");
        assert(approxEq(c.getValue(), 0.1), "3 Cassowary");
        assert(ct.getTextString() == "10", "3 DeltaBlue2");
        
        ct.setTextString("0");
        assert(approxEq(c.getValue(), 0), "4 DeltaBlue");
        assert(approxEq(f.getValue(), 0.32), "4 Cassowary");
        assert(ft.getTextString() == "32", "4 DeltaBlue2");
        
        f.setValue(0.5);
        assert(approxEq(c.getValue(), 0.1), "5 Cassowary");
        assert(ct.getTextString() == "10", "5 DeltaBlue");
        assert(ft.getTextString() == "50", "5 DeltaBlue2");
        
        c.setValue(0);
        assert(approxEq(f.getValue(), 0.32), "6 Cassowary");
        assert(ct.getTextString() == "0", "6 DeltaBlue");
        assert(ft.getTextString() == "32", "6 DeltaBlue2");
        
        function approxEq(v1, v2) {
            return v1.toFixed(1) === v2.toFixed(1);
        }
    })
    it('should DynamicRegions', function () {
        var a = pt(0,0),
            b = {str: ""},
            c = new ClSimplexSolver(),
            d = new DBPlanner();

        bbb.always({
            solver: c,
            ctx: { c: c, a: a}
        }, function() {
            return a.x == a.y;;
        });
                
        bbb.always({
            solver: d,
            ctx: { d: d, a: a, b: b, parseFloat: parseFloat }
        }, function() {
            a.x.formula([ b.str ], function(v) {
                return parseFloat(v);
            });
            return b.str.formula([ a.x ], function(v) {
                var fullStr = v + "";
                if (fullStr.indexOf(".") === -1) {
                    return v.toFixed(1);
                } else {
                    return fullStr;
                }
            });;
        });
        
        a.x = 10;
        assert(a.y === 10, "1) Cassowary did not kick in");
        assert(b.str === "10.0", "1) DeltaBlue did not kick in");
        
        a.y = 5;
        assert(a.x === 5, "2) Cassowary did not kick in");
        assert(b.str === "5.0", "2) DeltaBlue did not kick in");
        
        b.str = "7.5";
        assert(a.x == 7.5, "3a) Cassowary did not kick in");
        assert(a.y == 7.5, "3b) Cassowary did not kick in");
        assert(b.str == "7.5", "3) DeltaBlue did not kick in");
    })
    it('should InteractionAssignmentIndirect', function () {
        var o = {a: true,
                 b: 10,
                 c: 5};

        bbb.always({
            solver: new ClSimplexSolver(),
            ctx: {
                o: o
            }
        }, function() {
            return o.b + o.c >= 20;
        });
        assert(o.a, "a unchanged");
        assert(o.b === 15, "b fixed " + o.b);

        bbb.always({
            solver: new DBPlanner(),
            ctx: {
                o: o
            }, methods: function () {
                o.a.formula([o.b], function (b, a) { return b > 15 });
                o.b.formula([o.a], function (a, b) { return a ? 16 : 15 });
            }
        }, function () {
            return o.a == (o.b > 15);
        });
        assert(!o.a, "deltablue is downstream from cassowary and has to change a to " + o.a);
        assert(o.b === 15, "deltablue is downstream from cassowary and has to change a");

        o.c = 1;
        assert(o.a, "deltablue changed a");
        assert(o.b === 19, "cassowary updated this");
    })
    it('should DynamicRegionsOnPoints', function() {
        var c = new ClSimplexSolver(),
            d = new DBPlanner();
        var e1 = lively.morphic.Morph.makeCircle(pt(0,0), 10),
            e2 = lively.morphic.Morph.makeCircle(pt(0,0), 10),
            e3 = lively.morphic.Morph.makeCircle(pt(20,20), 10),
            e4 = lively.morphic.Morph.makeCircle(pt(20,20), 10);
        
        bbb.always({
            solver: c,
            ctx: {
                c: c,
                e2: e2,
                e1: e1,
                e3: e3,
                _$_self: this.doitContext || this
            }
        }, function() {
            return e2.getPosition().equals(e1.getPosition().addPt(e3.getPosition()).scaleBy(.5));;
        });

        assert(e1.getPosition().equals(pt(0,0)), "1a " + e1.getPosition());
        assert(e2.getPosition().equals(pt(10,10)), "2a " + e2.getPosition());
        assert(e3.getPosition().equals(pt(20,20)), "3a " + e3.getPosition());

        e1.setPosition(pt(5,5));
        assert(e1.getPosition().equals(pt(5,5)), "1b " + e1.getPosition());
        assert(e2.getPosition().equals(pt(12.5,12.5)), "2b " + e2.getPosition());
        assert(e3.getPosition().equals(pt(20,20)), "3b " + e3.getPosition());

        bbb.always({
            solver: d,
            ctx: {
                d: d,
                e1: e1,
                e4: e4,
                _$_self: this.doitContext || this
            }
        }, function() {
            return e1.getPosition().equals(e4.getPosition());;
        });

        assert(e1.getPosition().equals(pt(20,20)), "1c " + e1.getPosition());
        assert(e2.getPosition().equals(pt(20,20)), "2c " + e2.getPosition());
        assert(e3.getPosition().equals(pt(20,20)), "3c " + e3.getPosition());
        assert(e4.getPosition().equals(pt(20,20)), "4c " + e4.getPosition());

        e4.setPosition(pt(5,5));
        assert(e1.getPosition().equals(pt(5,5)), "1d " + e1.getPosition());
        assert(e2.getPosition().equals(pt(12.5,12.5)), "2d " + e2.getPosition());
        assert(e3.getPosition().equals(pt(20,20)), "3d " + e3.getPosition());
        assert(e4.getPosition().equals(pt(5,5)), "4d " + e4.getPosition());

        e1.setPosition(pt(0,0));
        assert(e1.getPosition().equals(pt(0,0)), "1e " + e1.getPosition());
        assert(e2.getPosition().equals(pt(10,10)), "2e " + e2.getPosition());
        assert(e3.getPosition().equals(pt(20,20)), "3e " + e3.getPosition());
        assert(e4.getPosition().equals(pt(0,0)), "4e " + e4.getPosition());
    })

    it('should DynamicRegionsOnPoints2', function() {
        var c = new ClSimplexSolver(),
            c2 = new ClSimplexSolver();
        var e1 = lively.morphic.Morph.makeCircle(pt(0,0), 10),
            e2 = lively.morphic.Morph.makeCircle(pt(0,0), 10),
            e3 = lively.morphic.Morph.makeCircle(pt(20,20), 10),
            e4 = lively.morphic.Morph.makeCircle(pt(20,20), 10);

        bbb.always({
            solver: c,
            ctx: {
                c: c,
                e2: e2,
                e1: e1,
                e3: e3,
                _$_self: this.doitContext || this
            }
        }, function() {
            return e2.getPosition().equals(e1.getPosition().addPt(e3.getPosition()).scaleBy(.5));;
        });

        assert(e1.getPosition().equals(pt(0,0)), "1a " + e1.getPosition());
        assert(e2.getPosition().equals(pt(10,10)), "2a " + e2.getPosition());
        assert(e3.getPosition().equals(pt(20,20)), "3a " + e3.getPosition());

        e1.setPosition(pt(5,5));
        assert(e1.getPosition().equals(pt(5,5)), "1b " + e1.getPosition());
        assert(e2.getPosition().equals(pt(12.5,12.5)), "2b " + e2.getPosition());
        assert(e3.getPosition().equals(pt(20,20)), "3b " + e3.getPosition());

        bbb.always({
            solver: c2,
            ctx: {
                e1: e1,
                e4: e4,
                _$_self: this.doitContext || this
            }
        }, function() {
            return e1.getPosition().equals(e4.getPosition());;
        });

        assert(e1.getPosition().equals(pt(5,5)), "1c " + e1.getPosition());
        assert(e2.getPosition().equals(pt(12.5,12.5)), "2c " + e2.getPosition());
        assert(e3.getPosition().equals(pt(20,20)), "3c " + e3.getPosition());
        assert(e4.getPosition().equals(pt(5,5)), "4c " + e4.getPosition());

        e4.setPosition(pt(5,5));
        assert(e1.getPosition().equals(pt(5,5)), "1d " + e1.getPosition());
        assert(e2.getPosition().equals(pt(12.5,12.5)), "2d " + e2.getPosition());
        assert(e3.getPosition().equals(pt(20,20)), "3d " + e3.getPosition());
        assert(e4.getPosition().equals(pt(5,5)), "4d " + e4.getPosition());

        e1.setPosition(pt(0,0));
        assert(e1.getPosition().equals(pt(0,0)), "1e " + e1.getPosition());
        assert(e2.getPosition().equals(pt(10,10)), "2e " + e2.getPosition());
        assert(e3.getPosition().equals(pt(20,20)), "3e " + e3.getPosition());
        assert(e4.getPosition().equals(pt(0,0)), "4e " + e4.getPosition());
    })

    it('should InteractingSolvers_FailOnConstraintConstruction', function() {
        var pt = {x: 1, y: 2};

        bbb.always({
            solver: new DBPlanner(),
            ctx: {
                pt: pt
            },
            methods: function() {
                pt.x.formula([pt.y], function(y) {
                    return y;
                });
                pt.y.formula([pt.x], function(x) {
                    return x;
                });
            }
        }, function() {
            return pt.x == pt.y;
        });
    
        bbb.always({
            solver: new ClSimplexSolver(),
            ctx: {
                pt: pt
            }
        }, function() {
            return pt.x == 100;
        });

        assert(pt.x == 100, "constraint construction did not modified the variable, pt.x: " + pt.x);
        assert(pt.x == pt.y, "delta blue constraint not fulfilled, pt.x: " + pt.x + ", pt.y: " + pt.y);
    })
    it('should ConstraintConstructionTwoSolvers2', function () {
        var pt = {x: 15, y: 2},
            s1 = new ClSimplexSolver(),
            s2 = new ClSimplexSolver();
        s1.weight = 100;
        s2.weight = 200;

                bbb.always({
                        solver: s2,
                        ctx: {
                                pt: pt
                        }
                }, function() {
                        return pt.y == 2;;
                });
                assert(pt.y == 2, "constraint not satisfied after constraint construction (1), pt.y: " + pt.y);

                bbb.always({
                        solver: s1,
                        ctx: {
                                pt: pt
                        }
                }, function() {
                        return pt.y == pt.x;;
                });
                assert(pt.x == pt.y, "constraint not satisfied after constraint construction (2)");
                assert(pt.y == 2, "constraint not satisfied after constraint construction (3), pt.y: " + pt.y);
    })

    it('should ConstraintConstructionTwoSolvers', function () {
        var pt = {x: 15, y: 2},
            s1 = new ClSimplexSolver(),
            s2 = new ClSimplexSolver();
        s1.weight = 100;
        s2.weight = 200;

                bbb.always({
                        solver: s1,
                        ctx: {
                                pt: pt
                        }
                }, function() {
                        return pt.y == pt.x;;
                });
                console.log(pt.x, pt.y);
                assert(pt.x == pt.y, "constraint not satisfied after constraint construction (1)");

                bbb.always({
                        solver: s2,
                        ctx: {
                                pt: pt
                        }
                }, function() {
                        return pt.y == 2;;
                });
                console.log(pt.x, pt.y);
                assert(pt.x == pt.y, "constraint not satisfied after constraint construction (2)");
                assert(pt.y == 2, "constraint not satisfied after constraint construction (3), pt.y: " + pt.y);
    })

    xit("test edit", function() {
        var obj = {a: 0, b: 1, c: "2"},
            cassowary = new ClSimplexSolver(),
            deltablue = new DBPlanner();
        cassowary.setAutosolve(false);

        bbb.always({solver: cassowary, ctx: {obj: obj}}, function () {
            return obj.a == obj.b;
        });
        bbb.always({solver: deltablue, ctx: {obj: obj}, methods: function () {
            obj.b.formula([obj.c], function (c) { return parseInt(c); });
            obj.c.formula([obj.b], function (b) { return b + ""; })
        }}, function () {
            return obj.b == obj.c;
        });
        
        assert(obj.a === obj.b);
        assert(obj.c == obj.b);
        assert(obj.c !== obj.b);
        
        obj.a = 10;
        assert(obj.a === 10);
        assert(obj.a === obj.b);
        assert(obj.c == obj.b);
        assert(obj.c !== obj.b);
        
        var cb = bbb.edit(obj, ["b"]);
        cb([5]);
        assert(obj.b === 5);
        assert(obj.a === obj.b);
        assert(obj.c == obj.b);
        assert(obj.c !== obj.b);
        cb([11])
        assert(obj.b === 11);
        assert(obj.a === obj.b);
        assert(obj.c == obj.b);
        assert(obj.c !== obj.b);
    })
});

describe("CSP", function() {
    it('should BacktalkPaperExample', function () {
        var solver = bbb.defaultSolver = new csp.Solver();
        var man = {
            shoes: "foo",
            shirt: "foo",
            pants: "foo",
            hat: "foo"
        };
        
        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                man: man,
                _$_self: this.doitContext || this
            }
        }, function() {
            return man.shoes.is in ["brown", "black"];;
        });

        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                man: man,
                _$_self: this.doitContext || this
            }
        }, function() {
            return man.shirt.is in ["brown", "blue", "white"];;
        });
        
        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                man: man,
                _$_self: this.doitContext || this
            }
        }, function() {
            return man.pants.is in ["brown", "blue", "black", "white"];;
        });
        
        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                man: man,
                _$_self: this.doitContext || this
            }
        }, function() {
            return man.hat.is in ["brown"];;
        });
        
        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                man: man,
                _$_self: this.doitContext || this
            }
        }, function() {
            return man.shoes === man.hat;;
        });

        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                man: man,
                _$_self: this.doitContext || this
            }
        }, function() {
            return man.shoes !== man.pants;;
        });

        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                man: man,
                _$_self: this.doitContext || this
            }
        }, function() {
            return man.shoes !== man.shirt;;
        });

        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                man: man,
                _$_self: this.doitContext || this
            }
        }, function() {
            return man.shirt !== man.pants;;
        });

        assert(man.hat === "brown", "hat's domain is restricted to 'brown' only");
        assert(man.shoes === "brown", "shoes have to be 'brown'");
        assert(man.shirt === "blue" || man.shirt === "white", "shirt has to be 'blue' or 'white'");
        assert(man.shirt !== man.pants, "shirt and pants must not have the same color");
        assert(man.pants === "black" || man.pants === "blue" || man.pants === "white", "pants should be 'black', 'blue' or 'white'");
    })
    it('should ForceToDomain', function () {
        var solver = bbb.defaultSolver = new csp.Solver();
        var pt = {x: 5, y: 2};
        
        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                pt: pt,
                _$_self: this.doitContext || this
            }
        }, function() {
            return pt.x.is in [1, 2, 3];;
        });

        assert([1, 2, 3].indexOf(pt.x) > -1, "x is not in its domain [1, 2, 3], but " + pt.x);
    })
    it('should RemainIfInDomain', function () {
        var solver = bbb.defaultSolver = new csp.Solver();
        var pt = {x: 5, y: 2};
        
        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                pt: pt,
                _$_self: this.doitContext || this
            }
        }, function() {
            return pt.x.is in [4, 5, 6];;
        });

        assert(pt.x === 5, "x does not stay at 5, but probably raims in its domain [4, 5, 6]; x: " + pt.x);
    })
    it('should ErrorOnEmptyDomain', function () {
        var solver = bbb.defaultSolver = new csp.Solver(),
            pt = {x: 5, y: 2},
            errorThrown = false;
        
        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                pt: pt,
                _$_self: this.doitContext || this
            }
        }, function() {
            return pt.x.is in [];;
        });
        try {
            solver.newVariable(pt, "x", []);
        } catch (e) {
            errorThrown = true;
        }

        assert(errorThrown, "no error was thrown on empty domain");
    })
    it('should Assignment', function () {
        var solver = bbb.defaultSolver = new csp.Solver(),
            pt = {x: 2, y: 6},
            errorThrown = false;
        
        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                pt: pt,
                _$_self: this.doitContext || this
            }
        }, function() {
            return pt.x.is in [1, 2, 3, 4, 5, 6, 7, 8, 9];;
        });

        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                pt: pt,
                _$_self: this.doitContext || this
            }
        }, function() {
            return pt.y.is in [4, 5, 6, 7, 8, 9, 10, 11, 12];;
        });
        
        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                pt: pt,
                _$_self: this.doitContext || this
            }
        }, function() {
            return pt.x + 4 === pt.y;;
        });
    
        pt.x = 8;
        assert(pt.x === 8, "assignment 'x = 8' was not successful; x: " + pt.x);
        assert(pt.y === 12, "constraint 'x + 4 == y' not satisfied; y: " + pt.y);
        
        pt.y = 7;
        assert(pt.y === 7, "assignment 'y = 7' was not successful; y: " + pt.y);
        assert(pt.x === 3, "constraint 'x + 4 == y' not satisfied; x: " + pt.x);
    })
    it('should Assignment2', function () {
        var solver = bbb.defaultSolver = new csp.Solver(),
            pt = {x: 2, y: 8},
            errorThrown = false;
        
        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                pt: pt,
                _$_self: this.doitContext || this
            }
        }, function() {
            return pt.x.is in [1, 2, 3, 4, 5, 6, 7, 8, 9];;
        });

        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                pt: pt,
                _$_self: this.doitContext || this
            }
        }, function() {
            return pt.y.is in [4, 5, 6, 7, 8, 9, 10, 11, 12];;
        });

        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                pt: pt,
                _$_self: this.doitContext || this
            }
        }, function() {
            return pt.x + pt.y >= 10;;
        });
    
        assert(pt.x + pt.y >= 10, "constraint 'pt.x + pt.y >= 10' does not hold for x: "+ pt.x+", y: " + pt.y);

        pt.y = 4;
        assert(pt.y === 4, "assignment 'y = 4' was not successful; y: " + pt.y);
        assert(pt.x + pt.y >= 10, "constraint 'pt.x + pt.y >= 10' does not hold for x: "+ pt.x+", y: " + pt.y);
    })
    it('should FailingAssignmentOnDomain', function () {
        var solver = bbb.defaultSolver = new csp.Solver(),
            pt = {x: 5, y: 2},
            errorThrown = false;
        
        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                pt: pt,
                _$_self: this.doitContext || this
            }
        }, function() {
            return pt.x.is in [1, 2, 3];;
        });
        
        try {
            pt.x = 0;
        } catch (e) {
            errorThrown = true;
        }
    
        assert(errorThrown, "no error was thrown on new value x = 0 with domain [1, 2, 3]; x: " + pt.x);
    })
    it('should FailingAssignment', function () {
        // try x = 0 with constraint x > 4
        var solver = bbb.defaultSolver = new csp.Solver(),
            pt = {x: 2, y: 8},
            errorThrown = false;
        
        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                pt: pt,
                _$_self: this.doitContext || this
            }
        }, function() {
            return pt.x.is in [1, 2, 3, 4, 5, 6, 7, 8, 9];;
        });
        
        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                pt: pt,
                _$_self: this.doitContext || this
            }
        }, function() {
            return pt.y.is in [1, 2, 3, 4, 5, 6, 7, 8, 9];;
        });
        
        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                pt: pt,
                _$_self: this.doitContext || this
            }
        }, function() {
            return pt.x > 4;;
        });
    
        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                pt: pt,
                _$_self: this.doitContext || this
            }
        }, function() {
            return pt.x + pt.y === 10;;
        });

        assert(pt.x > 4, "constraint 'pt.x  > 4' does not hold for x: "+ pt.x);
        assert(pt.x + pt.y === 10, "constraint 'pt.x + pt.y === 10' does not hold for x: "+ pt.x + ", y: " + pt.y);
    
        var oldValueX = pt.x;
        var oldValueY = pt.y;
        
        try {
            pt.y = 7;
        } catch (e) {
            errorThrown = true;
        }
        assert(errorThrown, "no error was thrown on new value y = 7 with constraints 'pt.x + pt.y === 10' and 'pt.x  > 4'; x: " + pt.x + ", y: " + pt.y);
        assert(pt.y === oldValueY, "old value of y not restored after failed assignment; currentY: " + pt.y + ", oldY: " + oldValueY);
        assert(pt.x === oldValueX, "old value of x not restored after failed assignment; currentX: " + pt.x + ", oldX: " + oldValueX);
    })
    it('should UnsatisfiableConstraint', function () {
        var solver = bbb.defaultSolver = new csp.Solver(),
            pt = {x: 5, y: 2},
            errorThrown = false;
        
        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                pt: pt,
                _$_self: this.doitContext || this
            }
        }, function() {
            return pt.x.is in [1, 2, 3];;
        });
        
        try {
            bbb.always({
                ctx: {
                    bbb: bbb,
                    csp: csp,
                    solver: solver,
                    pt: pt,
                    _$_self: this.doitContext || this
                }
            }, function() {
                return pt.x >= 5;;
            });
        } catch (e) {
            errorThrown = true;
        }
    
        assert(errorThrown, "no error was thrown on unsatisfiable constraint");
    })
});

describe("on error", function() {
    it('should OnErrorCassowaryConstraintConstruction', function () {
        var obj = {a: 0},
            onErrorCalled = false;

        bbb.defaultSolver = new ClSimplexSolver();
        
        bbb.always({
            onError: function() {
                onErrorCalled = true;
            },
            ctx: {
                bbb: bbb,
                obj: obj,
                _$_self: this.doitContext || this
            }
        }, function() {
            return obj.a == 0;;
        });

        bbb.always({
            onError: function() {
                onErrorCalled = true;
            },
            ctx: {
                bbb: bbb,
                obj: obj,
                _$_self: this.doitContext || this
            }
        }, function() {
            return obj.a == 10;;
        });
    
        assert(onErrorCalled, "onError was not called; obj.a: " + obj.a);
    })
    it('should OnErrorCassowaryAssignment', function () {
        var obj = {a: 0},
            onErrorCalled = false;

        bbb.defaultSolver = new ClSimplexSolver();
        
        bbb.always({
            onError: function() {
                onErrorCalled = true;
            },
            ctx: {
                bbb: bbb,
                obj: obj,
                _$_self: this.doitContext || this
            }
        }, function() {
            return obj.a == 0;;
        });

        obj.a = 10;
        
        assert(onErrorCalled, "onError was not called; obj.a: " + obj.a);
    })
    xit("OnErrorDeltaBlueConstraintConstruction", function () {
        var obj = {int: 17, str: "17"},
            onErrorCalled = false;

        bbb.defaultSolver = new DBPlanner();
        
        bbb.always({
            onError: function() {
                onErrorCalled = true;
            },
            ctx: {
                obj: obj
            }, methods: function() {
                obj.int.formula([obj.str], function (str) { return parseInt(str); });
                obj.str.formula([obj.int], function (int) { return int + ""; })
            }
        }, function () {
            return obj.int + "" === obj.str;
        });
        bbb.always({
            onError: function() {
                onErrorCalled = true;
            },
            ctx: {
                obj: obj
            }, methods: function() {
                obj.int.formula([obj.str], function (str) { return parseInt(str)-1; });
                obj.str.formula([obj.int], function (int) { return (int+1) + ""; })
            }
        }, function () {
            return (obj.int+1) + "" === obj.str;
        });

        obj.str = "10";
        
        assert(onErrorCalled, "onError was not called; obj.a: " + obj.a);
    })
    it('should OnErrorCSPConstraintConstruction', function () {
        var pt = {x: 5, y: 2},
            onErrorCalled = false,
            errorMessage = "";

        bbb.defaultSolver = new csp.Solver();
        
        bbb.always({
            onError: function(e) {
                onErrorCalled = true;
                errorMessage = e.message;
            },
            ctx: {
                pt: pt,
                _$_self: this.doitContext || this
            }
        }, function() {
            return pt.x.is in [1, 2, 3];;
        });
        
        bbb.always({
            onError: function(e) {
                onErrorCalled = true;
                errorMessage = e.message;
            },
            ctx: {
                pt: pt,
                _$_self: this.doitContext || this
            }
        }, function() {
            return pt.x >= 5;;
        });
    
        assert(onErrorCalled, "onError was not called");
        assert(errorMessage === "constraint cannot be satisfied", "an unexpected error was thrown, message: " + errorMessage);
    })
    it('should OnErrorCSPAssignment', function () {
        var pt = {x: 1, y: 2},
            onErrorCalled = false,
            errorMessage = "";

        bbb.defaultSolver = new csp.Solver();
        
        bbb.always({
            onError: function(e) {
                onErrorCalled = true;
                errorMessage = e.message;
            },
            ctx: {
                pt: pt,
                _$_self: this.doitContext || this
            }
        }, function() {
            return pt.x.is in [1, 2, 3];;
        });

        assert(!onErrorCalled, "onError called unexpectedly");

        pt.x = 5;
    
        assert(onErrorCalled, "onError was not called");
        assert(errorMessage === "assigned value is not contained in domain", "an unexpected error was thrown, message: " + errorMessage);
    })
    it('should OnErrorRelaxConstraintConstruction', function () {
        var pt = {x: 5},
            onErrorCalled = false,
            errorMessage = "";

        bbb.defaultSolver = new Relax();
        
        bbb.always({
            onError: function(e) {
                onErrorCalled = true;
                errorMessage = e.message;
            },
            ctx: {
                pt: pt,
                _$_self: this.doitContext || this
            }
        }, function() {
            return pt.x == 5;;
        });
        
        bbb.always({
            onError: function(e) {
                onErrorCalled = true;
                errorMessage = e.message;
            },
            ctx: {
                pt: pt,
                _$_self: this.doitContext || this
            }
        }, function() {
            return pt.x >= 20;;
        });
    
        assert(onErrorCalled, "onError was not called");
        assert(errorMessage === "Could not satisfy constraint", "an unexpected error was thrown, message: " + errorMessage);
    })
});

class DefaultSolversFixture {
    saveDefaultSolvers(defaultSolvers) {
        this.previousDefaultSolvers = bbb.defaultSolvers;
        this.previousDefaultSolver = bbb.defaultSolver;
        this.previousReevaluationInterval = bbb.defaultReevaluationInterval;
    }
    restoreDefaultSolvers() {
        bbb.defaultSolvers = this.previousDefaultSolvers;
        bbb.defaultSolver = this.previousDefaultSolver;
        bbb.defaultReevaluationInterval = this.previousReevaluationInterval;
    }
}

function preparePatchedSolvers() {
    // prepare solvers of which the solving time and actions can be dictated
    patchedSolver = new ClSimplexSolver();
    patchedSolver.forcedDelay = 0;
    patchedSolver.solve = function() {
        var begin = performance.now();
        while (performance.now() < begin + this.forcedDelay) {
            ; // busy wait, no sleep in JavaScript
            // and setTimeout is not what we want
        }
        if (typeof this.forcedSolveAction === 'function') {
            return this.forcedSolveAction();
        }
        return ClSimplexSolver.prototype.solve.apply(this, arguments);
    }
    PatchedSolver = function() {}
    PatchedSolver.prototype = patchedSolver;
    bbb.defaultSolvers = [new PatchedSolver(), new PatchedSolver()];
}

describe('AutomaticSolverSelectionDetailsTest', function() {
    var self = {};
  
    beforeEach(() => {
        self.defaultSolversFixture = new DefaultSolversFixture();
        self.defaultSolversFixture.saveDefaultSolvers();
        bbb.defaultSolvers = [new ClSimplexSolver(), new DBPlanner(), new csp.Solver()];
        bbb.defaultSolver = null;
    })

    afterEach(() => {
        self.defaultSolversFixture.restoreDefaultSolvers();
    })

    it('should SquaredChangeDistance', function () {
        var obj = {a: 2, b: 3};
        var constraint = bbb.always({
            ctx: {
                obj: obj
            }
        }, function() {
            return obj.a + obj.b == 3;
        });
        assert(constraint.comparisonMetrics.squaredChangeDistance() ==
                    (obj.a - 2) * (obj.a - 2) + (obj.b - 3) * (obj.b - 3),
            "squaredChangeDistance should be the sum of the squared distances");
    })

    it('should ChoiceWithTimeOverDistance1', function() {
        preparePatchedSolvers();
        bbb.defaultSolvers[0].forcedDelay = 0;
        bbb.defaultSolvers[1].forcedDelay = 10;
        // when: create actual constraint
        var obj = {a: 2, b: 3};
        var constraint = bbb.always({
            ctx: {
                obj: obj
            },
            logTimings: true,
            optimizationPriority: ['time', 'squaredChangeDistance'],
        }, function() {
            return obj.a + obj.b == 3;
        });
        // then: assert that the faster solver was chosen
        assert(constraint.solver === bbb.defaultSolvers[0], 'The faster solver should have been chosen');
    })

    it('should ChoiceWithTimeOverDistance2', function() {
        preparePatchedSolvers();
        bbb.defaultSolvers[0].forcedDelay = 10;
        bbb.defaultSolvers[1].forcedDelay = 0;
        // when: create actual constraint
        var obj = {a: 2, b: 3};
        var constraint = bbb.always({
            ctx: {
                obj: obj
            },
            optimizationPriority: ['time', 'squaredChangeDistance'],
        }, function() {
            return obj.a + obj.b == 3;
        });
        // then: assert that the faster solver was chosen
        assert(constraint.solver === bbb.defaultSolvers[1], 'The faster solver should have been chosen');
    })

    it('should ChoiceWithDistanceOverTime1', function() {
        preparePatchedSolvers();
        var constraint0 = null, constraint1 = null;
        bbb.defaultSolvers[0].forcedDelay = 10;
        bbb.defaultSolvers[0].forcedSolveAction = function () {
            if (!!Constraint.current) {
                Constraint.current.enable = arguments.callee;
                constraint0 = Constraint.current;
            }
            constraint0.constraintvariables[0].setValue(2);
            constraint0.constraintvariables[1].setValue(1);
        }
        bbb.defaultSolvers[1].forcedDelay = 0;
        bbb.defaultSolvers[1].forcedSolveAction = function () {
            if (!!Constraint.current) {
                Constraint.current.enable = arguments.callee;
                constraint1 = Constraint.current;
            }
            constraint1.constraintvariables[0].setValue(10);
            constraint1.constraintvariables[1].setValue(-7);
        }
        // when: create actual constraint
        var obj = {a: 2, b: 3};
        var constraint = bbb.always({
            ctx: {
                obj: obj
            },
            optimizationPriority: ['squaredChangeDistance', 'time'],
        }, function() {
            return obj.a + obj.b == 3;
        });
        // then
        assert(constraint.solver === bbb.defaultSolvers[0], 'The solver with the smaller distance should have been chosen (albeit slower)');
    })

    it('should ChoiceWithNumberOfChangedVariablesOverTime1', function() {
        preparePatchedSolvers();
        var constraint0 = null, constraint1 = null;
        bbb.defaultSolvers[0].forcedDelay = 10;
        bbb.defaultSolvers[0].forcedSolveAction = function () {
        }
        bbb.defaultSolvers[1].forcedDelay = 0;
        bbb.defaultSolvers[1].forcedSolveAction = function () {
            if (!!Constraint.current) {
                Constraint.current.enable = arguments.callee;
                constraint1 = Constraint.current;
            }
            constraint1.constraintvariables[0].setValue(10);
            constraint1.constraintvariables[1].setValue(-7);
        }
        // when: create actual constraint
        var obj = {a: 2, b: 1};
        var constraint = bbb.always({
            ctx: {
                obj: obj
            },
            optimizationPriority: ['numberOfChangedVariables', 'time'],
        }, function() {
            return obj.a + obj.b == 3;
        });
        // then
        assert(constraint.solver === bbb.defaultSolvers[0], 'The solver with the smaller distance should have been chosen (albeit slower)');
    })

    it('should ChoiceWithNumberOfChangedVariablesOverTime2', function() {
        preparePatchedSolvers();
        var constraint0 = null, constraint1 = null;
        bbb.defaultSolvers[0].forcedDelay = 10;
        bbb.defaultSolvers[0].forcedSolveAction = function () {
            if (!!Constraint.current) {
                Constraint.current.enable = arguments.callee;
                constraint0 = Constraint.current;
            }
            constraint0.constraintvariables[0].setValue(10);
            constraint0.constraintvariables[1].setValue(-7);
        }
        bbb.defaultSolvers[1].forcedDelay = 0;
        bbb.defaultSolvers[1].forcedSolveAction = function () {
        }
        // when: create actual constraint
        var obj = {a: 2, b: 1};
        var constraint = bbb.always({
            ctx: {
                obj: obj
            },
            optimizationPriority: ['numberOfChangedVariables', 'time'],
        }, function() {
            return obj.a + obj.b == 3;
        });
        // then
        assert(constraint.solver === bbb.defaultSolvers[1], 'The solver with the smaller distance should have been chosen (albeit slower)');
    })

    it('should ChoiceWithDistanceOverTime2', function() {
        preparePatchedSolvers();
        var constraint0 = null, constraint1 = null;
        bbb.defaultSolvers[0].forcedDelay = 0;
        bbb.defaultSolvers[0].forcedSolveAction = function () {
            if (!!Constraint.current) {
                Constraint.current.enable = arguments.callee;
                constraint0 = Constraint.current;
            }
            constraint0.constraintvariables[0].setValue(10);
            constraint0.constraintvariables[1].setValue(-7);
        }
        bbb.defaultSolvers[1].forcedDelay = 10;
        bbb.defaultSolvers[1].forcedSolveAction = function () {
            if (!!Constraint.current) {
                Constraint.current.enable = arguments.callee;
                constraint1 = Constraint.current;
            }
            constraint1.constraintvariables[0].setValue(2);
            constraint1.constraintvariables[1].setValue(1);
        }
        // when: create actual constraint
        var obj = {a: 2, b: 3};
        var constraint = bbb.always({
            ctx: {
                obj: obj
            },
            optimizationPriority: ['squaredChangeDistance', 'time'],
        }, function() {
            return obj.a + obj.b == 3;
        });
        // then
        assert(constraint.solver === bbb.defaultSolvers[1], 'The solver with the smaller distance should have been chosen (albeit slower)');
    })

    it('should StringsAndSquaredChangeDistance', function() {
        // we do not support a distance for string values
        // but it should not break the solver selection process
        var subject = {hat: '', shoes: 'black'};
        var constraint = bbb.always({
            ctx: {
                subject: subject
            },
            optimizationPriority: ['squaredChangeDistance', 'time'],
        }, function () {
            return subject.hat === subject.shoes;
        });
        assert(subject.hat === subject.shoes);
    })
});

describe('AutomaticSolverSelectionTest', function() {
  var self = {};
  
    beforeEach(() => {
        this.defaultSolversFixture = new DefaultSolversFixture();
        this.defaultSolversFixture.saveDefaultSolvers();
        bbb.defaultSolvers = [new ClSimplexSolver(), new DBPlanner(), new csp.Solver()];
        bbb.defaultSolver = null;
    })

    afterEach(() => {
        this.defaultSolversFixture.restoreDefaultSolvers();
    })

    it('should SimpleConstraintWithoutSolver', function () {
        var obj = {a: 2, b: 3};
        bbb.always({
            ctx: {
                obj: obj
            }
        }, function() {
            return obj.a + obj.b == 3;
        });
        assert(obj.a + obj.b == 3, "Automatic solver selection did not produce a working solution");
    })

    it('should SuggestingNewValues', function () {
        var obj = {a: 2, b: 3};
        bbb.always({
            ctx: {
                obj: obj
            }
        }, function() {
            return obj.a + obj.b == 3;
        });
        assert(obj.a + obj.b == 3, "Automatic solver selection did not produce a " +
                    "working solution");
        obj.a = 1;
        assert(obj.a === 1, "Assignment should be honored");
        assert(obj.a + obj.b == 3, "Constraint should have adapted the other " +
                    "variable to fulfill the constraint");
        obj.b = 3;
        assert(obj.b === 3, "Assignment should be honored");
        assert(obj.a + obj.b == 3, "Constraint should have adapted the other " +
                    "variable to fulfill the constraint");
    })

    it('should SelfAssignmentOperations', function () {
        bbb.defaultSolvers = [new ClSimplexSolver(), new ClSimplexSolver()];
        var obj = {a: 2, b: 3};
        bbb.always({
            ctx: {
                obj: obj
            }
        }, function() {
            return obj.a + obj.b == 3;
        });
        assert(obj.a + obj.b == 3, "Automatic solver selection did not produce a " +
                    "working solution");
        var oldA = obj.a;
        obj.a += 1;
        assert(obj.a === oldA + 1, "Assignment should be honored");
        assert(obj.a + obj.b == 3, "Constraint should have adapted the other " +
                    "variable to fulfill the constraint");
        obj.a += 1;
        assert(obj.a === oldA + 2, "Assignment should be honored");
        assert(obj.a + obj.b == 3, "Constraint should have adapted the other " +
                    "variable to fulfill the constraint");
    })

    // TODO: move this to Details test case
    it('should ConstraintVariableDefiningConstraint', function () {
        var obj = {a: 2, b: 3};
        var constraint = bbb.always({
            ctx: {
                obj: obj
            }
        }, function() {
            return obj.a + obj.b == 3;
        });
        for (var i = 0; i < constraint.constraintvariables.length; i++) {
            var constraintVariable = constraint.constraintvariables[i];
            assert(constraintVariable.definingConstraint === constraint);
        }
    })

    it('should SimplePropagationShouldChooseDeltaBlue', function() {
        var o = {string: "0",
                 number: 0};

        bbb.always({
            ctx: {
                o: o
            }, methods: function () {
                o.string.formula([o.number], function (num) { return num + "" });
                o.number.formula([o.string], function (str) { return parseInt(str) });
            }
        }, function () {
            return o.string == o.number + "";
        });

        assert(o.string === o.number + "");
        o.string = "1"
        assert(o.number === 1);
        o.number = 12
        assert(o.string === "12");
    })
    it('should BacktalkPaperExampleWithAutomaticSolverSelection', function () {
        var man = {
            shoes: "foo",
            shirt: "foo",
            pants: "foo",
            hat: "foo"
        };
        
        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                man: man,
                _$_self: this.doitContext || this
            }
        }, function() {
            return man.shoes.is in ["brown", "black"];;
        });

        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                man: man,
                _$_self: this.doitContext || this
            }
        }, function() {
            return man.shirt.is in ["brown", "blue", "white"];;
        });
        
        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                man: man,
                _$_self: this.doitContext || this
            }
        }, function() {
            return man.pants.is in ["brown", "blue", "black", "white"];;
        });
        
        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                man: man,
                _$_self: this.doitContext || this
            }
        }, function() {
            return man.hat.is in ["brown"];;
        });
        
        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                man: man,
                _$_self: this.doitContext || this
            }
        }, function() {
            return man.shoes === man.hat;;
        });

        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                man: man,
                _$_self: this.doitContext || this
            }
        }, function() {
            return man.shoes !== man.pants;;
        });

        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                man: man,
                _$_self: this.doitContext || this
            }
        }, function() {
            return man.shoes !== man.shirt;;
        });

        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                man: man,
                _$_self: this.doitContext || this
            }
        }, function() {
            return man.shirt !== man.pants;;
        });

        assert(man.hat === "brown", "hat's domain is restricted to 'brown' only");
        assert(man.shoes === "brown", "shoes have to be 'brown'");
        assert(man.shirt === "blue" || man.shirt === "white", "shirt has to be 'blue' or 'white'");
        assert(man.shirt !== man.pants, "shirt and pants must not have the same color");
        assert(man.pants === "black" || man.pants === "blue" || man.pants === "white", "pants should be 'black', 'blue' or 'white'");
    })
    it('should FilteringByPriority', function () {
        var testCase = this;
        Object.subclass('DummySolver', {
            always: function(opts, func) { testCase._askedDummySolver = true; throw new Error('will be caught'); },
            solverName: 'TestDummy',
            supportsMethods: function() { return true; },
            supportsSoftConstraints: function() { return false; },
            supportsFiniteDomains: function() { return false; },
            supportedDataTypes: function() { return ['number']; }
        });

        bbb.defaultSolvers = [new DummySolver(), new ClSimplexSolver()];
        var obj = {a: 2, b: 3};
        bbb.always({
            ctx: {
                obj: obj
            },
            logReasons: true,
            priority: 'low',
        }, function() {
            return obj.a + obj.b == 3;
        });
        assert(!this._askedDummySolver, "should not have asked solver to try");
        assert(obj.a + obj.b == 3, "Automatic solver selection did not produce a working solution");
    })
    it('should FilteringByMethods', function () {
        var testCase = this;
        Object.subclass('DummySolver', {
            always: function(opts, func) { testCase._askedDummySolver = true; throw new Error('will be caught'); },
            solverName: 'TestDummy',
            supportsMethods: function() { return false; },
            supportsSoftConstraints: function() { return false; },
            supportsFiniteDomains: function() { return false; },
            supportedDataTypes: function() { return ['number', 'string']; }
        });
        
        bbb.defaultSolvers = [new DummySolver(), new DBPlanner()];
        var o = {string: "0",
                 number: 0};

        bbb.always({
            ctx: {
                o: o
            }, methods: function () {
                o.string.formula([o.number], function (num) { return num + "" });
                o.number.formula([o.string], function (str) { return parseInt(str) });
            },
            logReasons: true
        }, function () {
            return o.string == o.number + "";
        });

        assert(!this._askedDummySolver, "should not have asked solver to try");
        assert(o.string === o.number + "");
        o.string = "1"
        assert(o.number === 1);
        o.number = 12
        assert(o.string === "12");
    })
    it('should FilteringByDataTypeOnSlots', function () {
        var testCase = this;
        Object.subclass('DummySolver', {
            always: function(opts, func) { testCase._askedDummySolver = true; throw new Error('will be caught'); }, 
            solverName: 'TestDummy',
            supportsMethods: function() { return true; },
            supportsSoftConstraints: function() { return true; },
            supportsFiniteDomains: function() { return false; },
            supportedDataTypes: function() { return ['string']; }
        });

        bbb.defaultSolvers = [new DummySolver(), new ClSimplexSolver()];
        var obj = {a: 2, b: 3};
        bbb.always({
            ctx: {
                obj: obj
            },
            logReasons: true
        }, function() {
            return obj.a + obj.b == 3;
        });
        assert(!this._askedDummySolver, "should not have asked solver to try");
        assert(obj.a + obj.b == 3, "Automatic solver selection did not produce a working solution");
    })
    it('should FilteringByDataTypeOnCalls', function () {
        var testCase = this;
        Object.subclass('DummySolver', {
            always: function(opts, func) { testCase._askedDummySolver = true; throw new Error('will be caught'); },
            solverName: 'TestDummy',
            supportsMethods: function() { return true; },
            supportsSoftConstraints: function() { return true; },
            supportsFiniteDomains: function() { return false; },
            supportedDataTypes: function() { return ['string']; }
        });

        bbb.defaultSolvers = [new DummySolver(), new ClSimplexSolver()];
        var obj = {a: 2, get: function(){ return this.a; }};
        obj[0] = 3;
        var inc = function(i) { return i + 1;};
        bbb.always({
            ctx: {
                obj: obj,
                inc: inc
            },
            logReasons: true
        }, function() {
            return obj.get() == inc(obj[0]);
        });
        assert(!this._askedDummySolver, "should not have asked solver to try");
        assert(obj.get() == inc(obj[0]), "Automatic solver selection did not produce a working solution");
    })
    it('should FilteringByFiniteDomains', function () {
        var testCase = this;
        Object.subclass('DummySolver', {
            always: function(opts, func) { testCase._askedDummySolver = true; throw new Error('will be caught'); },
            solverName: 'TestDummy',
            supportsMethods: function() { return true; },
            supportsSoftConstraints: function() { return true; },
            supportsFiniteDomains: function() { return false; },
            supportedDataTypes: function() { return ['string']; }
        });

        bbb.defaultSolvers = [new DummySolver(), new csp.Solver()];
        
        var man = {
            shoes: "foo"
        };
        
        bbb.always({
            ctx: {
                man: man
            },
            logReasons: true
        }, function() {
            return man.shoes.is in ["brown", "black"];;
        });
        assert(!this._askedDummySolver, "should not have asked solver to try");
        assert(man.shoes === "brown" || man.shoes === "black", "Automatic solver selection did not produce a working solution");
    })
    it('should ReevaluationAfterDefaultNumberOfSolvingOperations', function() {
        preparePatchedSolvers();
        var obj = {a: 2, b: 3};
        bbb.defaultSolvers[0].forcedDelay = 10;
        bbb.defaultSolvers[1].forcedDelay = 0;
        bbb.defaultReevaluationInterval = 2; // recalculate after two updates
        var constraint = bbb.always({
            ctx: {
                obj: obj
            }
        }, function() {
            return obj.a + obj.b == 3;
        });
        assert(constraint.solver === bbb.defaultSolvers[1],
                    "the initially faster solver should have been chosen");
        bbb.defaultSolvers[0].forcedDelay = 0;
        bbb.defaultSolvers[1].forcedDelay = 10;
        for (var i = 0; i < 2; i++) {
            obj.a += 1;
        }
        assert(constraint.solver === bbb.defaultSolvers[0],
                    "the solver should have changed to the new faster solver");
        bbb.defaultSolvers[1].forcedSolveAction = function() {
            assert(false, 'The slower solver should not be called anymore.');
        }.bind(this);
        constraint.reevaluationInterval = 1000;
        obj.a += 1;
    })

    it('should CallsToSolvers', function() {
        preparePatchedSolvers();
        var obj = {a: 2, b: 3, c: 5};
        bbb.defaultSolvers[0].forcedDelay = 10;
        bbb.defaultSolvers[1].forcedDelay = 0;
        var constraint = bbb.always({
            ctx: {
                obj: obj
            },
            reevaluationInterval: 3
        }, function() {
            return obj.a + obj.b == 3 && obj.c == obj.a + obj.b;
        });
        bbb.defaultSolvers[0].solveCalls = 0;
        bbb.defaultSolvers[0].forcedSolveAction = function() {
            this.solveCalls += 1;
            ClSimplexSolver.prototype.solve.call(this);
        };
        bbb.defaultSolvers[1].solveCalls = 0;
        bbb.defaultSolvers[1].forcedSolveAction = bbb.defaultSolvers[0].forcedSolveAction;
        var otherSolver = bbb.defaultSolvers[constraint.solver === bbb.defaultSolvers[0] ?
            1 : 0];
        for (var i = 0; i < 2; i++) {
            obj.a += 1;
        }
        assert(constraint.solver.solveCalls >= 2, 'Chosen solver should have ' +
                    'been called two times');
        assert(otherSolver.solveCalls === 0, 'Unselected solver should ' +
                    'not have been called');
        constraint.solver.solveCalls = 0;
        otherSolver.solveCalls = 0;
        obj.a += 1; // should cause reevaluation
        assert(constraint.solver.solveCalls >= 1, 'Chosen solver should have ' +
                    'been called for reevaluation');
        assert(otherSolver.solveCalls >= 1, 'Unselected solver should ' +
                    'have been called for reevaluation');
        // in case the solver has changed, update our otherSolver variable
        // (it should not, but we do not wish to assert that here)
        var otherSolver = bbb.defaultSolvers[constraint.solver === bbb.defaultSolvers[0] ?
            1 : 0];
        constraint.solver.solveCalls = 0;
        otherSolver.solveCalls = 0;
        for (var i = 0; i < 2; i++) {
            obj.a += 1;
        }
        assert(constraint.solver.solveCalls >= 2, 'Chosen solver should be called');
        assert(otherSolver.solveCalls === 0, 'Unchosen solver should not be called');
        constraint.solver.solveCalls = 0;
        otherSolver.solveCalls = 0;
        obj.a += 1; // should cause reevaluation
        assert(constraint.solver.solveCalls >= 1, 'Chosen solver should have ' +
                    'been called for reevaluation');
        assert(otherSolver.solveCalls >= 1, 'Unselected solver should ' +
                    'have been called for reevaluation');
    })
});
