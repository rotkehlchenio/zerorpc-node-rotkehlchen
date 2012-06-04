// Open Source Initiative OSI - The MIT License (MIT):Licensing
//
// The MIT License (MIT)
// Copyright (c) 2012 DotCloud Inc (opensource@dotcloud.com)
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the "Software"),
// to deal in the Software without restriction, including without limitation
// the rights to use, copy, modify, merge, publish, distribute, sublicense,
// and/or sell copies of the Software, and to permit persons to whom the
// Software is furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
// DEALINGS IN THE SOFTWARE.

var zerorpc = require("..");

var rpcServer = new zerorpc.Server();
rpcServer.bind("tcp://0.0.0.0:4242");

rpcServer.expose({
    addMan: function(sentence, reply) {
        reply(null, sentence + ", man!", false);
    },

    add42: function(n, reply) {
        reply(null, n + 42, false);
    },

    iter: function(from, to, step, reply) {
        for(i=from; i<to; i+=step) {
            reply(null, i, true);
        }

        reply(null, undefined, false);
    },

    simpleError: function(reply) {
        reply("This is an error, man!", undefined, false);
    },

    objectError: function(reply) {
        reply(new Error("This is an error object, man!"), undefined, false);
    },

    streamError: function(reply) {
        reply("This is a stream error, man!", undefined, true);

        var error = false;
        
        try {
            reply(null, "Should not happen", false);
        } catch(e) {
            error = true;
        }

        if(!error) {
            throw new Error("An error should have been thrown");
        }
    },

    quiet: function(reply) {
        setTimeout(function() {
            reply(null, "Should not happen", false);
        }, 31 * 1000);
    }
});

var rpcClient = new zerorpc.Client();
rpcClient.connect("tcp://localhost:4242");

var badRpcClient = new zerorpc.Client();
badRpcClient.connect("tcp://localhost:4040");

function attachError(emitter) {
    emitter.on("error", function(error) {
        throw new Error(error);
    })
}

attachError(rpcServer, rpcClient);

exports.testNormalStringMethod = function(test) {
    test.expect(3);

    rpcClient.invoke("addMan", ["This is not an error"], function(error, res, more) {
        test.ifError(error);
        test.deepEqual(res, "This is not an error, man!");
        test.equal(more, false);
        test.done();
    });
};

exports.testNormalIntMethod = function(test) {
    test.expect(3);

    rpcClient.invoke("add42", [30], function(error, res, more) {
        test.ifError(error);
        test.deepEqual(res, 72);
        test.equal(more, false);
        test.done();
    });
};

exports.testStreamMethod = function(test) {
    test.expect(18);
    var nextExpected = 10;

    rpcClient.invoke("iter", [10, 20, 2], function(error, res, more) {
        test.ifError(error);

        if(nextExpected == 20) {
            test.equal(res, undefined);
            test.equal(more, false);
            test.done();
        } else {
            test.equal(res, nextExpected);
            test.equal(more, true);
            nextExpected += 2;
        }
    });
};

exports.testSimpleError = function(test) {
    test.expect(3);

    rpcClient.invoke("simpleError", [], function(error, res, more) {
        test.equal(error.message, "This is an error, man!");
        test.equal(res, null);
        test.equal(more, false);
        test.done();
    });
};

exports.testObjectError = function(test) {
    test.expect(3);

    rpcClient.invoke("objectError", [], function(error, res, more) {
        test.equal(error.message, "This is an error object, man!");
        test.equal(res, null);
        test.equal(more, false);
        test.done();
    });
};

exports.testStreamError = function(test) {
    test.expect(3);

    rpcClient.invoke("streamError", [], function(error, res, more) {
        test.equal(error.message, "This is a stream error, man!");
        test.equal(res, null);
        test.equal(more, false);
        test.done();
    });
};

exports.testClose = function(test) {
    test.expect(1);

    var closingClient = new zerorpc.Client();
    closingClient.connect("tcp://localhost:4242");

    var hit = false;

    closingClient.invoke("iter", [30, 40, 1], function(error, res, more) {
        if(hit) {
            throw new Error("iter() should not have been called more than once");
        } else {
            hit = true;
            test.ifError(error);
            closingClient.close();
            test.done();
        }
    });
};

exports.testNonExistentMethod = function(test) {
    test.expect(3);

    rpcClient.invoke("non_existent", [], function(error, res, more) {
        test.ok(error);
        test.equal(res, null);
        test.equal(more, false);
        test.done();
    });
};

exports.testQuiet = function(test) {
    test.expect(3);

    rpcClient.invoke("quiet", [], function(error, res, more) {
        test.equal(error.name, "TimeoutExpired");
        test.equal(res, null);
        test.equal(more, false);
        test.done();
    });
};

exports.testBadClient = function(test) {
    test.expect(3);

    badRpcClient.invoke("add42", [30], function(error, res, more) {
        test.ok(error);
        test.equal(res, null);
        test.equal(more, false);
        test.done();
    });
};