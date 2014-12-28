var sequences;
(function (sequences) {
    'use strict';

    Object.defineProperties(sequences, {
        numbers: {
            writable: true,
            value: function* numbers(n) {
                n || (n = 0);
                while (true) {
                    yield n++;
                }
            }
        },
        toGenerator: {
            writable: true,
            value: function toGenerator(source, initialValue) {
                if (typeof source === 'function') {
                    return function* generatorFromFunction() {
                        var r = initialValue;
                        while (true) {
                            r = source(r);
                            if (r && ('value' in r) && ('done' in r)) {
                                if (r.done) {
                                    break;
                                }
                                yield r.value;
                            } else {
                                yield r;
                            }
                        }
                    };
                }
                if (typeof source.length === 'number') {
                    return function* generatorFromCollection() {
                        var i = initialValue || 0;
                        for (; i < source.length; ++i) {
                            yield source[i];
                        }
                    };
                }
                if (source && typeof source === 'object') {
                    return function* generatorFromObject() {
                        for (var p in source) {
                            yield [p, source[p]];
                        }
                    };
                }
                return function* generatorFromValue() {
                    yield source;
                };
            }
        }
    });

    function filterFunction(value, thisArg) {
        return typeof value === 'function' ?
            value.bind(thisArg) :
            Array.isArray(value) ?
                function (v) { return value.indexOf(v) !== -1; } :
                Object.is.bind(Object, value);
    }
    function not(func) {
        return function () {
            return !func.apply(this, arguments);
        }
    }

    var proto = Object.getPrototypeOf(sequences.numbers);
    proto.forEach = function forEach(callback, thisArg) {
        for (var i of this()) {
            callback.call(thisArg, i);
        }
    };
    proto.until = function until(callback, thisArg) {
        callback = filterFunction(callback, thisArg);
        var iter = this();
        return function* () {
            for (var i of iter) {
                if (callback(i) === true) {
                    break;
                }
                yield i;
            }
        };
    };
    proto.asLongAs = function asLongAs(callback, thisArg) {
        callback = filterFunction(callback, thisArg);
        return this.until(not(callback));
    };
    proto.head = function head(length) {
        length || (length = 1);
        var counter = 0;
        return this.until(function () {
            return ++counter > length;
        });
    };
    proto.filter = function filter(callback, thisArg) {
        callback = filterFunction(callback, thisArg);
        var iter = this();
        return function* () {
            for (var i of iter) {
                if (callback(i)) {
                    yield i;
                }
            }
        };
    };
    proto.exclude = function exclude(callback, thisArg) {
        callback = filterFunction(callback, thisArg);
        return this.filter(not(callback));
    };
    proto.map = function map(callback, thisArg) {
        var iter = this();
        return function* () {
            for (var i of iter) {
                yield callback.call(thisArg, i);
            }
        };
    };
    proto.reduce = function reduce(callback, initialValue) {
        var r = initialValue;
        for (var i of this()) {
            r = callback(r, i);
        }
        return r;
    };
    proto.tee = function tee() {
        sequences.toGenerator(arguments).filter(function (arg) {
            return typeof arg === 'function';
        }).forEach(function (arg) {
            arg(this);
        }.bind(this));
        return this;
    };
    proto.toArray = function toArray() {
        return this.reduce(function (a, v) {
            return a.push(v), a;
        }, []);
    };
}(sequences || (sequences = {})));
