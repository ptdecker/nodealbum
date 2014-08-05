var express = require('express');
express().get('/', function(req, res) {
    res.end("Hello World!\n");
}).listen(8080);
