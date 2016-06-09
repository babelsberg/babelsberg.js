import * as deltablue from '../deltablue/deltablue.js';
import Cassowary from './bbb-rhea.js';

export class ClassicECJIT {
    initialize() {
        this.actionCounterLimit = 25;
        this.name = 'classic';
        this.countDecayDecrement = 10;
        this.clearState();
    }

    /**
     * Function used for instrumenting ConstrainedVariable#suggestValue to
     * implement automatic edit constraints. The boolean return value says
     * whether ConstrainedVariable#suggestValue may proceed normally or should
     * be terminated since an edit constraint is enabled.
     * @function EditConstraintJIT#suggestValueHook
     * @public
     * @param {Object} cvar The ConstrainedVariable on which suggestValue() was called.
     * @param {Object} value The new value which was suggested.
     * @return {Boolean} whether suggestValue should be terminated or run normally.
     */
    suggestValueHook(cvar, value) {
        if (!(cvar.__uuid__ in this.cvarData)) {
            //console.log("Creating cvarData entry for "+cvar.__uuid__);
            this.cvarData[cvar.__uuid__] = {
                'cvar': cvar,
                'sourceCount': 0
            };
        }
        var data = this.cvarData[cvar.__uuid__];
        data['sourceCount'] += 1;

        this.actionCounter += 1;
        if (this.actionCounter >= this.actionCounterLimit) {
            this.doAction();
            this.actionCounter = 0;
        }

        if (this.currentEdit && cvar.__uuid__ === this.currentEdit['cvar'].__uuid__) {
            this.currentEdit['cb']([value]);
            return true;
        }

        return false;
    }

    /**
     * Run some computationally intensive instrumentation and maintenance actions
     * regularly but not on every suggestValueHook invocation.
     * @private
     */
    doAction() {
        var cvarData = this.cvarData;
        // sort UUIDs descending by the sourceCount of their cvar
        var uuidBySourceCount = Object.keys(this.cvarData).sort(function(a, b) {
            return cvarData[b]['sourceCount'] - cvarData[a]['sourceCount'];
        });

        // should optimize cvar with UUID uuidBySourceCount[0] first, then
        // uuidBySourceCount[1] etc.
        var newCVar = this.cvarData[uuidBySourceCount[0]]['cvar'];
        if (!this.currentEdit) {
            var abort = false;
            newCVar.solvers.forEach(function(solver) {
                if (solver.editConstraints !== undefined) {
                    if (solver.editConstraints.length > 0) abort = true;
                }
            });
            if (abort) {
                console.log('we have already a edit constraint ...');
                return;
            }
            this.createEditFor(newCVar);
        } else {
            if (this.currentEdit['cvar'] !== newCVar) {
                this.deleteEdit();
                this.createEditFor(newCVar);
            }
        }

        var expired = [];
        this.forEachCVarData(function(data) {
            data['sourceCount'] = Math.max(
                data['sourceCount'] - this.countDecayDecrement,
                0
            );
            if (data['sourceCount'] <= 0) {
                //expired.push(data['cvar']);
            }
        });
        expired.forEach(function(cvar) {
            console.log('Purging cvarData entry for ' + cvar.__uuid__);
            delete this.cvarData[cvar.__uuid__];
        }, this);
    }

    deleteEdit() {
        if (this.currentEdit) {
            this.currentEdit['cb'](); // end edit constraint
        }
        this.currentEdit = null;
    }

    createEditFor(cvar) {
        //console.log("Enabling edit-callback for "+cvar.__uuid__+" "+cvar.ivarname);
        this.currentEdit = {
            'cvar': cvar,
            'cb': bbb.edit(cvar.obj, [cvar.ivarname])
        };
        //this.printState();
    }

    clearState() {
        this.cvarData = {};
        this.actionCounter = 0;
        if (this.currentEdit) {
            this.deleteEdit();
        }
    }

    printState() {
        console.log('=====');
        this.forEachCVarData(function(data) {
            var cvar = data['cvar'];
            console.log('CVar(uuid:' +
                        cvar.__uuid__ +
                        ', ivarname: ' +
                        cvar.ivarname +
                        ', sourceCount:' +
                        data['sourceCount'] +
                        ')');
        });
    }

