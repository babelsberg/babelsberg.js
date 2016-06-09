/**
 * Represents an invariant.
 * @class Constraint
 */
export default class Constraint {
    initialize(predicate, solver) {
        var constraintObject;
        this._enabled = false;
        this._predicate = predicate;
        if (typeof predicate.onError === 'function') {
            this.onError = predicate.onError;
            this.onError.constraint = this;
        }
        this.constraintobjects = [];
        this.constraintvariables = [];
        this.solver = solver;
        this.reevaluationInterval = bbb.defaultReevaluationInterval;
        this.updateCounter = 0;

        // FIXME: this global state is ugly
        try {
            Constraint.current = this;
            constraintObject = cop.withLayers([ConstraintConstructionLayer], function() {
                return predicate.forInterpretation().apply(undefined, []);
            });
        } finally {
            Constraint.current = null;
        }
        this.addPrimitiveConstraint(constraintObject);
    }
    addPrimitiveConstraint(obj) {
        if (typeof(obj) != 'undefined' && !this.constraintobjects.include(obj)) {
            if (!obj.enable) this.haltIfDebugging();
            this.constraintobjects.push(obj);
        }
    }
    addConstraintVariable(v) {
        if (v && !this.constraintvariables.include(v)) {
            this.constraintvariables.push(v);
        }
    }
    get predicate() {
        return this._predicate;
    }
    get allowUnsolvableOperations() {
        this.haltIfDebugging();
        return !!this.predicate.allowUnsolvableOperations;
    }
    haltIfDebugging() {
        if (this.predicate.debugging) debugger;
    }
    get allowTests() {
        this.haltIfDebugging();
        return !!this.predicate.allowTests;
    }

    get priority() {
        return this._priority;
    }

    set priority(value) {
        var enabled = this._enabled;
        if (enabled) {
            this.disable();
        }
        this._priority = value;
        if (enabled) {
            this.enable();
        }
    }

    get value() {
        return this.constraintobjects.last();
    }

    /**
     * Enables this constraint. This is done automatically after
     * constraint construction by most solvers.
     * @function Constraint#enable
     * @param {boolean} [bCompare] signifies that there are multiple
     *                              solvers to be compared
     * @public
     */
    enable(bCompare) {
        if (!this._enabled) {
            Constraint.enabledConstraintsGuard.tick();
            this.constraintobjects.forEach(function(ea) {
                this.enableConstraintObject(ea);
            }.bind(this));
            if (this.constraintobjects.length === 0) {
                throw new Error('BUG: No constraintobjects were created.');
            }
            this._enabled = true;
            this.constraintvariables.forEach(function(v) {v._resetIsSolveable();});
            var begin = performance.now();
            this.solver.solve();
            var end = performance.now();
            if (this.opts.logTimings) {
                console.log((this.solver ? this.solver.solverName : '(no solver)') +
                    ' took ' + (end - begin) + ' ms to solve in enable');
            }

            var changedVariables = 0;
            var variableAssigments = {};
            this.constraintvariables.forEach(function(ea) {
                var value = ea.getValue();
                var oldValue = ea.storedValue;
                if (oldValue !== value) {
                    variableAssigments[ea.ivarname] = {oldValue: oldValue,
                        newValue: value};
                    changedVariables += 1;
                }
                // solveForConnectedVariables might eventually
                // call updateDownstreamExternalVariables, too.
                // We need this first, however, for the case when
                // this newly enabled constraint is the new
                // highest-weight solver
                if (!bCompare) {
                    ea.updateDownstreamExternalVariables(value);
                    ea.solveForConnectedVariables(value);
                }
            });
            this.comparisonMetrics = {
                time: end - begin,
                numberOfChangedVariables: changedVariables,
                assignments: variableAssigments,
                squaredChangeDistance: () => {
                   var sumOfSquaredDistances = 0;
                   for (var varname in this.comparisonMetrics.assignments) {
                       var assignment = this.comparisonMetrics.assignments[varname];
                       var distance = assignment.newValue - assignment.oldValue;
                       sumOfSquaredDistances += distance * distance;
                   }
                   return sumOfSquaredDistances;
               }
            }
        }
    }

