/**
 * Created by Dan on 12/26/2014.
 */
(function () {
    'use strict';

    function isOdd(v) {
        return v % 2;
    }

    function show(v) {
        var div = document.createElement('div');
        div.textContent = v;
        document.body.appendChild(div);
    }

    //sequences.numbers().skip(10).head(10).tee(function (g) {
    //    g.filter(isOdd).forEach(show);
    //}).exclude(isOdd).forEach(show);

    //sequences.numbers().head(10).loop().head(42).forEach(show);

    sequences.numbers().head(10).concat(sequences.numbers().head(10)).forEach(show);
}());