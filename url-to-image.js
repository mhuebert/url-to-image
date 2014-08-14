// PhantomJS script
// Takes screeshot of a given page. This correctly handles pages which
// dynamically load content making AJAX requests.

// Instead of waiting fixed amount of time before rendering, we give a short
// time for the page to make additional requests.

var _ = require('lodash');
var fs = require('fs');
var Q = require('q');
// var linkhints = require('./linkhints');

var defaultOpts = {
    // How long do we wait for additional requests
    //after all initial requests have got their response
    ajaxTimeout: 300,

    // How long do we wait at max
    maxTimeout: 10000
};

var Page = (function(opts) {
    opts = _.extend(defaultOpts, opts);
    var requestCount = 0;
    var forceRenderTimeout;
    var ajaxRenderTimeout;

    var page = require('webpage').create();
    page.viewportSize = {
        width: opts.width,
        height: opts.height
    };
    // Silence confirmation messages and errors
    // page.onConfirm = page.onPrompt = page.onError = noop;

    page.onResourceRequested = function(request) {
        requestCount += 1;
        // console.log('> request  - queue size:', requestCount);
        clearTimeout(ajaxRenderTimeout);
    };

    page.onResourceReceived = function(response) {
        if (!response.stage || response.stage === 'end') {
            requestCount -= 1;
            // console.log('< response - queue size:', requestCount);
            if (requestCount === 0) {
                ajaxRenderTimeout = setTimeout(renderAndExit, opts.ajaxTimeout);
            }
        }
    };

    var api = {};

    api.render = function(url, file) {
        opts.file = file;

        page.open(url, function(status) {
            if (status !== "success") {
                console.error('Unable to load url:', url);
                phantom.exit(1);
            } else {
                forceRenderTimeout = setTimeout(renderAndExit, opts.maxTimeout);
            }
        });
    };

    function renderAndExit() {
        var con = ""
        page.onConsoleMessage = function(msg) {
            console.log(msg)
          con += msg;
        };
        page.onError = function(msg, trace) {
          con += msg;
          trace.forEach(function(item) {
            con+=('  ', item.file, ':', item.line);
          });
        }
        var height = page.evaluate(function() {
            return document.body.offsetHeight;
        });
        var links = page.evaluate(function() {



            function map(coll, func) {
                return Array.prototype.map.call(coll, func);
            }

            function filter(coll, func) {
                return Array.prototype.filter.call(coll, func);
            }

            function getHintString(index) {
                // something basic for now
                var indexInBase26 = index.toString(26);
                var base26 =   '0123456789abcdefghijklmnop';
                var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                return map(indexInBase26, function(character) {
                    return alphabet[base26.indexOf(character)];
                }).join('');
            }

            function isElementVisible(element) {
                var computedStyle = window.getComputedStyle(element, null);
                return (!(computedStyle.getPropertyValue('visibility') != 'visible' ||
                          computedStyle.getPropertyValue('display') == 'none' ||
                          computedStyle.getPropertyValue('opacity') == '0'));
            }

            function getLinksInfo(node) {
                var links = filter(node.querySelectorAll('a'), isElementVisible);

                return map(links, function(link, index) {
                    return {
                        element: link,
                        bounds: link.getBoundingClientRect(),
                        href: link.href,
                        hintString: getHintString(index)
                    };
                });
            }

            function addMarker(linkInfo) {
                var marker = document.createElement('div');
                marker.textContent = linkInfo.hintString;

                var markerStyle = marker.style;
                markerStyle.position = 'absolute';
                markerStyle.fontFamily = 'Comic Sans, Chalkboard, Arial, sans-serif';
                markerStyle.fontSize= '11px';
                markerStyle.padding = "1px 3px";
                markerStyle.background = "yellow";
                markerStyle.opacity = "0.7";
                markerStyle.fontWeight = "bold";
                markerStyle.transform = "translate(-100%, -100%)";
                markerStyle.left = linkInfo.bounds.left-15 + "px";
                markerStyle.top = linkInfo.bounds.top + "px";

                // be visible above floating elements
                markerStyle.zIndex = 999;

                node.appendChild(marker);
            }

            var node = document.documentElement;
            var links = getLinksInfo(node);
            links.forEach(addMarker);
            return links
        });
        if (height > opts.maxHeight) {
           page.clipRect = { top: 0, left: 0, width: opts.width, height: opts.maxHeight };
        }
        page.render(opts.file);
        // fs.write(opts.file+"_console.txt", con, "w")
        fs.write(opts.file+"_links.txt", generateLinksReference(links));
        fs.write(opts.file+".txt", page.content);
        setTimeout(function(){
            phantom.exit();
        }, 1000);
              
        // var write = Q.node(fs.write);
        // var writeOperations = Q.all([write(opts.file+"_links.txt", generateLinksReference(links)),
        //                              write(opts.file+".txt", page.content)]);
        // writeOperations.then(function() {
        //     phantom.exit();
        // });
    }

    function noop() {}

    return api;
});

function generateLinksReference(linkCollection) {
    return linkCollection.map(function(link) {
        return link.hintString + ': ' + link.href;
    }).join("\n");
}

function die(error) {
    console.error(error);
    phantom.exit(1);
}

function main() {
    var args = require('system').args;

    var url = args[1];
    var file = args[2];
    var width = args[3] || 1280;
    var height = args[4] || 800;
    var maxHeight = args[5] || 1000000;

    var isHelp = args[1] === '-h' || args[1] === '--help';
    if (args.length === 1 || isHelp) {
        var help = 'Usage: phantomjs url-to-image.js <url> <output-file> [width] [height]\n';
        help += 'Example: phantomjs url-to-image.js http://google.com google.png 1200 800';
        die(help);
    }

    if (!url) die('Url parameter must be specified');
    if (!file) die('File parameter must be specified');

    var opts = {
        width: width,
        height: height,
        maxHeight: maxHeight
    };

    var page = Page(opts);
    page.render(url, file);
}


main();
