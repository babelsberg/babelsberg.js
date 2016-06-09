import Constraint from './constraint.js';

import {recursionGuard} from './util.js'

// import * as z3 from './z3.js';
//import Cassowary from './bbb-rhea.js';
import * as deltablue from '../deltablue/deltablue.js';
import Relax from './bbb-relax.js';
import * as backtalk from '../backtalk/backtalk.js';

import {EmptyECJIT} from './jit.js'

/**
 * The interface to create, maintain and remove constraints.
 * @class Babelsberg
 */
export class Babelsberg {

    constructor() {
        this.defaultSolvers = [
            // new Cassowary(),
            new deltablue.Planner(),
            new Relax(),
            // new CommandLineZ3(),
            // new StrZ3(),
            new backtalk.Solver()
            // new csp.Solver()
        ];
        this.defaultReevaluationInterval = 1000;
        this.callbacks = [];
        this.ecjit = new EmptyECJIT();
    }

    get isConstraintObject() { return true }

    /**
     * Removes the listener on the given property of the given object.
     * @function Babelsberg#unconstrain
     * @public
     * @param {Object} obj The object whose property should be unconstrained.
     * @param {string} accessor The name of the property to be unconstrained.
     */
    unconstrain(obj, accessor) {
        if (!obj) return;
        var cvar = ConstrainedVariable.findConstraintVariableFor(obj, accessor);
        if (!cvar) return;
        var cGetter = obj.__lookupGetter__(accessor),
            cSetter = obj.__lookupSetter__(accessor);
        if (!cGetter && !cSetter) {
            return;
        }
        if (!cGetter.isConstraintAccessor || !cSetter.isConstraintAccessor) {
            throw 'too many accessors - ' +
                'unconstrain only works for the very simple case now';
        }
        ConstrainedVariable.deleteConstraintVariableFor(obj, accessor);
        var newName = cvar.newIvarname;
        var existingSetter = obj.__lookupSetter__(newName),
            existingGetter = obj.__lookupGetter__(newName);
        if (existingGetter) {
            obj.__defineGetter__(accessor, existingGetter);
        }
        if (existingSetter) {
            obj.__defineSetter__(accessor, existingSetter);
        }
        if (!existingSetter || !existingGetter) {
            delete obj[accessor];
        }
        obj[accessor] = obj[newName];
        delete obj[newName];

        // recursive unconstrain
        var child = obj[accessor];
        bbb.unconstrainAll(child);
    }

    /**
     * Removes all listener on the given object.
     * @function Babelsberg#unconstrainAll
     * @public
     * @param {Object} obj The object whose property should be unconstrained.
     */
    unconstrainAll(obj) {
        if (obj && obj instanceof Object) {
            Object.keys(obj).forEach(function(property, index) {
                var cvar = ConstrainedVariable.findConstraintVariableFor(
                    obj,
                    property
                );
                if (!cvar) return;
                var cGetter = obj.__lookupGetter__(property),
                    cSetter = obj.__lookupSetter__(property);
                if (!cGetter && !cSetter) return;
                if (!cGetter.isConstraintAccessor || !cSetter.isConstraintAccessor) {
                    return;
                }

                bbb.unconstrain(obj, property);
            });
        }

    }

