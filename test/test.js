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

    function isOdd(v) {
        return v % 2;
    }

    var x = Sequences.toGenerator([1,2,3]);
    for (var i of x()) {
        console.log(i);
    }

    Sequences.numbers().skip(10).head(10).tee(function (g) {
        g.filter(isOdd).forEach(show);
    }).exclude(isOdd).forEach(show);

    show('---');

    Sequences.numbers().head(5).loop().head(12).forEach(show);

    show('---');

    Sequences.toGenerator([1,[2,[3,[4,5]]]]).flatten().forEach(show);
}());