    forEachCVarData(callback) {
        Object.keys(this.cvarData).forEach(function(key) {
            var value = this.cvarData[key];
            callback.bind(this)(value);
        }, this);
    }
}

export class AbstractECJIT {
    /**
     * Run some computationally intensive instrumentation and maintenance actions
     * regularly but not on every suggestValueHook invocation.
     * @private
     */
    doAction() {
        var cvarData = this.cvarData;
        // sort UUIDs descending by the sourceCount of their cvar
        var uuidBySourceCount = Object.keys(this.cvarData).sort(function(a, b) {
            return cvarData[b]['sourceCount'] - cvarData[a]['sourceCount'];
        });

        // should optimize cvar with UUID uuidBySourceCount[0] first, then
        // uuidBySourceCount[1] etc.
        var newCVar = this.cvarData[uuidBySourceCount[0]]['cvar'];
        if (!this.currentEdit) {
            var abort = false;
            newCVar.solvers.forEach(function(solver) {
                if (solver.editConstraints !== undefined) {
                    if (solver.editConstraints.length > 0) abort = true;
                }
            });
            if (abort) {
                console.log('we have already a edit constraint ...');
                return;
            }
            this.createEditFor(newCVar);
        } else {
            if (this.currentEdit['cvar'] !== newCVar) {
                this.deleteEdit();
                this.createEditFor(newCVar);
            }
        }

        var expired = [];
        this.forEachCVarData(function(data) {
            data['count'] = Math.max(
                data['count'] - this.countDecayDecrement, 0);
            data['sourceCount'] = Math.max(
                data['sourceCount'] - this.countDecayDecrement, 0);
            if (data['sourceCount'] <= 0) {
                //expired.push(data['cvar']);
            }
        });
        expired.forEach(function(cvar) {
            console.log('Purging cvarData entry for ' + cvar.__uuid__);
            delete this.cvarData[cvar.__uuid__];
        }, this);
    }

    deleteEdit() {
        if (this.currentEdit) {
            //console.log("Disable edit-callback for "+this.currentEdit['cvar'].__uuid__);
            this.currentEdit['cb'](); // end edit constraint
        }
        this.currentEdit = null;
    }

    createEditFor(cvar) {
        //console.log("Enabling edit-callback for "+cvar.__uuid__+" "+cvar.ivarname);
        this.currentEdit = {
            'cvar': cvar,
            'cb': bbb.edit(cvar.obj, [cvar.ivarname])
        };
        //this.printState();
    }

    clearState() {
        this.cvarData = {};
        this.actionCounter = 0;
        if (this.currentEdit) {
            this.deleteEdit();
        }
    }

    printState() {
        console.log('=====');
        this.forEachCVarData(function(data) {
            var cvar = data['cvar'];
            console.log('CVar(uuid:' + cvar.__uuid__ + ', ivarname:' +
                        cvar.ivarname + ', count:' + data['count'] +
                        ', sourceCount:' + data['sourceCount'] + ')');
        });
    }

    forEachCVarData(callback) {
        Object.keys(this.cvarData).forEach(function(key) {
            var value = this.cvarData[key];
            callback.bind(this)(value);
        }, this);
    }
}

export class MultiplicativeAdaptiveECJIT extends AbstractECJIT {
    get name() { return 'mul' }

    initialize() {
        this.actionCounterMax = 64;
        this.actionCounterMin = 4;
        this.currentActionLimit = this.actionCounterMin;
        this.countDecayDecrement = 10;
        this.clearState();
    }

