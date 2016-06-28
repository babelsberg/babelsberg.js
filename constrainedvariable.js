import Constraint from './constraint.js';
import {recursionGuard, newUUID} from './util.js';
import bbb from './babelsberg.js';

export default class ConstrainedVariable {
    constructor(obj, ivarname, optParentCVar) {
        this.__uuid__ = newUUID();
        this.obj = obj;
        this.ivarname = ivarname;
        this.newIvarname = '$1$1' + ivarname;
        this.parentConstrainedVariable = optParentCVar;
        this._constraints = [];
        this._externalVariables = {};
        this._isSolveable = false;
        this._definingSolver = null;
        var value = obj[ivarname],
            solver = this.currentSolver;

        this.ensureExternalVariableFor(solver);

        this.wrapProperties(obj, solver);
    }
    wrapProperties(obj, solver) {
        var existingSetter = obj.__lookupSetter__(this.ivarname),
            existingGetter = obj.__lookupGetter__(this.ivarname);

        if (existingGetter && !existingGetter.isConstraintAccessor) {
            obj.__defineGetter__(this.newIvarname, existingGetter);
        }
        if (existingSetter && !existingSetter.isConstraintAccessor) {
            obj.__defineSetter__(this.newIvarname, existingSetter);
        }
        // assign old value to new slot
        if (!existingGetter &&
            !existingSetter &&
            this.obj.hasOwnProperty(this.ivarname)) {
            this.setValue(obj[this.ivarname]);
        }

        try {
            obj.__defineGetter__(this.ivarname, function() {
                return this.getValue();
            }.bind(this));
        } catch (e) { /* Firefox raises for Array.length */ }
        var newGetter = obj.__lookupGetter__(this.ivarname);
        if (!newGetter) {
            // Chrome silently ignores __defineGetter__ for Array.length
            this.externalVariables(solver, null);
            return;
        }

        obj.__defineSetter__(this.ivarname, function(newValue) {
            return this.suggestValue(newValue, 'source');
        }.bind(this));
        var newSetter = obj.__lookupSetter__(this.ivarname);

        if (newSetter) newSetter.isConstraintAccessor = true;
        if (newGetter) newGetter.isConstraintAccessor = true;
    }
    ensureExternalVariableFor(solver) {
        var eVar = this.externalVariables(solver),
            value = this.obj[this.ivarname];

        if (!eVar && eVar !== null) { // don't try to create an external variable twice
            this.externalVariables(
                solver,
                solver.constraintVariableFor(value, this.ivarname, this)
            );
        }
    }



    get currentSolver() {
        if (Constraint.current) {
            return Constraint.current.solver;
        } else {
            return null;
        }
    }

    suggestValue(value, source, force) {
        if (ConstrainedVariable.$$callingSetters) {
            return value;
        } else if (force || value !== this.storedValue) {
            var callSetters = !ConstrainedVariable.$$optionalSetters,
                oldValue = this.storedValue,
                solver = this.definingSolver;
            var definingConstraint = this.definingConstraint;

            ConstrainedVariable.$$optionalSetters =
                ConstrainedVariable.$$optionalSetters || [];

            if (source && bbb.ecjit.suggestValueHook(this, value)) {
                return value;
            }

            var isInitiatingSuggestForDefiningConstraint = false;
            try {
                if (definingConstraint !== null) {
                    isInitiatingSuggestForDefiningConstraint =
                        !definingConstraint.isAnyVariableCurrentlySuggested;
                    definingConstraint.isAnyVariableCurrentlySuggested = true;
                }
                var begin = performance.now();
                // never uses multiple solvers, since it gets the defining Solver
                this.solveForPrimarySolver(value, oldValue, solver, source, force);
                if (definingConstraint && definingConstraint.opts.logTimings) {
                    console.log((solver ? solver.solverName : '(no solver)') +
                        ' took ' + (performance.now() - begin) + ' ms' +
                        ' to solve for ' + this.ivarname + ' in suggestValue');
                }
                if (isInitiatingSuggestForDefiningConstraint) {
                    definingConstraint.updateCounter += 1;
                    if (definingConstraint.updateCounter >=
                        definingConstraint.reevaluationInterval) {
                            bbb.reevaluateSolverSelection(definingConstraint, this);
                            definingConstraint.updateCounter = 0;
                        }
                }
                this.solveForConnectedVariables(value, oldValue, source, force);
                this.findAndOptionallyCallSetters(callSetters);
            } catch (e) {
                if (this.getValue() !== oldValue) {
                    throw new Error('solving failed, but variable changed to ' +
                        this.getValue() + ' from ' + oldValue);
                }
                this.addErrorCallback(e);
            } finally {
                this.ensureClearSetters(callSetters);
                if (this.isSolveable() && solver && source) {
                    // was bumped up in solveForPrimarySolver
                    this.bumpSolverWeight(solver, 'down');
                }
                if (isInitiatingSuggestForDefiningConstraint) {
                    definingConstraint.isAnyVariableCurrentlySuggested = false;
                }
            }
            bbb.processCallbacks();
        }
        return value;
    }

