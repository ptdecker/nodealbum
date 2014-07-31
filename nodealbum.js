/* 
 * nodealbum.js
 *
 * A basic, node.js-based, photo album based upon the examples provided
 * in 'Learning Node.js: A Hands-on Guide to Building Web Applications
 * in JavaScript', by Marc Wandschneider
 */

var http = require('http'),
    fs = require('fs'),
    url = require('url');

/*
 * load_album_list: returns a list of albums from the data store
 *
 * This simplistic version assumes that any directory within the 'albums' directory is
 * a valid photo album.
 */

function load_album_list(callback) {

    fs.readdir("albums/", function(err, files) {

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

function load_album(album_name, page, page_size, callback) {

    fs.readdir("albums" + album_name, function (err, files) {

        if (err) {
            if (err.code == "ENOENT") {
                callback(no_such_album(album_name));
            } else {
                callback(make_error("file_error", JSON.stringify(err)));
            }
            return;
        }

        var only_files = [];
        var path = "albums/" + album_name + "/";

        (function iterator(index) {

            if (index == files.length) {
                var ps = only_files.splice(page * page_size, page_size);
                var obj = {
                    "short_name": album_name.substr(1, album_name.length - 1),
                    "photos": ps
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
 * do_rename: rename a photo album
 */

function do_rename(old_name, new_name, callback) {

    fs.rename("albums/" + old_name, "albums/" + new_name, callback);

}

/*
 * handle_incoming_request: dispatch incoming JSON request
 */

function handle_incoming_request(req, res) {

    console.log("HANDLING: " + req.method + " " + req.url);

    // add the parsed_url attribute to the request object and
    // determine the path without the parameters

    req.parsed_url = url.parse(req.url, true);
    var core_url = req.parsed_url.pathname;

    // dispatch based upon the call

    if (core_url == '/albums.json' && req.method.toLowerCase() == 'get') {
        handle_list_albums(req, res);
    } else if (core_url.substr(core_url.length - 12) == '/rename.json' && req.method.toLowerCase() == 'post') {
        handle_rename_album(req, res);
    } else if (core_url.substr(0, 7) == '/albums' && core_url.substr(core_url.length - 5) == '.json') {
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

    // determine the values of the supported GET parameters ('page_num', 'page_size')

    var getp = req.parsed_url.query;

    var page_num = getp.page ? getp.page : 0;
    if (isNaN(parseInt(page_num))) {
        page_num = 0;
    }

    var page_size = getp.page_size ? getp.page_size : 1000;
    if (isNaN(parseInt(page_size))) {
        page_size = 1000;
    }

    var core_url = req.parsed_url.pathname;

    var album_name = core_url.substr(7, core_url.length - 12);

    load_album(album_name, page_num, page_size, function(err, album_contents) {

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
 * handle_rename_album: handle a rename album POST request
 *
 */

function handle_rename_album(req, res) {

    // Get the album name from the URL

    var core_url = req.parsed_url.pathname;
    var parts = core_url.split('/');
    if (parts.length != 4) {
        send_failure(res, 404, invalid_resource(core_url));
        return;
    }
    var album_name = parts[2];

    // Get the POST data from the request.
    // This will be the JSON for the new album name

    var json_body = '';
    req.on('readable', function() {
        var d = req.read();
        if (d) {
            if (typeof d == 'string') {
                json_body += d;
            } else if (typeof d == 'object' && d instanceof Buffer) {
                json_body += d.toString('utf8');
            }
        }
    }); // req.on('readable'

    // When we have all the post data, make sure that
    // the data is valid and then try to do the rename


    req.on('end', function() {

        if (json_body) {

            // We receive a body, now check and see if it is valid
            // JSON and contains the correct parameters

            try {
                var album_data = JSON.parse(json_body);
                if (!album_data.album_name) {
                    send_failure(res, 403, missing_data('album_name'));
                    return;
                }
            } catch (err) {
                send_failure(res, 403, bad_json());
            }


            // Do the actual renaming

            do_rename(album_name, album_data.album_name, function(err, results) {
                if (err && err.code == "ENOENT") {
                    send_failure(res, 403, no_such_album(album_name));
                    return;
                } else if (err) {
                    send_failure(res, 500, file_error(err));
                    return;
                }
                send_success(res, null);
            });

        } else {

            send_failure(res, 403, bad_json());
            res.end();

        }

    }); // req.on('end'

} // handle_rename_album

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
    var output = { "error": (err.code) ? err.code : err.name, "message": err.message };
    res.writeHead(code, { "Content-Type": "application/json" });
    res.end(JSON.stringify(output) + "\n");
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

function no_such_album(album_name) {
    return make_error("no_such_album", "The specified album '" + album_name + "' does not exist.");
}

/*
 * file_error: handle a file error
 */

function file_error(err) {
    return make_error("server_file_error", "There was a file error on the server: " + err.message);
}

/*
 * missing_data: handle missing data errors
 */

function missing_data (missing) {
    return make_error("missing_data", "Your request is missing" + (missing ? ": '" + missing + "'." : " some data."));
}

/*
 * bad_json: handle bad JSON error
 */

function bad_json() {
    return make_error("invalid_json", "The provided data is not valid JSON");
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

var s = http.createServer(handle_incoming_request);

s.once('listening', function() {
    console.log("Ready for incoming requests (port 8080), press 'Ctrl-C' to exit.");
    console.log("");
});

s.once('error',function(err) {
    console.log("Cannot start server because port 8080 seems to already be in use.");
    console.log("");
});

s.listen(8080);