    /**
     * Function used for instrumenting ConstrainedVariable#suggestValue to
     * implement automatic edit constraints. The boolean return value says
     * whether ConstrainedVariable#suggestValue may proceed normally or should
     * be terminated since an edit constraint is enabled.
     * @function EditConstraintJIT#suggestValueHook
     * @public
     * @param {Object} cvar The ConstrainedVariable on which suggestValue() was called.
     * @param {Object} value The new value which was suggested.
     * @return {Boolean} whether suggestValue should be terminated or run normally.
     */
    suggestValueHook(cvar, value) {
        if (!(cvar.__uuid__ in this.cvarData)) {
            //console.log("Creating cvarData entry for "+cvar.__uuid__);
            this.cvarData[cvar.__uuid__] = {
                'cvar': cvar,
                'sourceCount': 0
            };
        }
        var data = this.cvarData[cvar.__uuid__];
        data['sourceCount'] += 1;

        this.actionCounter += 1;
        // console.log("actionCounters: counter=" + this.actionCounter +
        //          " limit=" + this.currentActionLimit);
        if (this.actionCounter >= this.currentActionLimit) {
            var oldEdit = this.currentEdit;
            this.doAction();
            if ((oldEdit === undefined) || (oldEdit === this.currentEdit)) {
                this.currentActionLimit = Math.min(
                    this.currentActionLimit * 2, this.actionCounterMax);
            } else {
                this.currentActionLimit = Math.max(
                    this.currentActionLimit / 2, this.actionCounterMin);
            }
            this.actionCounter = 0;
        }

        if (this.currentEdit && cvar.__uuid__ === this.currentEdit['cvar'].__uuid__) {
            this.currentEdit['cb']([value]);
            return true;
        }

        return false;
    }
}
export class AdditiveAdaptiveECJIT extends AbstractECJIT {
    get name() { return 'add' }

    initialize() {
        this.actionCounterMax = 64;
        this.actionCounterMin = 2;
        this.currentActionLimit = 2 * this.actionCounterMin;
        this.countDecayDecrement = 10;
        this.clearState();
    }


    /**
     * Function used for instrumenting ConstrainedVariable#suggestValue to
     * implement automatic edit constraints. The boolean return value says
     * whether ConstrainedVariable#suggestValue may proceed normally or should
     * be terminated since an edit constraint is enabled.
     * @function EditConstraintJIT#suggestValueHook
     * @public
     * @param {Object} cvar The ConstrainedVariable on which suggestValue() was called.
     * @param {Object} value The new value which was suggested.
     * @return {Boolean} whether suggestValue should be terminated or run normally.
     */
    suggestValueHook(cvar, value) {
        if (!(cvar.__uuid__ in this.cvarData)) {
            //console.log("Creating cvarData entry for "+cvar.__uuid__);
            this.cvarData[cvar.__uuid__] = {
                'cvar': cvar,
                'sourceCount': 0
            };
        }
        var data = this.cvarData[cvar.__uuid__];
        data['sourceCount'] += 1;

        this.actionCounter += 1;
        if (this.actionCounter >= this.currentActionLimit) {
            this.doAction();
            this.actionCounter = 0;
        }

        if (this.currentEdit && cvar.__uuid__ === this.currentEdit['cvar'].__uuid__) {
            this.currentEdit['cb']([value]);
            if (this.currentActionLimit < this.actionCounterMax)
                this.currentActionLimit += 1;
            return true;
        } else {
            if (this.currentActionLimit > this.actionCounterMin)
                this.currentActionLimit -= 1;
        }

        return false;
    }
}
export class LastECJIT extends AbstractECJIT {
    get name() { return 'last' }

    initialize() {
        this.clearState();
    }


    /**
     * Function used for instrumenting ConstrainedVariable#suggestValue to
     * implement automatic edit constraints. The boolean return value says
     * whether ConstrainedVariable#suggestValue may proceed normally or should
     * be terminated since an edit constraint is enabled.
     * @function EditConstraintJIT#suggestValueHook
     * @public
     * @param {Object} cvar The ConstrainedVariable on which suggestValue() was called.
     * @param {Object} value The new value which was suggested.
     * @return {Boolean} whether suggestValue should be terminated or run normally.
     */
    suggestValueHook(cvar, value) {
        // should optimize cvar with UUID uuidBySourceCount[0] first, then
        // uuidBySourceCount[1] etc.
        if (!this.currentEdit) {
            var abort = false;
            cvar.solvers.forEach(function(solver) {
                if (solver.editConstraints !== undefined) {
                    if (solver.editConstraints.length > 0) abort = true;
                }
            });
            if (abort) {
                console.log('we have already a edit constraint ...');
                return false;
            }
            this.createEditFor(cvar);
        } else {
            if (this.currentEdit['cvar'] !== cvar) {
                this.deleteEdit();
                this.createEditFor(cvar);
            }
        }

        this.currentEdit['cb']([value]);
        return true;
    }
}
export class EmptyECJIT extends Object {
    get name() { return 'empty' }