    solveForPrimarySolver(value, priorValue, solver, source) {
        if (this.externalValue == value) {
            // XXX: The solver already has the right value, but
            // we mustn't just store and return - if there are multiple
            // cooperating solvers that are connect to this variable via
            // the transitive closure of constraints, they wouldn't receive
            // the updated value.
            // TODO: Add a faster path to trigger these and then do the below:
            // this.setValue(value);
            // return;
        }
        if (this.isSolveable()) {
            recursionGuard(
                ConstrainedVariable.isSuggestingValue,
                this.__uuid__,
              (function() {
                var wasReadonly = false,
                // recursionGuard per externalVariable?
                eVar = this.definingExternalVariable;
                if (eVar) {
                    try {
                        if (solver && source) {
                            this.bumpSolverWeight(solver, 'up');
                        }
                        wasReadonly = eVar.isReadonly();
                        eVar.setReadonly(false);
                        eVar.suggestValue(value);
                    } finally {
                        eVar.setReadonly(wasReadonly);
                    }
                }
            }).bind(this));
        }
    }

    bumpSolverWeight(solver, direction) {
        if (direction == 'up') {
            solver.weight += 987654321; // XXX Magic Number
        } else {
            solver.weight -= 987654321;
        }
        this.findTransitiveConnectedVariables().forEach(function(cvar) {
            cvar.setDownstreamReadonly(direction == 'up');
        });
    }

    solveForConnectedVariables(value, priorValue, source, force) {
        if (force || value !== this.storedValue) {
            recursionGuard(this, '$$isStoring', (function() {
                try {
                    // this.setValue(value);
                    this.updateDownstreamVariables(value);
                    this.updateConnectedVariables(value);
                } catch (e) {
                    if (source) {
                        // is freeing the recursionGuard here necessary?
                        this.suggestValue(priorValue, source, 'force');
                        this.$$isStoring = false;
                    }
                    throw e; // XXX: Lively checks type, so wrap for top-level
                }
            }).bind(this));
        }
    }

    findAndOptionallyCallSetters(callSetters) {
        if (this.isSolveable()) {
            var getterSetterPair = this.findOptionalSetter();
            if (getterSetterPair) {
                ConstrainedVariable.$$optionalSetters.push(
                    getterSetterPair
                );
            }
        }
        if (callSetters) {
            recursionGuard(ConstrainedVariable, '$$callingSetters', this.callSetters.bind(this));
        }
    }

    addErrorCallback(e) {
        var catchingConstraint = this._constraints.find(function(constraint) {
            return typeof constraint.onError === 'function';
        });
        if (catchingConstraint) {
            bbb.addCallback(catchingConstraint.onError, catchingConstraint, [e]);
        } else {
            throw e;
        }
    }

    callSetters() {
        var recvs = [],
        setters = [];
        ConstrainedVariable.$$optionalSetters.forEach(function(ea) {
            var recvIdx = recvs.indexOf(ea.recv);
            if (recvIdx === -1) {
                recvIdx = recvs.length;
                recvs.push(ea.recv);
            }
            setters[recvIdx] = setters[recvIdx] || [];
            // If we have already called this setter for this recv, skip
            if (setters[recvIdx].indexOf(ea.setter) !== -1) return;
            setters[recvIdx].push(ea.setter);
            try {
                ea.recv[ea.setter](ea.recv[ea.getter]());
            } catch (e) {
                alert(e);
            }
        });
    }

    findOptionalSetter() {
        if (this.setterObj) return this.setterObj;

        if (this.setter) {
            this.setterObj = {recv: this.recv, getter: this.getter, setter: this.setter};
        } else if (this.parentConstrainedVariable) {
            this.setterObj = this.parentConstrainedVariable.findOptionalSetter();
        }
        return this.setterObj;
    }

    ensureClearSetters(callSetters) {
        if (callSetters) {
            ConstrainedVariable.$$optionalSetters = null;
        }
    }

