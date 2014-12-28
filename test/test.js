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

    sequences.numbers.tee(function (g) {
        g.filter(isOdd).head(10).forEach(show);
    }).exclude(isOdd).head(10).forEach(show);
}());