    /**
     * Function used for instrumenting ConstrainedVariable#suggestValue to
     * implement automatic edit constraints. The boolean return value says
     * whether ConstrainedVariable#suggestValue may proceed normally or should
     * be terminated since an edit constraint is enabled.
     * @function EditConstraintJIT#suggestValueHook
     * @public
     * @param {Object} cvar The ConstrainedVariable on which suggestValue() was called.
     * @param {Object} value The new value which was suggested.
     * @return {Boolean} whether suggestValue should be terminated or run normally.
     */
    suggestValueHook(cvar, value) {
        return false;
    }
    clearState() {
        // Do nothing. Public interface.
    }
    printState() {
        console.log('==== EmptyECJIT ====');
        console.log(' Nothing to report. ');
    }
}

class ECJITTests extends Object {
    benchAll() {
        var llpad;
        if (!lively.lang || !lively.lang.string) { // during headless tests
            llpad = function(str, n, bool) {
                var p = '                               ';
                return (p + str).slice(-n);
            };
        } else {
            llpad = lively.lang.string.pad;
        }
        var pad = function(s, n) { return llpad(s + '', n - (s + '').length) };
        var padl = function(s, n) { return llpad(s + '', n - (s + '').length, true) };

        var names = ['clAddSim', 'dbAddSim', // 'clDragSim',
                     'clDrag2DSim', 'clDrag2DSimFastX'
                     //, 'clDrag2DSimChangeHalf', 'clDrag2DSimChangeTenth'
                    ],
            scenarios = [
                {iter: 5}, {iter: 100} //, {iter: 500}
            ],
            createECJITs = [
                function() { return new ClassicECJIT() },
                function() { return new AdditiveAdaptiveECJIT() },
                function() { return new MultiplicativeAdaptiveECJIT() },
                function() { return new LastECJIT() }
            ],
            createEmptyECJIT = function() { return new EmptyECJIT() };

        console.log('====== Start benchmark ======');
        console.log('Simulations: ' + names.join(', '));
        console.log('Times in ms (ec / ' +
                    createECJITs.map(function(fn) { return fn().name }).join(' / ') +
                    ' / no-jit):');

        names.forEach(function(name) {
            scenarios.forEach(function(scenario) {
                this.bench(name, scenario.iter, createEmptyECJIT());
                createECJITs.forEach(function(fn) {
                    this.bench(name, scenario.iter, fn());
                }, this);
                this.bench(name + 'Edit', scenario.iter, createEmptyECJIT());

                var t0 = this.bench(name, scenario.iter, createEmptyECJIT());
                var t1s = [];
                createECJITs.forEach(function(fn) {
                    var t1 = this.bench(name, scenario.iter, fn());
                    t1 += this.bench(name, scenario.iter, fn());
                    t1 += this.bench(name, scenario.iter, fn());
                    t1 = Math.round(t1 / 3);
                    t1s.push(t1);
                }, this);
                var t2 = this.bench(name + 'Edit', scenario.iter, createEmptyECJIT());
                t2 += this.bench(name + 'Edit', scenario.iter, createEmptyECJIT());
                t2 += this.bench(name + 'Edit', scenario.iter, createEmptyECJIT());
                t2 = Math.round(t2 / 3);

                var output = pad(name + '(' + scenario.iter + '):', 30) +
                    ' ' + padl(t2, 4) + ' / ';
                output += t1s.map(function(t1) {
                    var speedupMsg = '';
                    if (t1 < t2) {
                        speedupMsg = '   FA ';
                    } else if (t0 < t1) {
                        speedupMsg = '   SL ';
                    } else if (t2 <= t1 && t1 < t0) {
                        speedupMsg = ' (' +
                            padl(Math.round((t1 - t2) / (t0 - t2) * 100), 2) +
                            '%)';
                    }
                    return padl(t1, 4) + pad(speedupMsg, 6);
                }, this).join(' / ');
                output += ' / ' + padl(t0, 4);

                console.log(output);
            }.bind(this));
        }.bind(this));

        console.log('====== benchmark done ======');
    }

