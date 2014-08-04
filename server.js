var http = require('http'),
    path = require("path"),
    fs = require('fs'),
    url = require('url');


function serve_static_file(file, res) {

console.log("trying to create stream " + file);
    var rs = fs.createReadStream(file);
    var ct = content_type_for_path(file);

    res.writeHead(200, { "Content-Type" : ct });

    rs.on('error', function (e) {
console.log("attempting to return an error (001)");
        res.writeHead(404, { "Content-Type" : "application/json" });
        var out = { error: "not_found", message: "'" + file + "' not found" };
        res.end(JSON.stringify(out) + "\n");
        return;
    });

    rs.pipe(res);
}

function content_type_for_path (file) {
    var ext = path.extname(file);
    switch (ext.toLowerCase()) {
        case '.html': return "text/html";
        case ".js": return "text/javascript";
        case ".css": return 'text/css';
        case '.jpg': case '.jpeg': return 'image/jpeg';
        case '.png': return "image/png";
        default: return 'text/plain';
    }
}

function load_album_list(callback) {
    // we will just assume that any directory in our 'albums'
    // subfolder is an album.
    fs.readdir("albums", function (err, files) {
        if (err) {
            callback(make_error("file_error"), JSON.stringify(err));
            return;
        }

        var only_dirs = [];

        (function iterator(index) {
            if (index == files.length) {
                callback(null, only_dirs);
                return;
            }

            fs.stat("albums/" + files[index], function (err, stats) {
                if (err) {
                    callback(make_error("file_error", JSON.stringify(err)));
                    return;
                }
                if (stats.isDirectory()) {
                    var obj = { name: files[index] }; 
                    only_dirs.push(obj);
                }
                iterator(index + 1)
            });
        })(0);
    });
}

function load_album(album_name, page, page_size, callback) {
    fs.readdir("albums/" + album_name, function (err, files) {
        if (err) {
            if (err.code == "ENOENT") {
                callback(no_such_album());
            } else {
                callback(make_error("file_error", JSON.stringify(err)));
            }
            return;
        }

        var only_files = [];

        (function iterator(index) {
            if (index == files.length) {
                var ps;
                // slice fails gracefully if params are out of range
                ps = only_files.splice(page * page_size, page_size);
                var obj = {
                    short_name: album_name,
                    photos: ps
                };
                callback(null, obj);
                return;
            }

            var path = "albums/" + album_name + "/";

            fs.stat(path + files[index], function (err, stats) {
                if (err) {
                    callback(make_error("file_error", JSON.stringify(err)));
                    return;
                }
                if (stats.isFile()) {
                    var obj = { filename: files[index], desc: files[index] };
                    only_files.push(obj);
                }
                iterator(index + 1)
            });
        })(0);
    });
}

function serve_page(req, res) {

    var core_url = req.parsed_url.pathname;
    var page = core_url.substring(7);

console.log("attempting to serve page: " + page);

    if (page != 'home') {
        send_failure(res, 404, invalid_resource());
        return;
    }

    fs.readFile('basic.html', function(err, contents) {
console.log("reading basic.html");

        if(err) {
            send_failure(res, 500, err);
            return;
        }

        contents = contents.toString('utf8');
        contents = contents.replace('{{PAGE_NAME}}', page);
        res.writeHead(200, {"Content-Type": "text/html"});
        res.end(contents);

    });

}

function handle_incoming_request(req, res) {

    // parse the query params into an object and get the path
    // without them. (2nd param true = parse the params).
    req.parsed_url = url.parse(req.url, true);
    var core_url = req.parsed_url.pathname;

    // test this fixed url to see what they're asking for
    if (core_url.substring(0, 7) == '/pages/') {
console.log("serving page");
        serve_page(req, res);
    } else if (core_url.substring(0, 11) == '/templates/') {
console.log("serving template: templates/" + core_url.substring(11));
        serve_static_file("templates/" + core_url.substring(11), res);
    } else if (core_url.substring(0, 9) == '/content/') {
console.log("serving content:  content/" + core_url.substring(9));
        serve_static_file("content/" + core_url.substring(9), res);
    } else if (core_url == '/albums.json') {
console.log("handling albums.json");
        handle_list_albums(req, res);
    } else if (core_url.substr(0, 7) == '/albums' && core_url.substr(core_url.length - 5) == '.json') {
console.log("getting album.json");
        handle_get_album(req, res);
    } else {
        send_failure(res, 404, invalid_resource());
    }
}

function handle_list_albums(req, res) {
    load_album_list(function (err, albums) {
        if (err) {
            send_failure(res, 500, err);
            return;
        }
        send_success(res, { albums: albums });
    });
}

function handle_get_album(req, res) {

    // get the GET params
    var getp = get_query_params(req);
    var page_num = getp.page ? getp.page : 0;
    var page_size = getp.page_size ? getp.page_size : 1000;

    if (isNaN(parseInt(page_num))) page_num = 0;
    if (isNaN(parseInt(page_size))) page_size = 1000;

    // format of request is /albums/album_name.json
    var core_url = req.parsed_url.pathname;

    var album_name = core_url.substr(7, core_url.length - 12);
    load_album(album_name, page_num, page_size, function (err, album_contents) {
        if (err && err == "no_such_album") {
            send_failure(res, 404, err);
        }  else if (err) {
            send_failure(res, 500, err);
        } else {
            send_success(res, { album_photos: album_contents });
        }
    });
}

function make_error(err, msg) {
    var e = new Error(msg);
    e.code = err;
    return e;
}

function send_success(res, data) {
    res.writeHead(200, {"Content-Type": "application/json"});
    var output = { error: null, data: data };
    res.end(JSON.stringify(output) + "\n");
}

function send_failure(res, code, err) {
    var code = (err.code) ? err.code : err.name;
    res.writeHead(code, { "Content-Type" : "application/json" });
    res.end(JSON.stringify({ error: code, message: err.message }) + "\n");
}

function invalid_resource() {
    return make_error("invalid_resource", "the requested resource does not exist.");
}

function no_such_album() {
    return make_error("no_such_album", "The specified album does not exist");
}

function get_query_params(req) {
    return req.parsed_url.query;
}


http.createServer(handle_incoming_request).listen(8080);
