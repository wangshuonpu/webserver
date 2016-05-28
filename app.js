/**
 * @file 简单web服务器
 * @author Varsha
 */

import http from 'http';
import path from 'path';
import fs from 'fs';
import url from 'url';

http.createServer((req, res) => {
    let pathname = url.parse(req.url, true).pathname;
    if (pathname === '/') {
        pathname = '/index.html';
    }

    let extname = path.extname(pathname);

    if (extname.length === 0) {
        // FIXME:非静态资源
        res.end();
        return;
    }

    let localPath = '.' + pathname; // 资源路径
    resourceHandler(localPath, extname, req, res);

}).listen(8000);

const typeMap = {
    html: 'text/html',
    css: 'text/css',
    js: 'text/js',
    jpg: 'image/jpeg',
    png: 'image/png',
    pdf: 'application/pdf'
};

function resourceHandler(localPath, extName, req, res) {

    fs.exists(localPath, exists => {

        // 资源不存在
        if (!exists) {
            notFound(res);
            return;
        }

        let head = {
            'Content-Type': typeMap[extName.slice(1)]
        };

        // html不允许缓存
        if (extName === '.html') {
            head = {...head,
                'Cache-Control': 'max-age=0',
                'Expires': new Date(Date.now() - 3600000)
            };

            sendFile(localPath, head, res);
            return;
        }

        // 非html资源,弱缓存验证
        fs.stat(localPath, (err, stat) => {
            if (err) {
                serverError(res);
                return;
            }

            let lastModified = stat.mtime;
            let modifiedSince = req.headers['if-modified-since'];

            // 请求文件未修改
            if (modifiedSince && modifiedSince === '' + lastModified) {
                notModified(res);
                return;
            }

            let date = new Date();
            date.setMinutes(date.getMinutes() + 10); // 过期时间
            head = {
                ...head,
                'Last-Modified': lastModified,
                'Cache-Control': 'max-age=' + (10 * 60),
                'Expires': date
            };

            sendFile(localPath, head, res);
        });
    });
}

// 200 OK
function sendFile(localPath, head, res) {
    fs.readFile(localPath, (err, data) => {
        res.writeHead(200, head);
        res.write(data);
        res.end();
    });
}

// 304 Not Modified
function notModified(res) {
    res.writeHead(304, 'Not Modified');
    res.end();
}

// 404 Not Found
function notFound(res) {
    res.writeHead(404, 'Not Found');
    res.end();
}

// 500 Server Error
function serverError(res) {
    res.writeHead(500, 'Server Error');
    res.end();
}