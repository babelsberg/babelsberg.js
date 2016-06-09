import UglifyJS from './uglify.js';

export default class BabelsbergSrcTransform {
    isAlways(node) {
        return ((node instanceof UglifyJS.AST_LabeledStatement) &&
                (node.label.name === 'always') &&
                (node.body instanceof UglifyJS.AST_BlockStatement));
    }
    isStay(node) {
        return ((node instanceof UglifyJS.AST_LabeledStatement) &&
                (node.label.name === 'stay') &&
                (node.body instanceof UglifyJS.AST_BlockStatement));
    }

    isRule(node) {
        if ((node instanceof UglifyJS.AST_Label) &&
                node.name === 'rule') {
            this.__ruleLabelSeen = node;
            return true;
        } else if (this.__ruleLabelSeen &&
                node instanceof UglifyJS.AST_String) {
            return true;
        } else if ((node instanceof UglifyJS.AST_LabeledStatement) &&
                (node.label.name === 'rule') &&
                (node.body instanceof UglifyJS.AST_BlockStatement)) {
            return true;
        } else if ((node instanceof UglifyJS.AST_LabeledStatement) &&
                (node.body.body instanceof UglifyJS.AST_SimpleStatement) &&
                (node.body.body.body instanceof UglifyJS.AST_Call) &&
                (node.body.body.body.expression instanceof UglifyJS.AST_Dot) &&
                (node.body.body.body.expression.property === 'rule') &&
                (node.body.body.body.expression.expression.name === 'bbb')) {
            // rule label with string that was transformed... remove the label
            this.__ruleLabelRemove = true;
            return true;
        }
        this.__ruleLabelSeen = null;
        return false;
    }

    isOnce(node) {
        return ((node instanceof UglifyJS.AST_LabeledStatement) &&
                (node.label.name === 'once') &&
                (node.body instanceof UglifyJS.AST_BlockStatement));
    }

    isTrigger(node) {
        return ((node instanceof UglifyJS.AST_Call) &&
                (node.expression instanceof UglifyJS.AST_SymbolRef) &&
                (node.expression.name === 'when'));
    }

    ensureThisToSelfIn(ast) {
        var tr = new UglifyJS.TreeTransformer(function(node) {
            if (node instanceof UglifyJS.AST_This) {
                return new UglifyJS.AST_SymbolRef({
                    start: node.start,
                    end: node.end,
                    name: '_$_self'
                });
            }
        }, null);
        ast.transform(tr);
    }

    hasContextInArgs(constraintNode) {
        if (constraintNode.args.length == 2) {
            if (!(constraintNode.args[0] instanceof UglifyJS.AST_Object)) {
                throw new SyntaxError(
                    "first argument of call to `always' must be an object"
                );
            }
            return constraintNode.args[0].properties.some(function(ea) {
                return ea.key === 'ctx';
            });
        } else {
            return false;
        }
    }

    createContextFor(ast, constraintNode) {
        var enclosed = ast.enclosed,
            self = this,
            lastArg = constraintNode.args[constraintNode.args.length - 1];
        if (lastArg instanceof UglifyJS.AST_Function) {
            enclosed = lastArg.enclosed || [];
            enclosed = enclosed.filter(function(ea) {
                // reject all that
                //   1. are not declared (var) BEFORE the always
                //   2. are first referenced (globals, specials, etc) AFTER the always
                return !((ea.init && (ea.init.start.pos > constraintNode.start.pos)) ||
                        (ea.orig && ea.orig[0] &&
                        (ea.orig[0].start.pos > constraintNode.end.pos)));
            });
            enclosed.push({name: '_$_self'}); // always include this
        }
        var ctx = new UglifyJS.AST_Object({
            start: constraintNode.start,
            end: constraintNode.end,
            properties: enclosed.map(function(ea) {
                return new UglifyJS.AST_ObjectKeyVal({
                    start: constraintNode.start,
                    end: constraintNode.end,
                    key: ea.name,
                    value: self.contextMap(ea.name)
                });
            })
        });

        var ctxkeyval = new UglifyJS.AST_ObjectKeyVal({
            start: constraintNode.start,
            end: constraintNode.end,
            key: 'ctx',
            value: ctx
        });
        if (constraintNode.args.length == 2) {
            constraintNode.args[0].properties.push(ctxkeyval);
        } else {
            constraintNode.args.unshift(new UglifyJS.AST_Object({
                start: constraintNode.start,
                end: constraintNode.end,
                properties: [ctxkeyval]
            }));
        }
    }

