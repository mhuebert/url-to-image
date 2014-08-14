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
    var alphabet = 'abcdefghijklmnopqrstuvwxyz';
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

function addMarker() {
    var marker = document.createElement('div');
    marker.textContent = linkInfo.hintString;

    var markerStyle = marker.style;
    markerStyle.position = 'absolute';
    markerStyle.padding = "2px 5px";
    markerStyle.background = "yellow";
    markerStyle.transform = "translate(-50%, -50%)";
    markerStyle.left = linkInfo.bounds.left + "px";
    markerStyle.top = linkInfo.bounds.top + "px";

    // be visible above floating elements
    markerStyle.zIndex = 999;

    node.appendChild(marker);
}


exports.addMarker = addMarker;
exports.getLinksInfo = getLinksInfo;