    /**
     * Some solvers, like Cassowary and DeltaBlue, handle assignments
     * by using temporary constraint that reflects the
     * assignments. The creation and deletion of these constraints can
     * be costly if assignments are done frequently. The edit function
     * is one way to deal with this issue. Use it on attributes that
     * are frequently modified for better performance.
     * @function Babelsberg#edit
     * @public
     * @param {Object} obj An object that is modified quite often.
     * @param {string[]} accessors The property names of the properties that are modified.
     * @return {function} {
     *    A callback that can be used to assign new values to the given properties.
     * }
     * @example Example usage of bbb.edit
     * var s = new deltablue.Planner(),
     *     obj = {int: 42, str: "42"};
     *
     * // Keep the attributes 'str' and 'int' in sync.
     * bbb.always({
     *     solver: deltablue,
     *     ctx: {
     *         obj: obj
     *     }, methods() {
     *         obj.int.formula([obj.str], function (str) { return parseInt(str); });
     *         obj.str.formula([obj.int], function (int) { return int + ""; })
     *     }
     * }, function () {
     *     return obj.int + "" === obj.str;
     * });
     *
     * // Create an edit constraint for frequent assignments on obj.int.
     * var callback = bbb.edit(obj, ["int"]);
     * // Assign 17 as the new value of obj.int. Constraints are solved automatically.
     * callback([17]);
     */
    edit(obj, accessors) {
        var extVars = {},
            cVars = {},
            extConstraints = [],
            solvers = [],
            callback = function(newObj) {
                if (!newObj) { // end-of-edit
                    for (var prop in extVars) {
                        extVars[prop].forEach(function(evar) {
                            evar.finishEdit();
                        });
                    }
                    solvers.forEach(function(solver) {
                        solver.editConstraints.splice(
                            solver.editConstraints.indexOf(callback), 1);
                    });
                    solvers.invoke('endEdit');
                } else {
                    var newEditConstants = newObj;
                    if (!Object.isArray(newObj)) {
                        newEditConstants = accessors.map(function(accessor) {
                            return newObj[accessor];
                        });
                    }
                    solvers.invoke('resolveArray', newEditConstants);
                    accessors.forEach(function(a) {
                        cVars[a].suggestValue(cVars[a].externalValue);
                        // extVars[a] = extVars[a]; // set the value,
                        // propagates change to other property
                        // accessors calls the setters does not
                        // recurse into solvers, because they have
                        // already adopted the correct value
                    });
                }
            };

        accessors.forEach(function(accessor) {
            var cvar = ConstrainedVariable.findConstraintVariableFor(obj, accessor);
            if (!cvar) {
                throw 'Cannot edit ' + obj + '["' + accessor +
                    '"], because it isn\'t constrained';
            }
            var evars = Properties.values(cvar._externalVariables);
            if (evars.compact().length < evars.length) {
                throw 'Cannot edit ' + obj + '["' + accessor +
                    '"], because it is in a recalculate relation';
            }
            var hasEditSolver = cvar.solvers.any(function(s) {
                return !Object.isFunction(s.beginEdit);
            });
            if (hasEditSolver) {
                throw 'Cannot edit ' + obj + '["' + accessor +
                    '"], because it is in a no-edit solver';
            }
            cVars[accessor] = cvar;
            extVars[accessor] = evars;
            solvers = solvers.concat(cvar.solvers).uniq();
            evars.forEach(function(evar) {
                evar.prepareEdit();
            });
        });

        solvers.forEach(function(solver) {
            if (solver.editConstraints === undefined)
                solver.editConstraints = [];
            solver.editConstraints.push(callback);
        });

        solvers.invoke('beginEdit');
        return callback;
    }

    /**
     * Marks the given object as readonly. This functionality is only
     * supported for some solvers.
     * @function Babelsberg#readonly
     * @public
     * @param {Object} obj The object that should not be modified.
     * @example Example usage of bbb.readonly
     * var s = new Cassowary(),
     *     pt = {x: 1, y: 2, z: 3};
     *
     * // The x and y coordinate of the point should sum up to its z coordinate.
     * // Cassowary is not allowed to change the value of pt.y in order to
     * // fulfill this constraint.
     * always: { solver: s
     *     pt.x + bbb.readonly(pt.y) == pt.z
     * }
     *
     * // This assignment cannot modify pt.y, but rather changes pt.z.
     * pt.x = 4;
     */
    readonly(obj) {
        if (obj.isConstraintObject) {
            obj.setReadonly(true);
        } else {
            if (Constraint.current && Constraint.current.solver) {
                Properties.own(obj).forEach(function(ea) {
                    var cvar = ConstrainedVariable.newConstraintVariableFor(obj, ea);
                    cvar.addToConstraint(Constraint.current);
                    cvar.ensureExternalVariableFor(Constraint.current.solver);
                    if (cvar.isSolveable()) {
                        bbb.readonly(cvar.externalVariables(Constraint.current.solver));
                    }
                });
            }
        }
        return obj;
    }

    /**
     * Creates a constraint equivalent to the given function.
     * @function Babelsberg#always
     * @public
     * @param {Object} opts An options object to configure the constraint construction.
     * @param {Object} opts.ctx The local scope in which the given function is executed.
     * @param {Object} [opts.solver] The solver to maintain the constraint.
     * @param {boolean} [opts.allowTests=false]
     *     If true, allows to specify assertions rather than solvable constraints.
     * @param {boolean} [opts.allowUnsolvableOperations=false]
     *     If true, allows the use of operations that are not supported by the solver.
     * @param {boolean} [opts.debugging=false]
     *     If true, calls debugger at certain points during constraint construction.
     * @param {boolean} [opts.logTimings=false]
     *     If true, prints solver timings to console.
     * @param {boolean} [opts.logReasons=false]
     *     If true, logs why certain solvers are not used for a constraint.
     * @param {function} func The constraint to be fulfilled.
     */
    always(opts, func) {
        var solvers = this.chooseSolvers(opts.solver),
            errors = [];

        func.allowTests = (opts.allowTests === true);
        func.allowUnsolvableOperations = (opts.allowUnsolvableOperations === true);
        func.debugging = opts.debugging;
        func.onError = opts.onError;
        //TODO: remove this from all solver implementations or move to filterSolvers
        func.varMapping = opts.ctx;

        // solvers = this.filterSolvers(solvers, opts, func);
        var constraints = this.createEquivalentConstraints(solvers, opts, func, errors);
        var constraint = this.chooseConstraint(constraints, opts, errors);
        if (!opts.postponeEnabling && constraint) {
            try {
                constraint.isAnyVariableCurrentlySuggested = true; // do not increase
                                                                   // updateCounter
                try {
                    constraint.enable();
                } finally {
                    constraint.isAnyVariableCurrentlySuggested = false;
                }
            } catch (e) {
                errors.push(e);
                constraint.disable();
                constraint.abandon();
                constraint = null;
            }
        }
        if (constraint) {
            this.abandonAllConstraintsExcept(constraint, constraints);
        } else {
            if (typeof opts.onError === 'function') {
                bbb.addCallback(opts.onError, opts.onError.constraint, errors);
            } else {
                bbb.addCallback(function(e) {
                    e = e || new Error('No solver available!');
                    e.errors = Array.from(arguments);
                    throw e;
                }, null, errors);
            }
        }
        bbb.processCallbacks();
        return constraint;
    }