    get getter() {
        return this.$getter;
    }
    get recv() {
        return this.$recv;
    }
    set getter(value) {
        this.$getter = value;
        if (this.recv) {
            var setter = value.replace('get', 'set');
            if (Object.isFunction(this.recv[setter])) {
                this.setter = setter;
            }
        }
    }
    set recv(value) {
        this.$recv = value;
        if (this.getter) {
            var setter = this.getter.replace('get', 'set');
            if (Object.isFunction(value[setter])) {
                this.setter = setter;
            }
        }
    }
    setDownstreamReadonly(bool) {
        if (bool && !this.$$downstreamReadonlyVars) {
            // flushCaches
            var defVar = this.definingExternalVariable;
            this.$$downstreamReadonlyVars = [];
            this.eachExternalVariableDo(function(eVar) {
                if (eVar !== defVar) {
                    if (!eVar.isReadonly()) {
                        eVar.setReadonly(true);
                        this.$$downstreamReadonlyVars.push(eVar);
                    }
                }
            }.bind(this));
        } else if (!bool && this.$$downstreamReadonlyVars) {
            this.$$downstreamReadonlyVars.forEach(function(eVar) {
                eVar.setReadonly(false);
            }.bind(this));
            this.$$downstreamReadonlyVars = null;
        }
    }
    findTransitiveConnectedVariables(ary) {
        return Constraint.enabledConstraintsGuard.call(this.__uuid__, function() {
            return this._findTransitiveConnectedVariables(ary || []);
        }.bind(this));
    }
    _findTransitiveConnectedVariables(ary) {
        // XXX soooo slowwww
        var self = this;
        if (ary.indexOf(this) !== -1) return;

        ary.push(this);
        this._constraints.forEach(function(c) {
            return c.constraintvariables.forEach(function(cvar) {
                cvar.findTransitiveConnectedVariables(ary);
            });
        });
        return ary;
    }
    updateConnectedVariables() {
        // so slow :(
        var self = this;
        _.uniq(_.flatten(this._constraints.map(function(c) {
            return c.constraintvariables;
        }))).forEach(function(cvar) {
            cvar.suggestValue(cvar.getValue()); // will store and recurse only if needed
        });
    }

    updateDownstreamVariables(value) {
        this.updateDownstreamExternalVariables(value);
        this.updateDownstreamUnsolvableVariables(value);
    }

    updateDownstreamExternalVariables(value) {
        var defVar = this.definingExternalVariable;
        this.eachExternalVariableDo(function(ea) {
            if (ea !== defVar) {
                var wasReadonly = ea.isReadonly();
                ea.setReadonly(false);
                ea.suggestValue(value);
                ea.setReadonly(wasReadonly);
            }
        });
    }

    updateDownstreamUnsolvableVariables(value) {
        if (!this.isValueClass()) {
            this.recalculateDownstreamConstraints(value);
        } else {
            this.updateValueClassParts(value);
        }
    }

    recalculateDownstreamConstraints(value) {
        this.setValue(value);
        this._constraints.forEach(function(c) {
            var eVar = this.externalVariables(c.solver);
            if (!eVar) {
                c.recalculate();
            }
        }.bind(this));
    }

    updateValueClassParts(value) {
        recursionGuard(this, '$$valueClassUpdate', (function() {
            for (var key in this.storedValue[ConstrainedVariable.AttrName]) {
                var cvar = this.storedValue[ConstrainedVariable.AttrName][key];
                cvar.suggestValue(value[key]);
            }
        }).bind(this));
    }

    addToConstraint(constraint) {
        if (!_.include(this._constraints, constraint)) {
            this._constraints.push(constraint);
        }
        constraint.addConstraintVariable(this);
    }
    get definingSolver() {
        var defining;
        if (Constraint.current || this._hasMultipleSolvers) {
            // no fast path for variables with multiple solvers for now
            this._definingSolver = null;
            defining = this._searchDefiningSolverAndConstraint();
            return defining.solver;
        } else if (!this._definingSolver) {
            defining = this._searchDefiningSolverAndConstraint();
            this._definingConstraint = defining.constraint;
            this._definingSolver = defining.solver;
            return this._definingSolver;
        } else {
            return this._definingSolver;
        }
    }
    get definingConstraint() {
        return this._definingConstraint ||
            this._searchDefiningSolverAndConstraint().constraint;
    }
    _searchDefiningSolverAndConstraint() {
        var solver = {weight: -1000, fake: true, solverName: '(fake)'};
        var constraint = null;
        var solvers = [];
        this.eachExternalVariableDo(function(eVar) {
            var s = eVar.__solver__;

            if (!s.fake) {
                solvers.push(s);
            }

            var hasEnabledConstraint = false;
            var enabledConstraint = null;
            for (var i = 0; i < this._constraints.length; i++) {
                if (this._constraints[i].solver === s &&
                    this._constraints[i]._enabled) {
                        enabledConstraint = this._constraints[i];
                        hasEnabledConstraint = true;
                        break;
                    }
            }

            if (this._constraints.length > 0 && !hasEnabledConstraint)
                return;

            if (!solver.fake && hasEnabledConstraint) {
                this._hasMultipleSolvers = true;
            }


            if (s.weight > solver.weight) {
                solver = s;
                constraint = enabledConstraint;
            }
        }.bind(this));

        if (solver.fake) {
            return {solver: null, constraint: null};
        }

        return {solver: solver, constraint: constraint};
    }

