var http = require('http');
var fs = require('fs');
var path = require('path');

function handle_incoming_request(req, res) {
    if (req.method.toLowerCase() == 'get' && req.url.substring(0, 9) == '/content/') {
        serve_static_file(req.url.substring(9), res);
    } else {
        var out = {"error":"not_found", "message":"'" + req.url + "' not found"};
        res.writeHead(404, {"Content-Type":"application/json"});
        res.end(JSON.stringify(out) + "\n");
    }
}

function serve_static_file(file, res) {

    var rs = fs.createReadStream("./content/" + file);
    var ct = content_type_for_path(file);
    res.writeHead(200, { "Content-Type": ct });

    rs.on('error', function(err) {
        var out = {"error":"not_found", "message":"'" + file + "' not found"};
        res.writeHead(404, {"Content-Type":"application/json"});
        res.end(JSON.stringify(out) + "\n");
        return;
    });

    rs.pipe(res);

}

function content_type_for_path(file) {
    switch (path.extname(file).toLowerCase()) {
        case '.html': return "text/html";
        case '.js'  : return "text/javascript";
        case '.css' : return "text/css";
        case '.jpg' : return "image/jpeg";
        case '.png' : return "image/png";
        default:      return "text/plain";
    }
}

http.createServer(handle_incoming_request).listen(8080);