    ensureContextFor(ast, constraintNode) {
        if (!this.hasContextInArgs(constraintNode)) {
            this.createContextFor(ast, constraintNode);
        }
    }

    getContextTransformerFor(ast) {
        var self = this;
        return new UglifyJS.TreeTransformer(null, function(node) {
            if (self.isAlways(node)) {
                return self.transformConstraint(ast, node, 'always');
            } else if (self.isOnce(node)) {
                return self.transformConstraint(ast, node, 'once');
            } else if (self.isTrigger(node)) {
                return self.transformConstraint(ast, node, 'when');
            } else if (self.isStay(node)) {
                return self.transformConstraint(ast, node, 'stay');
            } else if (self.isRule(node)) {
                var newNode = self.createRuleFor(node);
                self.isTransformed = true;
                return newNode;
            }
        });
    }

    transformConstraint(ast, node, name) {
        var newNode = this.createCallFor(ast, node, name);
        this.isTransformed = true;
        return newNode;
    }

    transform(code) {
        var ast = UglifyJS.parse(code);
        ast.figure_out_scope();
        var transformedAst = ast.transform(this.getContextTransformerFor(ast)),
            stream = UglifyJS.OutputStream({beautify: true, comments: true});
        if (this.isTransformed) {
            transformedAst.print(stream);
            return stream.toString();
        } else {
            return code;
        }
    }

    transformAddScript(code) {
        var ast = UglifyJS.parse(code);
            ast.figure_out_scope(),
            transformed = false;
        var transformedAst = ast.transform(new UglifyJS.TreeTransformer(
            null,
            function(node) {
                if (node instanceof UglifyJS.AST_Call &&
                    node.expression instanceof UglifyJS.AST_Dot &&
                    node.expression.property === 'addScript' &&
                    node.expression.expression instanceof UglifyJS.AST_This) {
                    if(node.args.length !== 1) throw 'Assertion error';
                    node.args.push(new UglifyJS.AST_String({
                        value: code.slice(node.args[0].start.pos, node.args[0].end.endpos)
                    }));
                    transformed = true;
                    return node;
                }
            })),
            stream = UglifyJS.OutputStream({beautify: true, comments: true});
        if (transformed) {
            transformedAst.print(stream);
            return stream.toString();
        } else {
            return code;
        }
    }

    ensureReturnIn(body) {
        var lastStatement = body[body.length - 1];
        if (!(lastStatement.body instanceof UglifyJS.AST_Return)) {
            body[body.length - 1] = new UglifyJS.AST_Return({
                start: lastStatement.start,
                end: lastStatement.end,
                value: lastStatement
            });
        }
    }

    extractArgumentsFrom(constraintNode) {
        var body = constraintNode.body.body,
            newBody = [],
            args = [],
            extraArgs = [],
            store;
        newBody = body.filter(function(ea) {
            if (ea instanceof UglifyJS.AST_LabeledStatement) {
                if (!(ea.body instanceof UglifyJS.AST_SimpleStatement)) {
                    throw new SyntaxError(
                        "Labeled arguments in `always:' have to be simple statements"
                    );
                }
                if (ea.label.name == 'store' || ea.label.name == 'name') {
                    store = new UglifyJS.AST_Assign({
                        start: ea.start,
                        end: ea.end,
                        right: undefined /* filled later */,
                        operator: '=',
                        left: ea.body.body
                    });
                } else {
                    extraArgs.push(new UglifyJS.AST_ObjectKeyVal({
                        start: ea.start,
                        end: ea.end,
                        key: ea.label.name,
                        value: ea.body.body
                    }));
                }
                return false;
            } else {
                return true;
            }
        });
        if (extraArgs) {
            args.push(new UglifyJS.AST_Object({
                start: constraintNode.start,
                end: constraintNode.end,
                properties: extraArgs
            }));
        }
        return {body: newBody, args: args, store: store};
    }

