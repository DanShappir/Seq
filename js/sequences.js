var Sequences;
(function (Sequences) {
    'use strict';

    var iterSymbol = self.Symbol ? Symbol.iterator : "@@iterator";

    Object.defineProperties(Sequences, {
        numbers: {
            writable: true,
            value: function numbers(initValue, step) {
                return function* numbers(initialValue) {
                    var n = initialValue || initValue || 0;
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
            value: function forEach(callback, thisArg, initialValue) {
                var r, i = this(initialValue);
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
                return function* (filter, initialValue) {
                    var r, i = this(initialValue);
                    while (true) {
                        var x = i.next(r);
                        if (x.done || filter(x.value, r) === true) {
                            break;
                        }
                        r = yield x.value;
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
                return function* (initialValue) {
                    var r, i = this(initialValue);
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
                return function* (filter, initialValue) {
                    for (var i of this(initialValue)) {
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
                    function* (number, initialValue) {
                        var iter = this(initialValue);
                        var counter = 0;
                        for (var i of iter) {
                            if (++counter > number) {
                                yield i;
                                break;
                            }
                        }
                        yield* iter;
                    }.bind(this, callback) :
                    function* (filter, initialValue) {
                        var iter = this(initialValue);
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
                return function* (initialValue) {
                    var r, i = this(initialValue);
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
                return function* (initialValue) {
                    for (var i of this(initialValue)) {
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
                return function* (initialValue) {
                    for (var i = 0; i < times; ++i) {
                        yield* this(initialValue);
                    }
                }.bind(this);
            }
        },
        concat: {
            writable: true,
            value: function concat() {
                var args = Sequences.toGenerator(arguments).map(Sequences.toGenerator);
                return function* (initialValue) {
                    yield* this(initialValue);
                    for (var i of args()) {
                        yield* i();
                    }
                }.bind(this);
            }
        },
        reduce: {
            writable: true,
            value: function reduce(callback, r, initialValue) {
                var i = this(initialValue);
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
                var args = Sequences.toGenerator(arguments).map(Sequences.toGenerator);
                return function* (initialValue) {
                    var iters = args.map(function (g) { return g(); }).toArray();
                    iters.unshift(this(initialValue))
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
            value: function indexOf(value, fromIndex, initialValue) {
                return this.combine(Sequences.numbers())
                    .skip(fromIndex)
                    .filter(function (v) { return v[0] === value; })
                    .head()
                    .reduce(function (r, v) { return v[1]; }, -1, initialValue);
            }
        },
        toArray: {
            writable: true,
            value: function toArray(initialValue) {
                return this.reduce(function (a, v) {
                    return a.push(v), a;
                }, [], initialValue);
            }
        }
    });
}(Sequences || (Sequences = {})));
