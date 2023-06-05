const http = require('http');
const url = require('url');
const request = require('request');
const async = require('async');
const RSVP = require("rsvp")


const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;

    if (parsedUrl.query.address) {
        const addresses = Array.isArray(parsedUrl.query.address)
            ? parsedUrl.query.address
            : [parsedUrl.query.address];
        if (path === '/I/want/title') {
            const titles = [];

            let completedRequests = 0;

            addresses.forEach((address, index) => {
                getAddressTitle(address, (error, title) => {
                    if (error) {
                        titles.push({ address, title: 'NO RESPONSE' });
                    } else {
                        titles.push(title);
                    }

                    completedRequests++;

                    if (completedRequests === addresses.length) {
                        sendResponse(res, titles);
                    }
                });
            });
        }
        else if (path === '/I/want/title2') {

            async.map(addresses, getAddressTitle, (error, titles) => {
                if (error) {
                    res.writeHead(500);
                    res.end('Internal Server Error');
                    return;
                }

                sendResponse(res, titles);
            });
        }
        else if (path === '/I/want/title3') {
            const promises = addresses.map(getTitlePromise);

            RSVP.all(promises)
                .then((titles) => {
                    sendResponse(res, titles);
                })
                .catch((error) => {
                    res.writeHead(500);
                    res.end('Internal Server Error');
                });
        } else {
            res.writeHead(404);
            res.end();
        }
    }

    else {
        res.writeHead(404);
        res.end();
    }
});

function getAddressTitle(address, callback) {
    if (!address.startsWith('http://') && !address.startsWith('https://')) {
        address = 'https://' + address;
    }
    request(address, (error, response, body) => {
        if (error || response.statusCode !== 200) {
            callback(error || new Error('Invalid status code'));
            return;
        }

        const titleMatch = body.match(/<title>(.*?)<\/title>/i);

        if (titleMatch && titleMatch[1]) {
            const title = titleMatch[1].trim();

            callback(null, { address, title });
        } else {
            callback(new Error('Title not found'));
        }
    });
}

function getTitlePromise(address) {
    if (!address.startsWith('http://') && !address.startsWith('https://')) {
        address = 'https://' + address;
    }
    return new RSVP.Promise((resolve, reject) => {
        request(address, (error, response, body) => {
            if (error || response.statusCode !== 200) {
                reject(error);
                return;
            }

            const titleMatch = body.match(/<title>(.*?)<\/title>/i);

            if (titleMatch && titleMatch[1]) {

                resolve({ address, title: titleMatch[1].trim() });
            } else {
                resolve('Title not found');
            }
        });
    });

}

function sendResponse(res, titles) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write('<html>');
    res.write('<head></head>');
    res.write('<body>');
    res.write('<h1>Following are the titles of given websites:</h1>');
    res.write('<ul>');
    titles.forEach((title) => {
        res.write(`<li>${title.address} - "${title.title}"</li>`);
    });
    res.write('</ul>');
    res.write('</body>');
    res.write('</html>');
    res.end();
}

const port = 3000;
server.listen(port, () => {
    console.log(`Server is runng on ${port}`)
})