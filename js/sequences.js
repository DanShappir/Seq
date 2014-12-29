var sequences;
(function (sequences) {
    'use strict';

    Object.defineProperties(sequences, {
        numbers: {
            writable: true,
            value: function numbers(initialValue) {
                return function* () {
                    var n = initialValue || 0;
                    while (true) {
                        yield n++;
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

    var proto = Object.getPrototypeOf(sequences.numbers());

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

    Object.defineProperties(Object.getPrototypeOf(proto), {
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
                var self = this;
                return function* () {
                    for (var i of self()) {
                        if (callback(i) === true) {
                            break;
                        }
                        yield i;
                    }
                };
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
                var self = this;
                return function* () {
                    var counter = 0;
                    for (var i of self()) {
                        if (++counter > length) {
                            break;
                        }
                        yield i;
                    }
                };
            }
        },
        filter: {
            writable: true,
            value: function filter(callback, thisArg) {
                callback = filterFunction(callback, thisArg);
                var self = this;
                return function* () {
                    for (var i of self()) {
                        if (callback(i)) {
                            yield i;
                        }
                    }
                };
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
                var self = this;
                return function* () {
                    var iter = self();
                    var counter = 0;
                    for (var i of iter) {
                        if (++counter > number) {
                            yield i;
                        }
                    }
                };
            }
        },
        map: {
            writable: true,
            value: function map(callback, thisArg) {
                var self = this;
                return function* () {
                    for (var i of self()) {
                        yield callback.call(thisArg, i);
                    }
                };
            }
        },
        flatten: {
            writable: true,
            value: function flatten() {
                var self = this();
                return function* () {
                    for (var i of self()) {
                        if (sequences.isGenerator(i)) {
                            yield* i.flatten()();
                        } else {
                            yield i;
                        }
                    }
                };
            }
        },
        loop: {
            writable: true,
            value: function loop(times) {
                times || (times = Infinity);
                var self = this;
                return function* () {
                    for (var i = 0; i < times; ++i) {
                        yield* self();
                    }
                };
            }
        },
        concat: {
            writable: true,
            value: function concat() {
                var args = Array.prototype.slice.apply(arguments).filter(sequences.isGenerator);
                var self = this;
                return function* () {
                    yield* self();
                    for (var i = 0; i < args.length; ++i) {
                        yield* args[i]();
                    }
                };
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
                sequences.toGenerator(arguments).filter(function (arg) {
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
}(sequences || (sequences = {})));