    abandonAllConstraintsExcept(constraintToKeep, constraints) {
        constraints.forEach(function(each) {
            if (each !== constraintToKeep && each !== null)
                each.abandon();
        });
    }

    stay(opts, func) {
        func.allowTests = (opts.allowTests === true);
        func.allowUnsolvableOperations = (opts.allowUnsolvableOperations === true);
        func.debugging = opts.debugging;
        func.onError = opts.onError;
        func.varMapping = opts.ctx;
        var solver = (opts.solver || this.defaultSolver),
            c = new Constraint(func, solver);
        c.constraintvariables.forEach(function(cv) {
            try {
                cv.externalVariables(solver).stay(opts.priority);
            } catch (e) {
                console.log('Warning: could not add stay to ' + cv.ivarname);
            }
        }.bind(this));
        return true;
    }

    /**
     * Creates a constraint equivalent to the given function through
     * Babelsberg#always, and then disables it immediately
     * @function Babelsberg#once
     * @public
     */
    once(opts, func) {
        var constraint = this.always(opts, func);
        constraint.disable();
        return constraint;
    }

    chooseSolvers(optSolver) {
        if (optSolver) {
            return [optSolver];
        } else if (this.defaultSolver) {
            return [this.defaultSolver];
        } else if (this.defaultSolvers.length > 0) {
            return this.defaultSolvers;
        } else {
            return [];
            // throw new Error('Must pass a solver, or set defaultSolver.');
        }
    }

    filterSolvers(solvers, opts, func) {
        var result = [];

        // FIXME: this global state is ugly
        bbb.seenTypes = {};
        bbb.seenFiniteDomain = false;
        try {
            cop.withLayers([ConstraintInspectionLayer], function() {
                func.forInterpretation().apply(undefined, []);
            });
        } catch (e) {
            bbb.seenTypes = {};
            bbb.seenFiniteDomain = false;
            if (opts.logReasons) {
                console.warn('Parsing the expression for types failed, ' +
                   'will not check types:', e);
            }
        }

        solvers.forEach(function(solver) {
            if (opts.methods && !solver.supportsMethods()) {
                if (opts.logReasons) {
                    console.log('Ignoring ' + solver.solverName +
                        ' because it does not support opts.methods');
                }
                return false;
            }

            if (opts.priority && opts.priority != 'required' &&
                !solver.supportsSoftConstraints()) {
                if (opts.logReasons) {
                    console.log('Ignoring ' + solver.solverName +
                        ' because it does not support soft constraints');
                }
                return false;
            }

            if (bbb.seenFiniteDomain && !solver.supportsFiniteDomains()) {
                if (opts.logReasons) {
                    console.log('Ignoring ' + solver.solverName +
                        ' because it does not support finite domains');
                }
                return false;
            }

            for (var type in bbb.seenTypes) {
                if (solver.supportedDataTypes().indexOf(type) == -1) {
                    if (opts.logReasons) {
                        console.log('Ignoring ' + solver.solverName +
                            ' because it does not support ' + type + ' variables');
                    }
                    return false;
                }
            }

            result.push(solver);
        });

        delete bbb.seenTypes;
        delete bbb.seenFiniteDomain;
        return result;
    }