    bench(name, iterations, ecjit) {
        var fn = this[name],
            old_ecjit = bbb.ecjit;

        bbb.ecjit = ecjit;

        var start = new Date();
        fn.bind(this)(iterations);
        var end = new Date();

        bbb.ecjit = old_ecjit;
        return end - start;
    }

    dbAddSim(iterations) {
        var o = {x: 0, y: 0, z: 0},
            solver = new deltablue.Planner();

        bbb.always({solver: solver, ctx: {o: o}}, function() {
            return o.x == o.z - o.y &&
                o.y == o.z - o.x &&
                o.z == o.x + o.y;
        });

        for (var i = 0; i < iterations; i++) {
            o.x = i;
            console.assert(o.x + o.y == o.z);
        }
    }

    dbAddSimEdit(iterations) {
        var o = {x: 0, y: 0, z: 0},
            solver = new deltablue.Planner();

        bbb.always({solver: solver, ctx: {o: o}}, function() {
            return o.x == o.z - o.y &&
                o.y == o.z - o.x &&
                o.z == o.x + o.y;
        });

        var cb = bbb.edit(o, ['x']);
        for (var i = 0; i < iterations; i++) {
            cb([i]);
            console.assert(o.x + o.y == o.z);
        }
        cb();
    }

    clAddSim(iterations) {
        var o = {x: 0, y: 0, z: 0},
            solver = new Cassowary();
        solver.setAutosolve(false);

        bbb.always({solver: solver, ctx: {o: o}},
                   function() { return o.x + o.y == o.z });

        for (var i = 0; i < iterations; i++) {
            o.x = i;
            console.assert(o.x + o.y == o.z);
        }
    }

    clAddSimEdit(iterations) {
        var o = {x: 0, y: 0, z: 0},
            solver = new Cassowary();
        solver.setAutosolve(false);

        bbb.always({solver: solver, ctx: {o: o}},
                   function() { return o.x + o.y == o.z });

        var cb = bbb.edit(o, ['x']);
        for (var i = 0; i < iterations; i++) {
            cb([i]);
            console.assert(o.x + o.y == o.z);
        }
        cb();
    }

