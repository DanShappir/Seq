var Sequences;
(function (Sequences) {
    'use strict';

    var iterSymbol = self.Symbol ? Symbol.iterator : "@@iterator";

    Object.defineProperties(Sequences, {
        numbers: {
            writable: true,
            value: function numbers(initialValue, step) {
                return function* () {
                    var n = initialValue || 0;
                    step || (step = 1);
                    while (true) {
                        yield n += step;
                    }
                };
            }
        },
        isGenerator: {
            writable: true,
            value: function (candidate) {
                return typeof candidate === 'function' && Object.getPrototypeOf(candidate) === proto;
            }
        },
        toGenerator: {
            writable: true,
            value: function toGenerator(source, initialValue) {
                if (source) {
                    if (typeof source.next === 'function') { // Source is an iterator
                        return function* generatorFromIterator() {
                            yield* source;
                        };
                    }
                    var generator = source[iterSymbol];
                    if (Sequences.isGenerator(generator)) {
                        return generator;
                    }
                    if (Sequences.isGenerator(source)) {
                        return source;
                    }
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
                }
                return function* generatorFromValue() {
                    yield source;
                };
            }
        }
    });

    var proto = Object.getPrototypeOf(Sequences.numbers());

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

    (function () {
        var numbers = Sequences.numbers.bind();
        if (!Sequences.isGenerator(numbers)) {
            var origBind = Sequences.numbers.bind;
            Object.defineProperty(proto, 'bind', {
                writable: true,
                value: function bind() {
                    return Object.setPrototypeOf(origBind.apply(this, arguments), proto);
                }
            });
        }
    }());

    Object.defineProperties(proto, {
        forEach: {
            writable: true,
            value: function forEach(callback, thisArg) {
                for (var i of this()) {
                    callback.call(thisArg, i);
                }
            }
        },
        until: {
            writable: true,
            value: function until(callback, thisArg) {
                callback = filterFunction(callback, thisArg);
                return function* () {
                    for (var i of this()) {
                        if (callback(i) === true) {
                            break;
                        }
                        yield i;
                    }
                }.bind(this);
            }
        },
        asLongAs: {
            writable: true,
            value: function asLongAs(callback, thisArg) {
                callback = filterFunction(callback, thisArg);
                return this.until(not(callback));
            }
        },
        head: {
            writable: true,
            value: function head(length) {
                length || (length = 1);
                return function* () {
                    var counter = 0;
                    for (var i of this()) {
                        if (++counter > length) {
                            break;
                        }
                        yield i;
                    }
                }.bind(this);
            }
        },
        filter: {
            writable: true,
            value: function filter(callback, thisArg) {
                callback = filterFunction(callback, thisArg);
                return function* () {
                    for (var i of this()) {
                        if (callback(i)) {
                            yield i;
                        }
                    }
                }.bind(this);
            }
        },
        exclude: {
            writable: true,
            value: function exclude(callback, thisArg) {
                callback = filterFunction(callback, thisArg);
                return this.filter(not(callback));
            }
        },
        skip: {
            writable: true,
            value: function skip(number) {
                number || (number = 1);
                return function* () {
                    var iter = this();
                    var counter = 0;
                    for (var i of iter) {
                        if (++counter > number) {
                            yield i;
                        }
                    }
                }.bind(this);
            }
        },
        map: {
            writable: true,
            value: function map(callback, thisArg) {
                return function* () {
                    for (var i of this()) {
                        yield callback.call(thisArg, i);
                    }
                }.bind(this);
            }
        },
        flatten: {
            writable: true,
            value: function flatten() {
                return function* () {
                    for (var i of this()) {
                        var generator = Sequences.toGenerator(i);
                        if (generator().next().value === i) {
                            yield i;
                        } else {
                            yield* generator.flatten()();
                        }
                    }
                }.bind(this);
            }
        },
        loop: {
            writable: true,
            value: function loop(times) {
                times || (times = Infinity);
                return function* () {
                    for (var i = 0; i < times; ++i) {
                        yield* this();
                    }
                }.bind(this);
            }
        },
        concat: {
            writable: true,
            value: function concat() {
                var args = Array.prototype.slice.apply(arguments).filter(Sequences.isGenerator);
                return function* () {
                    yield* this();
                    for (var i = 0; i < args.length; ++i) {
                        yield* args[i]();
                    }
                }.bind(this);
            }
        },
        reduce: {
            writable: true,
            value: function reduce(callback, initialValue) {
                var r = initialValue;
                for (var i of this()) {
                    r = callback(r, i);
                }
                return r;
            }
        },
        tee: {
            writable: true,
            value: function tee() {
                Sequences.toGenerator(arguments).filter(function (arg) {
                    return typeof arg === 'function';
                }).forEach(function (arg) {
                    arg(this);
                }.bind(this));
                return this;
            }
        },
        toArray: {
            writable: true,
            value: function toArray() {
                return this.reduce(function (a, v) {
                    return a.push(v), a;
                }, []);
            }
        }
    });
}(Sequences || (Sequences = {})));
