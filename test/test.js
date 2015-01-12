/**
 * Created by Dan on 12/26/2014.
 */
(function () {
    'use strict';

    function show(v) {
        var div = document.createElement('div');
        div.textContent = v;
        document.body.appendChild(div);
    }

    var i = Sequences.toGenerator(['there', 'hello', 'there', 'world']).indexOf('there', 1);
    console.log('found:', i);

    Sequences.numbers().combine(Sequences.numbers(1), [2,3,4,5]).forEach(show);

    show('1 ---');

    function isOdd(v) {
        return v % 2;
    }

    Sequences.numbers().skip(10).head(10).tee(function (g) {
        g.filter(isOdd).forEach(show);
    }).exclude(isOdd).forEach(show);

    show('2 ---');

    Sequences.numbers().head(4).concat(Sequences.numbers().head(3), Sequences.numbers().head(2), 42).forEach(show);

    show('3 ---');

    Sequences.numbers().head(5).loop().head(12).forEach(show, 4);

    show('4 ---');

    Sequences.toGenerator([1,[2,[3,[4,5]]]]).flatten().forEach(show);

    show('5 ---');

    Sequences.numbers().until(Sequences.numbers(6).head(3)).forEach(show);

    show('6 ---');

    function* gen(v) {
        v || (v = 0);
        while (true) {
            v += (yield v) || v;
        }
    }
    gen.head(10).forEach(function (v) { return show(v), v; }, 1);
}());
