/*
 * Node.js Event Object example using Event class
 *
 * Based upon code from Marc Wandschneider's "Learning Node.js" book
 */

var events = require('events');

/*
 * Define a Downloader() object that simulates an event-driven download
 * functional object by simulating the download using a two-second delay.
 */

function Downloader() {

} // Downloader()
    
/*
 * Downloader object inherets from EventEmitter()
 */

Downloader.prototype = new events.EventEmitter();
Downloader.prototype.__proto__ = events.EventEmitter.prototype;
Downloader.prototype.url = null;

// Constructor

Downloader.prototype.download_url = function(path) {

    var self = this;
    self.url = path;
    self.emit('start', path);
    setTimeout(function() {
        self.emit('end', path);
    }, 2000);

}

/*
 * Main
 */

// Create an instance of downloader

var d = new Downloader();

// Attach to 'start' event chain

d.on('start', function(path) {
    console.log("Started downloading: " + path);
});

// Attach to 'end' event chain

d.on('end', function(path) {
    console.log("Finished downloading: " + path);
});

// Call download_url method which issues 'start' event, 
// delays 2 seconds, then emits 'end' event.

d.download_url("http://ptodd.org");