    clDragSim(numIterations) {
        var ctx = {
                mouse: {location_y: 0},
                mercury: {top: 0, bottom: 0},
                thermometer: {top: 0, bottom: 0},
                temperature: {c: 0},
                gray: {top: 0, bottom: 0},
                white: {top: 0, bottom: 0},
                display: {number: 0}},
            solver = new Cassowary();
        solver.setAutosolve(false);

        bbb.always({solver: solver, ctx: ctx},
                   function() { return temperature.c == mercury.top });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return white.top == thermometer.top });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return white.bottom == mercury.top });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return gray.top == mercury.top });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return gray.bottom == mercury.bottom });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return display.number == temperature.c });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return mercury.top == mouse.location_y });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return mercury.top <= thermometer.top });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return mercury.bottom == thermometer.bottom });

        for (var i = 0; i < numIterations; i++) {
            ctx.mouse.location_y = i;
            console.assert(ctx.mouse.location_y == i);
        }
    }

    clDragSimEdit(numIterations) {
        var ctx = {
                mouse: {location_y: 0},
                mercury: {top: 0, bottom: 0},
                thermometer: {top: 0, bottom: 0},
                temperature: {c: 0},
                gray: {top: 0, bottom: 0},
                white: {top: 0, bottom: 0},
                display: {number: 0}},
            solver = new Cassowary();
        solver.setAutosolve(false);

        bbb.always({solver: solver, ctx: ctx},
                   function() { return temperature.c == mercury.top });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return white.top == thermometer.top });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return white.bottom == mercury.top });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return gray.top == mercury.top });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return gray.bottom == mercury.bottom });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return display.number == temperature.c });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return mercury.top == mouse.location_y });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return mercury.top <= thermometer.top });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return mercury.bottom == thermometer.bottom });

        var cb = bbb.edit(ctx.mouse, ['location_y']);
        for (var i = 0; i < numIterations; i++) {
            cb([i]);
            console.assert(ctx.mouse.location_y == i);
        }
        cb();
    }

    clDrag2DSimParam(numIterations, sheer) {
        var ctx = {
            mouse: {x: 100, y: 100},
            wnd: {w: 100, h: 100},
            comp1: {w: 70, display: 0},
            comp2: {w: 30, display: 0}
        };
        var solver = new Cassowary();
        solver.setAutosolve(false);

        bbb.always({solver: solver, ctx: ctx},
                   function() { return wnd.w == mouse.x });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return wnd.h == mouse.y });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return comp1.w <= 400; });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return comp1.w + comp2.w == wnd.w; });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return comp1.display == wnd.w; });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return comp2.display == wnd.h; });

        for (var i = 0; i < numIterations; i++) {
            ctx.mouse.x = 100 + i;
            if (i % sheer == 0) {
                ctx.mouse.y = 100 + i;
            }
            console.assert(ctx.mouse.x == 100 + i);
            if (i % sheer == 0) {
                console.assert(ctx.mouse.y == 100 + i);
            }
        }
    }

    clDrag2DSimEditParam(numIterations, sheer) {
        var ctx = {
            mouse: {x: 100, y: 100},
            wnd: {w: 100, h: 100},
            comp1: {w: 70, display: 0},
            comp2: {w: 30, display: 0}
        };
        var solver = new Cassowary();
        solver.setAutosolve(false);

        bbb.always({solver: solver, ctx: ctx},
                   function() { return wnd.w == mouse.x });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return wnd.h == mouse.y });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return comp1.w <= 400; });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return comp1.w + comp2.w == wnd.w; });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return comp1.display == wnd.w; });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return comp2.display == wnd.h; });

        var cb = bbb.edit(ctx.mouse, ['x', 'y']);
        for (var i = 0; i < numIterations; i++) {
            cb([100 + i, Math.floor((100 + i) / sheer) * sheer]);
            console.assert(ctx.mouse.x == 100 + i);
            console.assert(ctx.mouse.y == Math.floor((100 + i) / sheer) * sheer);
        }
        cb();
    }

    clDrag2DSim(numIterations) {
        this.clDrag2DSimParam(numIterations, 1);
    }

    clDrag2DSimEdit(numIterations) {
        this.clDrag2DSimEditParam(numIterations, 1);
    }

    clDrag2DSimFastX(numIterations) {
        this.clDrag2DSimParam(numIterations, 3);
    }

    clDrag2DSimFastXEdit(numIterations) {
        this.clDrag2DSimEditParam(numIterations, 3);
    }

    clDrag2DSimChangeParam(numIterations, numSwitch) {
        var ctx = {
            mouse: {x: 100, y: 100},
            wnd: {w: 100, h: 100},
            comp1: {w: 70, display: 0},
            comp2: {w: 30, display: 0}
        };
        var solver = new Cassowary();
        solver.setAutosolve(false);

        bbb.always({solver: solver, ctx: ctx},
                   function() { return wnd.w == mouse.x });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return wnd.h == mouse.y });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return comp1.w <= 400; });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return comp1.w + comp2.w == wnd.w; });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return comp1.display == wnd.w; });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return comp2.display == wnd.h; });

        for (var i = 0; i < numIterations; i++) {
            if (i < numSwitch) {
                ctx.mouse.x = 100 + i;
                console.assert(ctx.mouse.x == 100 + i);
            } else {
                ctx.mouse.y = 100 + (i - numSwitch);
                console.assert(ctx.mouse.x == numSwitch - 1);
                console.assert(ctx.mouse.y == 100 + (i - numSwitch));
            }
        }
    }

    clDrag2DSimChangeEditParam(numIterations, numSwitch) {
        var ctx = {
            mouse: {x: 100, y: 100},
            wnd: {w: 100, h: 100},
            comp1: {w: 70, display: 0},
            comp2: {w: 30, display: 0}
        };
        var solver = new Cassowary();
        solver.setAutosolve(false);

        bbb.always({solver: solver, ctx: ctx},
                   function() { return wnd.w == mouse.x });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return wnd.h == mouse.y });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return comp1.w <= 400; });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return comp1.w + comp2.w == wnd.w; });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return comp1.display == wnd.w; });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return comp2.display == wnd.h; });

        var cb = bbb.edit(ctx.mouse, ['x']);
        for (var i = 0; i < numIterations; i++) {
            if (i < numSwitch) {
                cb([100 + i]);
                console.assert(ctx.mouse.x == 100 + i);
            } else {
                if (i == numSwitch) {
                    cb();
                    cb = bbb.edit(ctx.mouse, ['y']);
                }
                cb([100 + (i - numSwitch)]);
                console.assert(ctx.mouse.x == numSwitch - 1);
                console.assert(ctx.mouse.y == 100 + (i - numSwitch));
            }
        }
        cb();
    }

    clDrag2DSimChangeHalf(numIterations) {
        this.clDrag2DSimChangeParam(numIterations, numIterations / 2);
    }

    clDrag2DSimChangeHalfEdit(numIterations) {
        this.clDrag2DSimChangeEditParam(numIterations, numIterations / 2);
    }

    clDrag2DSimChangeTenth(numIterations) {
        this.clDrag2DSimChangeParam(numIterations, numIterations / 10);
    }

    clDrag2DSimChangeTenthEdit(numIterations) {
        this.clDrag2DSimChangeEditParam(numIterations, numIterations / 10);
    }

    clDrag2DSimFreqChangeParam(numIterations, switchFreq) {
        var ctx = {
            mouse: {x: 100, y: 100},
            wnd: {w: 100, h: 100},
            comp1: {w: 70, display: 0},
            comp2: {w: 30, display: 0}
        };
        var solver = new Cassowary();
        solver.setAutosolve(false);

        bbb.always({solver: solver, ctx: ctx},
                   function() { return wnd.w == mouse.x });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return wnd.h == mouse.y });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return comp1.w <= 400; });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return comp1.w + comp2.w == wnd.w; });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return comp1.display == wnd.w; });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return comp2.display == wnd.h; });

        for (var i = 0; i < numIterations; i++) {
            if (i % (switchFreq * 2) < switchFreq) {
                ctx.mouse.x = 100 + i;
                console.assert(ctx.mouse.x == 100 + i);
            } else {
                ctx.mouse.y = 100 + i;
                console.assert(ctx.mouse.y == 100 + i);
            }
        }
    }

    clDrag2DSimFreqChangeEditParam(numIterations, switchFreq) {
        var ctx = {
            mouse: {x: 100, y: 100},
            wnd: {w: 100, h: 100},
            comp1: {w: 70, display: 0},
            comp2: {w: 30, display: 0}
        };
        var solver = new Cassowary();
        solver.setAutosolve(false);

        bbb.always({solver: solver, ctx: ctx},
                   function() { return wnd.w == mouse.x });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return wnd.h == mouse.y });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return comp1.w <= 400; });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return comp1.w + comp2.w == wnd.w; });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return comp1.display == wnd.w; });
        bbb.always({solver: solver, ctx: ctx},
                   function() { return comp2.display == wnd.h; });

        var cb = bbb.edit(ctx.mouse, ['x', 'y']);
        for (var i = 0; i < numIterations; i++) {
            if (i % (switchFreq * 2) < switchFreq) {
                cb([100 + i, 100 + i / (switchFreq * 2)]);
                console.assert(ctx.mouse.x == 100 + i);
            } else {
                cb([100 + i / (switchFreq * 2), 100 + i]);
                console.assert(ctx.mouse.y == 100 + i);
            }
        }
        cb();
    }

    clDrag2DSimFreqChange5(numIterations) {
        this.clDrag2DSimChangeParam(numIterations, 5);
    }

    clDrag2DSimFreqChange5Edit(numIterations) {
        this.clDrag2DSimChangeEditParam(numIterations, 5);
    }
}

