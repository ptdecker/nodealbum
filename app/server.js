
var express = require('express');
var app = express();

var fs = require('fs'),
    path = require('path'),
    album_hdlr = require('./handlers/albums.js'),
    page_hdlr = require('./handlers/pages.js'),
    helpers = require('./handlers/helpers.js');

app.use(express.static(__dirname + "/../static"));

app.get('/v1/albums.json', album_hdlr.list_all);
app.get('/v1/albums/:album_name.json', album_hdlr.album_by_name);
app.get('/pages/:page_name', page_hdlr.generate);
app.get('/pages/:page_name/:sub_page', page_hdlr.generate);

/*
app.get('/content/:filename', function (req, res) {
    serve_static_file('../static/content/' + req.params.filename, res);
});
app.get('/albums/:album_name/:filename', function (req, res) {
    serve_static_file('../static/albums/' + req.params.album_name + "/"
                      + req.params.filename, res);
});
app.get('/templates/:template_name', function (req, res) {
    serve_static_file("../static/templates/" + req.params.template_name, res);
});
*/

app.get("/", function (req, res) {
    res.redirect("/pages/home");
    res.end();
});

app.get('*', four_oh_four);


function four_oh_four(req, res) {
    res.writeHead(404, { "Content-Type" : "application/json" });
    res.end(JSON.stringify(helpers.invalid_resource()) + "\n");
}

/*

function serve_static_file(file, res) {
    fs.exists(file, function (exists) {
        if (!exists) {
            res.writeHead(404, { "Content-Type" : "application/json" });
            var out = { error: "not_found",
                        message: "'" + file + "' not found" };
            res.end(JSON.stringify(out) + "\n");
            return;
        }

        var rs = fs.createReadStream(file);
        rs.on(
            'error',
            function (e) {
                res.end();
            }
        );

        var ct = content_type_for_file(file);
        res.writeHead(200, { "Content-Type" : ct });
        rs.pipe(res);
    });
}


function content_type_for_file (file) {
    var ext = path.extname(file);
    switch (ext.toLowerCase()) {
        case '.html': return "text/html";
        case ".js": return "text/javascript";
        case ".css": return 'text/css';
        case '.jpg': case '.jpeg': return 'image/jpeg';
        case '.png': return 'image/png';
        default: return 'text/plain';
    }
}

*/

/*
 * Main body
 */

console.log("                 _            _ _");
console.log("                | |          | | |");
console.log(" _ __   ___   __| | ___  __ _| | |__  _   _ _ __ ___");
console.log("| '_ \\ / _ \\ / _` |/ _ \\/ _` | | '_ \\| | | | '_ ` _ \\");
console.log("| | | | (_) | (_| |  __/ (_| | | |_) | |_| | | | | | |");
console.log("|_| |_|\\___/ \\__,_|\\___|\\__,_|_|_.__/ \\__,_|_| |_| |_|");
console.log("");
console.log("Ready for incoming requests (port 8080), press 'Ctrl-C' to exit.");
console.log("");

app.listen(8080);