    resetDefiningSolver() {
        this._definingSolver = null;
    }

    get solvers() {
        var solvers = [];
        this.eachExternalVariableDo(function(eVar) {
            var s = eVar.__solver__;
            solvers.push(s);
        });
        return solvers.uniq();
    }
    get definingExternalVariable() {
        if (this.definingSolver) {
            return this.externalVariables(this.definingSolver);
        } else {
            return null;
        }
    }

    isSolveable() {
        return Constraint.current ? !!this.externalVariable : this._isSolveable;
    }

    _resetIsSolveable() {
        this._isSolveable = !!this.definingExternalVariable;
    }

    isValueClass() {
        return !this.isSolveable() && bbb.isValueClass(this.storedValue);
    }

    get storedValue() {
        return this.obj[this.newIvarname];
    }

    get externalValue() {
        var value;
        try {
            return this.pvtGetExternalValue(this.externalVariable);
        } catch (e) {
            // catch all here
            return null;
        }
    }

    pvtGetExternalValue(evar) {
        if (typeof(evar.value) == 'function') {
            return evar.value();
        } else {
            return evar.value;
        }
    }

    setValue(value) {
        this.obj[this.newIvarname] = value;
    }
    eachExternalVariableDo(func) {
        func.bind(this);
        for (var key in this._externalVariables) {
            var eVar = this._externalVariables[key];
            if (eVar) { func(eVar); }
        }
    }

    getValue() {
        if (this.isSolveable() && this.hasEnabledConstraint()) {
            return this.externalValue;
        } else {
            return this.storedValue;
        }
    }


    get externalVariable() {
        if (this.currentSolver) {
            return this.externalVariables(this.currentSolver);
        } else {
            return this.definingExternalVariable;
        }
    }
    externalVariables(solver, value) {
        if (!solver.__uuid__) {
            solver.__uuid__ = newUUID();
        }
        if (arguments.length === 1) {
            return this._externalVariables[solver.__uuid__];
        } else {
            if (value) {
                value.__solver__ = value.__solver__ || solver;
                if (value.__cvar__ && (value.__cvar__ !== this)) {
                    throw 'Inconsistent external variable. This should not happen!';
                }
                value.__cvar__ = this;
            }
            this._externalVariables[solver.__uuid__] = value || null;
            this._resetIsSolveable();
        }
    }

    /**
     * Removes all external variables which are used only by the specified Constraint.
     * @param {Constraint} abandonedConstraint the Constraint about to be purged
     */
    abandonConstraint(abandonedConstraint) {
        // remove abandonedConstraint from this._constraints
        var abandonedIndex = this._constraints.indexOf(abandonedConstraint);
        if (abandonedIndex !== -1)
            this._constraints.splice(abandonedIndex, 1);
        // collect all external variables which can be detached
        var externalVariableKeysToRemove = _.keys(this._externalVariables).filter(
            function(eachSolverUUID) {
                var externalVariable = this._externalVariables[eachSolverUUID];
                if (externalVariable === null)
                    return true; // delete the nulls by the way
                var hasSomeOtherConstraintForThisSolver = this._constraints.some(
                    function(eachConstraint) {
                        return eachConstraint.solver === externalVariable.__solver__;
                    });
                return !hasSomeOtherConstraintForThisSolver;
            }.bind(this));
        // detach collected external variables
        externalVariableKeysToRemove.forEach(function(each) {
            delete this._externalVariables[each];
        }.bind(this));
    }

    hasEnabledConstraint() {
        return this._constraints.length === 0 ||
            this._constraints.some(function(constraint) {
                return constraint._enabled;
            });
    }
    
    static findConstraintVariableFor(obj, ivarname) {
        var l = obj[ConstrainedVariable.AttrName];
        if (l && l[ivarname]) {
            return l[ivarname];
        } else {
            return null;
        }
    }

    static newConstraintVariableFor(obj, ivarname, cobj) {
        var cvar = this.findConstraintVariableFor(obj, ivarname);
        if (!cvar && (typeof(obj[ivarname]) != "function")) {
            debugger
            cvar = new ConstrainedVariable(obj, ivarname, cobj);
            obj[ConstrainedVariable.AttrName] = obj[ConstrainedVariable.AttrName] || {};
            obj[ConstrainedVariable.AttrName][ivarname] = cvar;
        }
        return cvar;
    }

    static deleteConstraintVariableFor(obj, ivarname) {
        var l = obj[ConstrainedVariable.AttrName];
        if (l && l[ivarname]) {
            delete l[ivarname];
        }
    }
}

ConstrainedVariable.AttrName = '__constrainedVariables__';
ConstrainedVariable.ThisAttrName = '__lastConstrainedVariableForThis__';
ConstrainedVariable.isSuggestingValue = {};