    createCallFor(ast, constraintNode, methodName) {
        var body, args, store, enclosed,
            self = this;
        if (constraintNode instanceof UglifyJS.AST_LabeledStatement) {
            var splitBodyAndArgs = this.extractArgumentsFrom(constraintNode);
            body = splitBodyAndArgs.body;
            args = splitBodyAndArgs.args;
            store = splitBodyAndArgs.store;
            enclosed = constraintNode.label.scope.enclosed;
        } else if (constraintNode instanceof UglifyJS.AST_Call) {
            var nodeArgs = constraintNode.args,
                funcArg = nodeArgs[nodeArgs.length - 1];
            if (!(funcArg instanceof UglifyJS.AST_Function)) {
                throw new SyntaxError(
                    'Last argument to ' +
                        constraintNode.expression.name +
                        ' must be a function'
                );
            }
            body = funcArg.body;
            args = nodeArgs.slice(0, nodeArgs.length - 1);
            enclosed = funcArg.enclosed;
        } else {
            throw new SyntaxError("Don't know what to do with " + constraintNode);
        }

        this.ensureReturnIn(body);
        body.forEach(function(ea) {
            self.ensureThisToSelfIn(ea);
        });

        var call = new UglifyJS.AST_Call({
            start: constraintNode.start,
            end: constraintNode.end,
            expression: new UglifyJS.AST_Dot({
                start: constraintNode.start,
                end: constraintNode.end,
                property: methodName,
                expression: new UglifyJS.AST_SymbolRef({
                    start: constraintNode.start,
                    end: constraintNode.end,
                    name: 'bbb'
                })
            }),
            args: args.concat([new UglifyJS.AST_Function({
                start: body.start,
                end: body.end,
                body: body,
                enclosed: enclosed,
                argnames: []
            })])
        });

        this.ensureContextFor(ast, call);

        var newBody;
        if (store) {
            store.right = call;
            newBody = store;
        } else {
            newBody = call;
        }
        if (constraintNode instanceof UglifyJS.AST_Statement) {
            return new UglifyJS.AST_SimpleStatement({
                start: constraintNode.start,
                end: constraintNode.end,
                body: newBody
            });
        } else {
            return newBody;
        }
    }

    createRuleFor(ruleNode) {
        // remove label
        if (ruleNode instanceof UglifyJS.AST_Label) return ruleNode;

        var stringNode;
        if (ruleNode instanceof UglifyJS.AST_String) {
            stringNode = ruleNode;
            stringNode.value = stringNode.value.replace(/\|\s*-/mg, ':-');
            ruleNode = this.__ruleLabelSeen;
            delete this.__ruleLabelSeen;
        } else if (this.__ruleLabelRemove) {
            delete this.__ruleLabelRemove;
            return ruleNode.body.body;
        } else {
            // ruleNode instanceof UglifyJS.AST_LabeledStatement
            var stream = UglifyJS.OutputStream({beautify: true, comments: true});
            ruleNode.body.print(stream);
            stringNode = new UglifyJS.AST_String({
                start: ruleNode.body.start,
                end: ruleNode.body.end,
                value: stream.toString().
                        replace(/\|\s*-/mg, ':-').
                        replace(/^{\s*/, '').
                        replace(/\s*}\s*$/, '').
                        replace(/\s*;\s*$/, '')
            });
        }

        return new UglifyJS.AST_SimpleStatement({
            start: ruleNode.start,
            end: ruleNode.end,
            body: new UglifyJS.AST_Call({
                start: ruleNode.start,
                end: ruleNode.end,
                expression: new UglifyJS.AST_Dot({
                    start: ruleNode.start,
                    end: ruleNode.end,
                    property: 'rule',
                    expression: new UglifyJS.AST_SymbolRef({
                        start: ruleNode.start,
                        end: ruleNode.end,
                        name: 'bbb'
                    })
                }),
                args: [stringNode]
            })
        });
    }

    contextMap(name) {
        // map some custom shortnames to bbb functions
        if (name === '_$_self') {
            return new UglifyJS.AST_Binary({
                operator: '||',
                left: new UglifyJS.AST_Dot({
                    expression: new UglifyJS.AST_This({}),
                    property: 'doitContext'
                }),
                right: new UglifyJS.AST_This({})
            });
        }

        if (name === 'ro') {
            name = 'bbb.readonly';
        }
        if (name === 'system') {
            name = 'bbb.system()';
        }
        return new UglifyJS.AST_SymbolRef({name: name});
    }

}
