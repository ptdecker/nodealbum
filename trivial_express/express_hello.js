/*
 * Hello World a la Express
 */

var express = require('express');
var app = express();

app.get('/', function(req, res) {
    res.end("Hello World!\n");
});

app.listen(8080);
