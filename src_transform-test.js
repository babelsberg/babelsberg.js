import BabelsbergSrcTransform from './src_transform.js'

import {assert} from '../lively4-core/node_modules/chai/chai.js'

describe("BabelsbergSrcTransform", function() {
    it('should PrologTransform1', function () {
        var src = "rule: 'abs(N,N) |- N>=0'";
        var result = new BabelsbergSrcTransform().transform(src);
        result = result.replace(/[ \n\r\t]/g,"");
        assert(result === "bbb.rule(\"abs(N,N):-N>=0\");", result);
    })

    it('should PrologTransform2', function () {
        var src = "rule: { abs(N,N) |- N>=0 }";
        var result = new BabelsbergSrcTransform().transform(src);
        result = result.replace(/[ \n\r\t]/g,"");
        assert(result === "bbb.rule(\"abs(N,N):-N>=0\");", result);
    })

    it('should AssignResult2', function () {
        var src = "always: {name: c; a < b}";
        var result = new BabelsbergSrcTransform().transform(src);
        result = result.replace(/[ \n\r\t]/g,"");
        assert(result === "c=bbb.always({ctx:{c:c,a:a,b:b,_$_self:this.doitContext||this}},function(){returna<b;;});", result);
    })
    it('should AssignResult', function () {
        var src = "always: {store: c; a < b}";
        var result = new BabelsbergSrcTransform().transform(src);
        result = result.replace(/[ \n\r\t]/g,"");
        assert(result === "c=bbb.always({ctx:{c:c,a:a,b:b,_$_self:this.doitContext||this}},function(){returna<b;;});", result);
    })

    it('should ObjectEditorTransform1', function () {
        var src = "always: {a < b}";
        var result = new BabelsbergSrcTransform().transform(src);
        result = result.replace(/[ \n\r\t]/g,"");
        assert(result === "bbb.always({ctx:{a:a,b:b,_$_self:this.doitContext||this}},function(){returna<b;;});", result);
    })
    it('should ObjectEditorTransform2', function () {
        var src = "always: {solver: cassowary; priority: 'high'; a < b}";
        var result = new BabelsbergSrcTransform().transform(src);
        result = result.replace(/[ \n\r\t]/g,"");
        assert(result === "bbb.always({solver:cassowary,priority:\"high\",ctx:{cassowary:cassowary,a:a,b:b,_$_self:this.doitContext||this}},function(){returna<b;;});", result);
    })
    it('should ObjectEditorTransformTrigger', function () {
        var src = "var c = when(function() {a < b}).trigger(function () { alert });";
        var result = new BabelsbergSrcTransform().transform(src);
        result = result.replace(/[ \n\r\t]/g,"");
        assert(result === "varc=bbb.when({ctx:{a:a,b:b,_$_self:this.doitContext||this}},function(){returna<b;;}).trigger(function(){alert;});", result);
    })
    it('should OETransformWithLaterDeclarations', function () {
        var src = "always: { true }\n\
                    var late;\n";
        var result = new BabelsbergSrcTransform().transform(src);
        // asserts correct indenting, too
        assert(result === "bbb.always({\n" +
                               "    ctx: {\n" +
                               "        _$_self: this.doitContext || this\n" +
                               "    }\n" +
                               "}, function() {\n" +
                               "    return true;;\n" +
                               "});\n" +
                               "\n" +
                               "var late;", result);
    })
    it('should ConvertAddScript', function() {
        var src = "this.addScript(function () { foo })";
        var result = new BabelsbergSrcTransform().transformAddScript(src);
        result = result.replace(/[ \n\r\t]/g,"");
        assert(result === "this.addScript(function(){foo;},\"function(){foo}\");", result);
    })
})
