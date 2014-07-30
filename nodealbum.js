/* 
 * nodealbum.js
 *
 * A basic, node.js-based, photo album based upon the examples provided
 * in 'Learning Node.js: A Hands-on Guide to Building Web Applications
 * in JavaScript', by Marc Wandschneider
 */

var http = require('http'),
    fs = require('fs');

/*
 * load_album_list: returns a list of albums from the data store
 *
 * This simplistic version assumes that any directory within the 'albums' directory is
 * a valid photo album.
 */

function load_album_list(callback) {

    fs.readdir("albums", function(err, files) {

        if (err) {
            callback(make_error("file_error", JSON.stringify(err)));
            return;
        };

        var only_dirs = [];
        (function iterator(index) {

            if (index == files.length) {
                callback(null, only_dirs);
                return;
            }

            fs.stat("albums/" + files[index], function(err, stats) {
                if (err) {
                    callback(make_error("file_error", JSON.stringify(err)));
                    return;
                }
                if (stats.isDirectory()) {
                    var obj = { "name": files[index] };
                    only_dirs.push(obj);
                }
                iterator(index + 1);
            }); // fs.stat

        })(0); // function iterator(index)

    }); // fs.readdir

} // function load_album_list

/*
 * load_album: loads all the photos from an album
 *
 * This simplistic version assumes that any files within a sub-directory of the
 * 'albums' directory is a photo in that album.
 */

function load_album(album_name, callback) {

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
        var path = "albums/" + album_name + "/";

        (function iterator(index) {

            if (index == files.length) {
                var obj = {
                    "short_name": album_name,
                    "photos": only_files
                };
                callback(null, obj);
                return;
            }

            fs.stat(path + files[index], function(err, stats) {

                if (err) {
                    callback(make_error("file_error", JSON.stringify(err)));
                    return;
                }

                if (stats.isFile()) {
                    var obj = {
                        "filename": files[index],
                        "desc": files[index]
                    };
                    only_files.push(obj);
                }
                iterator(index + 1);

            }); // fs.stat

        })(0); // iterator(index)

    }); // fs. readdir

} // load_album

/*
 * handle_incoming_request: dispatch incoming JSON request
 */

function handle_incoming_request(req, res) {

    console.log("HANDLING: " + req.method + " " + req.url);

    if (req.url == '/albums.json') {
        handle_list_albums(req, res);
    } else if (req.url.substr(0, 7) == '/albums' && req.url.substr(req.url.length - 5) == '.json') {
        handle_get_album(req, res);
    } else {
        send_failure(res, 404, invalid_resource());
    }

} // handle_incoming_request

/*
 * handle_list_albums: handle a list of albums JSON request
 */

function handle_list_albums(req, res) {

    load_album_list(function(err, albums) {

        if (err) {
            send_failure(res, 500, err);
            return;
        }

        send_success(res, { "albums": albums });

    }); // load_album_list

} // handle_list_albums

/*
 * handle_get_album: handle getting a JSON request for the conents of an album
 *
 * format of request: '/albums/album_name.json'
 */

function handle_get_album(req, res) {

    var album_name = req.url.substr(7, req.url.length - 12);

    load_album(album_name, function(err, album_contents) {

        if (err && err.error == "no_such_album") {
            send_failure(res, 404, err);
        } else if (err) {
            send_failure(res, 500, err);
        } else {
            send_success(res, { "album_data": album_contents });
        }

    }); // load_album

} // handle_get_album

/*
 * make_error: create an error message
 */

function make_error(err, msg) {
    var e = new Error(msg);
    e.code = err;
    return e;
}

/*
 * send_success: send a successful result back to the caller
 */

function send_success(res, data) {
    var output = { "error": null, "data": data };
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(output) + "\n");
}

/*
 * send_failure: send a failure message back to the caller
 */

function send_failure(res, code, err) {
    var code = (err.code) ? err.code : err.name;
    res.writeHead(code, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ "error": code, "message": err.message }) + "\n");
}

/*
 * invalid_resource: handle an invalid resource error
 */

function invalid_resource() {
    return make_error("invalid_resource", "The requested resource does not exist.");
}

/*
 * no_such_album: handle a 'no such album' error
 */

function no_such_album() {
    return make_error("no_such_album", "The specified album does not exist.");
}

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

var s = http.createServer(handle_incoming_request);
s.listen(8080);
