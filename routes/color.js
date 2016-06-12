var express = require('express');
var router = express.Router();
var randomcolor = require('randomcolor');

/* A descriptive page on how to use /color. */
router.get('/', (req, res, next) => {
    res.render('color/howto', { title_color: randomcolor({ luminosity: 'light' }) });
});

/* Display a raw color.
** eg: /color/green
** eg: /color/black
** eg: /color/blue
** eg: /color/rgb(123,321,423) */
router.get('/:color', function(req, res, next) {
    res.render('color/display', { color: req.params.color });
});

/* Display a hex color.
** eg: /color/hex/6f72a2 */
router.get('/hex/:color', function(req, res, next) {
    res.render('color/display', { color: `#${req.params.color}` });
});

/* Display a rgb color.
** eg: /color/rgb/170,150,230 */
router.get('/rgb/:color', function(req, res, next) {
    res.render('color/display', { color: `rgb(${req.params.color})` });
});

/* Alternative way of displaying a rgb color.
** eg: /color/rgb/170/150/230 */
router.get('/rgb/:r/:g/:b', (req, res, next) => {
    res.render('color/display', { color: `rgb(${req.params.r},${req.params.g},${req.params.b})` });
});

module.exports = router;