    /**
     * Create a Constraint for opts and func for each of the specified solvers.
     * Return an array of the created Constraints.
     */
    createEquivalentConstraints(solvers, opts, func, errors) {
        var constraints = [];
        solvers.forEach(function(solver) {
            try {
                var optsForSolver = _.clone(opts);
                var constraint = solver.always(optsForSolver, func);
                if (typeof opts.reevaluationInterval === 'number')
                    constraint.reevaluationInterval = opts.reevaluationInterval;
                constraint.opts = optsForSolver;
                constraint.originalOpts = opts;
                constraints.push(constraint);
            } catch (e) {
                errors.push(e);
                return;
            }
        });
        return constraints;
    }

    /**
     * Choose one of the specified constraints which performs best according to the
     * requirements laid out in opts.
     */
    chooseConstraint(constraints, opts, errors) {
        if (constraints.length === 1)
            return constraints[0];
        var constraint = null;
        var previouslyEnabledConstraints = [];
        // make sure all constraints are disabled before the comparison
        constraints.forEach(function(each) {
            if (each._enabled)
                previouslyEnabledConstraints.push(each);
            each.disable();
        });
        for (var i = 0; i < constraints.length; i++) {
            try {
                Constraint.current = constraints[i];
                constraints[i].enable(true);
                constraints[i].disable();
            } catch (e) {
                errors.push(e);
                constraints[i].disable();
                constraints[i].abandon();
                constraints[i] = null;
            } finally {
                Constraint.current = null;
            }
        }
        var minIndex = -1;
        var constraint = null;
        if (opts.optimizationPriority === undefined) {
            opts.optimizationPriority = ['time', 'numberOfChangedVariables'];
        }
        var minimumConstraintMetrics = {};
        for (var i = 0; i < opts.optimizationPriority.length; i++) {
            minimumConstraintMetrics[opts.optimizationPriority[i]] = Number.MAX_VALUE;
        }
        for (var i = 0; i < constraints.length; i++) {
            if (!constraints[i]) {
                continue;
            }
            for (var m = 0; m < opts.optimizationPriority.length; m++) {
                var metricName = opts.optimizationPriority[m];
                var iMetric = constraints[i].comparisonMetrics[metricName];
                if (typeof iMetric === 'function') {
                    iMetric = iMetric.call(constraints[i].comparisonMetrics);
                }
                var currentMinimum = minimumConstraintMetrics[metricName];
                if (typeof currentMinimum === 'function') {
                    currentMinimum = currentMinimum.call(minimumConstraintMetrics);
                }
                if (iMetric > currentMinimum) {
                    break; // do not check further metrics
                }
                if (iMetric != currentMinimum) {
                    // iMetric is either smaller or NaN
                    minimumConstraintMetrics = constraints[i].comparisonMetrics;
                    minIndex = i;
                    if (iMetric < currentMinimum) {
                        break; // do not check further metrics
                    }
                }
            }
        }
        if (minIndex > -1) {
            constraint = constraints[minIndex];
            console.log('Selected best solver: ' + constraint.solver.solverName);
        }
        return constraint;
    }

    /**
     * Creates a constraint equivalent to the given function through
     * Babelsberg#always, and then disables it immediately
     * @function Babelsberg#once
     * @public
     */
    once(opts, func) {
        var constraint = this.always(opts, func);
        constraint.disable();
        return constraint;
    }

    reevaluateSolverSelection(currentConstraint, updatedConstraintVariable) {
        var currentSolver = currentConstraint.solver;
        var func = currentConstraint._predicate;
        var opts = currentConstraint.originalOpts;
        var solvers = this.chooseSolvers(opts.solver);
        solvers = solvers.filter(function(each) { return each !== currentSolver; });
        solvers = this.filterSolvers(solvers, opts, func);
        if (solvers.length < 1)
            return; // no other solver is qualified to enforce this constraint
        var errors = [];
        var constraints = this.createEquivalentConstraints(solvers, opts, func, errors);
        constraints.push(currentConstraint);
        var constraint = this.chooseConstraint(constraints, opts, errors);
        if (constraint !== currentConstraint) {
            currentConstraint.solver = constraint.solver;
            // yes, constraint does not replace currentConstraint, only its solver
            currentConstraint.resetDefiningSolverOfVariables();
        }
        this.abandonAllConstraintsExcept(currentConstraint, constraints);
        currentConstraint.enable();
    }

    addCallback(func, context, args) {
        this.callbacks.push({
            func: func,
            context: context,
            args: args || []
        });
    }

    processCallbacks() {
        recursionGuard(bbb, 'isProcessingCallbacks', function() {
            while (bbb.callbacks.length > 0) {
                var cb = bbb.callbacks.shift();
                cb.func.apply(cb.context, cb.args);
            }
        })
    }

    isValueClass(variable) {
        // TODO: add more value classes
        return variable instanceof lively.Point;
    }
}

/**
 * A globally accessible instance of {@link Babelsberg}
 * @global
 */
var bbb = new Babelsberg()
export default bbb;