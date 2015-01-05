var Sequences;
(function (Sequences) {
    'use strict';

    var iterSymbol = self.Symbol ? Symbol.iterator : "@@iterator";

    Object.defineProperties(Sequences, {
        numbers: {
            writable: true,
            value: function numbers(initialValue, step) {
                return function* numbers() {
                    var n = initialValue || 0;
                    step || (step = 1);
                    while (true) {
                        yield n;
                        n += step;
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
                    if (typeof source.next === 'function') { // source is an iterator
                        return function* generatorFromIterator() {
                            yield* source;
                        };
                    }
                    if (typeof source === 'object' && iterSymbol in source) { // source has an iterator
                        return function* generatorFromFunction2() {
                            yield* source[iterSymbol]();
                        };
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
        return typeof value === 'function' && !Sequences.isGenerator(value) ?
            value.bind(thisArg) :
            function (v) {
                return this.filter(function(x) { return x === v; }).head(1).reduce(function () { return true; }, false);
            }.bind(Sequences.toGenerator(value));
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
                return function* (filter) {
                    for (var i of this()) {
                        if (filter(i) === true) {
                            break;
                        }
                        yield i;
                    }
                }.bind(this, filterFunction(callback, thisArg));
            }
        },
        asLongAs: {
            writable: true,
            value: function asLongAs(callback, thisArg) {
                return this.until(not(filterFunction(callback, thisArg)));
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
                return function* (filter) {
                    for (var i of this()) {
                        if (filter(i)) {
                            yield i;
                        }
                    }
                }.bind(this, filterFunction(callback, thisArg));
            }
        },
        exclude: {
            writable: true,
            value: function exclude(callback, thisArg) {
                return this.filter(not(filterFunction(callback, thisArg)));
            }
        },
        skip: {
            writable: true,
            value: function skip(callback, thisArg) {
                return typeof callback === 'number' ?
                    function* (number) {
                        var iter = this();
                        var counter = 0;
                        for (var i of iter) {
                            if (++counter > number) {
                                yield i;
                                break;
                            }
                        }
                        yield* iter;
                    }.bind(this, callback) :
                    function* (filter) {
                        var iter = this();
                        for (var i of iter) {
                            if (!filter(i)) {
                                yield i;
                                break;
                            }
                        }
                        yield* iter;
                    }.bind(this, filterFunction(callback, thisArg));
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
                var args = Sequences.toGenerator(arguments).map(Sequences.toGenerator);
                return function* () {
                    yield* this();
                    for (var i of args()) {
                        yield* i();
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
        combine: {
            writable: true,
            value: function combine() {
                var args = Sequences.toGenerator(arguments).map(Sequences.toGenerator);
                return function* () {
                    var iters = args.map(function (g) { return g(); }).toArray();
                    iters.unshift(this())
                    while (true) {
                        var nexts = iters.map(function (i) { return i.next(); });
                        if (nexts.some(function (r) { return r.done; })) {
                            return;
                        }
                        yield nexts.map(function (r) { return r.value; });
                    }
                }.bind(this);
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
        indexOf: {
            writable: true,
            value: function indexOf(value, fromIndex) {
                return this.combine(Sequences.numbers())
                    .skip(fromIndex)
                    .filter(function (v) { return v[0] === value; })
                    .head()
                    .reduce(function (r, v) { return v[1]; }, -1);
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