    enableConstraintObject(obj, optPriority) {
        if (obj === true) {
            if (this.allowTests) {
                this.isTest = true;
                // alertOK(
                //     'Warning: Constraint expression returned true. ' +
                //         'Re-running whenever the value changes'
                // );
            } else {
                throw new Error(
                    'Constraint expression returned true, but was not marked as test. ' +
                        'If you expected this to be solveable, check that there are ' +
                        'no operations in this that cannot be solved by the selected ' +
                        "solver (e.g. Cassowary does not support `<', only `<='). " +
                        'Otherwise, if you think this is ok, you must pass ' +
                        "`allowTests: true' as option to the constraint."
                );
            }
        } else if (obj === false) {
            if (!this.allowFailing) {
                throw new Error(
                    'Constraint expression returned false, no solver available to fix it'
                );
            }
        } else if (!obj.enable) {
            var e = new Error(
                'Constraint expression returned an ' +
                    'object that does not respond to #enable'
            );
            e.obj = obj;
            e.constraint = this;
            throw e;
        } else {
            obj.solver = this.solver; // XXX: Bit of a hack, should really write it so
                                      // this gets passed through from the variables
            obj.enable(optPriority || this._priority);
        }
    }

    /**
     * Disables this constraint. It is not further maintained until
     * its {@link Constraint#enable|re-enabling}.
     * @function Constraint#disable
     * @public
     */
    disable() {
        if (this._enabled) {
            Constraint.enabledConstraintsGuard.tick();
            this.constraintobjects.forEach(function(ea) {
                try {ea.disable()} catch (e) {}
            });
            this._enabled = false;
        }
    }

    recalculate() {
        if (!this._enabled) return;
        // TODO: Fix this so it uses the split-stay result, i.e. just
        // increase the stay for the newly assigned value
        if (this.isTest && !this.solver) {
            debugger;
            // TODO: If this is a test and there is no solver,
            // we can safely just run this as an assert
        }

        var enabled = this._enabled,
            cvars = this.constraintvariables,
            self = this,
            assignments;
        if (enabled) {
            this.disable();
        }
        this.initialize(this.predicate, this.solver);

        cvars.select(function(ea) {
            // all the cvars that are not in this constraint anymore
            return !this.constraintvariables.include(ea) && ea.isSolveable();
        }.bind(this)).forEach(function(ea) {
            return ea.externalVariable.removeStay();
        });

        if (enabled) {
            this.enable();

            assignments = this.constraintvariables.select(function(ea) {
                // all the cvars that are new after this recalculation
                return !cvars.include(ea) && ea.isSolveable();
            }).collect(function(ea) {
                // add a required constraint for the new variable
                // to keep its new value, to have the same semantics
                // as for direct assignment
                return ea.externalVariable.cnIdentical(ea.getValue());
            });

            assignments.forEach(function(ea) {
                try {
                    self.enableConstraintObject(ea);
                } catch (_) {
                    // if the assignment cannot be completely satisfied, make it strong
                    self.enableConstraintObject(ea, self.solver.strength.strong);
                }
            });

            try {
                // try to enable this constraints with (some) required assignments
                this.enable();
            } catch (_) {
                // if it fails, disable, make all the assignments only strong, re-enable
                this._enabled = true; // force disable to run
                this.disable();
                assignments.invoke('disable');
                assignments.invoke(
                    'enable',
                    this.solver.strength && this.solver.strength.strong
                );
                this.enable();
            } finally {
                assignments.invoke('disable');
            }
        }
    }


    /**
     * Indicate that this Constraint will never be enabled again.
     * Causes external variables of related ConstrainedVariables to be detached
     * if they were connected to their solver only via this Constraint.
     */
    abandon() {
        this.constraintvariables.forEach(function(eachVar) {
            eachVar.abandonConstraint(this);
        }, this);
        // TODO: eject those external variables also from their solvers if possible
        // because the solvers might be put to use somewhere else and should not be
        // bothered with old (possibly duplicated) variables, should they?
    }

    resetDefiningSolverOfVariables() {
        this.constraintvariables.forEach(function(eachVar) {
            eachVar.resetDefiningSolver();
        });
    }

    static set current(p) {
        if (!this._previous) {
            this._previous = [];
        }
        if (p === null) {
            if (this._previous.length > 0) {
                this._current = this._previous.pop();
            } else {
                this._current = null;
            }
            return;
        }
        if (this._current) {
            this._previous.push(this._current);
        }
        this._current = p;
    }

    static get current() {
        return this._current;
    }
}

class Guard {
    constructor() {
        this.counter = 0;
        this.lastCall = {};
        this.cachedResult;
        return this;
    }
    call(id, func) {
        if (this.counter !== this.lastCall[id]) {
            this.cachedResult = func();
            this.lastCall[id] = this.counter;
        }
        return this.cachedResult;
    }
    tick(arg) {
        if (arg) {
            this.counter = arg;
        } else {
            this.counter++;
        }
    }
}

Constraint.enabledConstraintsGuard = new Guard();
