var Sequences;
(function (Sequences) {
    'use strict';

    var iterSymbol = self.Symbol ? Symbol.iterator : "@@iterator";

    Object.defineProperties(Sequences, {
        numbers: {
            writable: true,
            value: function numbers(initialValue, step) {
                return function* numbers(initialValue_, step_) {
                    var n = initialValue_ || initialValue || 0;
                    var s = step_ || step || 1;
                    while (true) {
                        yield n;
                        n += s;
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
                        return function* generatorFromFunction(initialValue_) {
                            var r = initialValue_ || initialValue;
                            while (true) {
                                r = source(r);
                                if (r && typeof r === 'object' && ('value' in r) && ('done' in r)) {
                                    if (r.done) {
                                        break;
                                    }
                                    r.result = yield r.value;
                                } else {
                                    var t = yield r;
                                    r = typeof t !== 'undefined' ? t : r;
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
            function (initialValue, v) {
                return this
                    .filter(function(x) { return x === v; })
                    .head(1)
                    .reduce(function () { return true; }, false, initialValue);
            }.bind(Sequences.toGenerator(value), thisArg);
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

    var slice = Array.prototype.slice;

    Object.defineProperties(proto, {
        forEach: {
            writable: true,
            value: function forEach(callback, thisArg) {
                var r, i = this.apply(null, slice.call(arguments, 2));
                while (true) {
                    var x = i.next(r);
                    if (x.done) {
                        break;
                    }
                    r = callback.call(thisArg, x.value);
                }
            }
        },
        until: {
            writable: true,
            value: function until(callback, thisArg) {
                var filter = filterFunction(callback, thisArg);
                return function* () {
                    var r, i = this.apply(null, arguments);
                    while (true) {
                        var x = i.next(r);
                        if (x.done || filter(x.value, r) === true) {
                            break;
                        }
                        r = yield x.value;
                    }
                }.bind(this);
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
                    var r, i = this.apply(null, arguments);
                    for (var counter = 0; counter < length; ++counter) {
                        var x = i.next(r);
                        if (x.done) {
                            break;
                        }
                        r = yield x.value;
                    }
                }.bind(this);
            }
        },
        filter: {
            writable: true,
            value: function filter(callback, thisArg) {
                var filter = filterFunction(callback, thisArg);
                return function* () {
                    for (var i of this.apply(null, arguments)) {
                        if (filter(i)) {
                            yield i;
                        }
                    }
                }.bind(this);
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
                        var iter = this.apply(null, slice.call(arguments, 2));
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
                        var iter = this.apply(null, slice.call(arguments, 2));
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
                    var r, i = this.apply(null, arguments);
                    while (true) {
                        var x = i.next(r);
                        if (x.done) {
                            break;
                        }
                        r = yield callback.call(thisArg, x.value, r);
                    }
                }.bind(this);
            }
        },
        flatten: {
            writable: true,
            value: function flatten() {
                return function* () {
                    for (var i of this.apply(null, arguments)) {
                        var generator = Sequences.toGenerator(i);
                        if (generator().next().value === i) {
                            yield i;
                        } else {
                            yield* generator.flatten().apply(null, arguments);
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
                        yield* this.apply(null, arguments);
                    }
                }.bind(this);
            }
        },
        concat: {
            writable: true,
            value: function concat() {
                var args = Sequences.toGenerator(arguments).map(Sequences.toGenerator);
                return function* () {
                    yield* this.apply(null, arguments);
                    for (var i of args()) {
                        yield* i.apply(null, arguments);
                    }
                }.bind(this);
            }
        },
        reduce: {
            writable: true,
            value: function reduce(callback, r) {
                var i = this.apply(null, slice.call(arguments, 2));
                while (true) {
                    var x = i.next(r);
                    if (x.done) {
                        break;
                    }
                    r = callback(r, x.value);
                }
                return r;
            }
        },
        combine: {
            writable: true,
            value: function combine() {
                var generators = Sequences.toGenerator(arguments).map(Sequences.toGenerator);
                return function* () {
                    var args = slice.call(arguments);
                    var iters = generators.map(function (g) { return g.apply(null, args); }).toArray();
                    iters.unshift(this.apply(null, args));
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
                return this
                    .bind.apply(this, slice.call(arguments, 2))
                    .combine(Sequences.numbers())
                    .skip(fromIndex)
                    .filter(function (v) { return v[0] === value; })
                    .head()
                    .reduce(function (r, v) { return v[1]; }, -1);
            }
        },
        toArray: {
            writable: true,
            value: function toArray() {
                return this
                    .bind.apply(this, slice.call(arguments))
                    .reduce(function (a, v) { return a.push(v), a; }, []);
            }
        },
        use: {
            writable: true,
            value: function use(callback, thisArg) {
                return callback.call(thisArg, this.apply(null, slice.call(arguments, 2)));
            }
        }
    });
}(Sequences || (Sequences = {})));
