"use strict";
/* globals require, module */

var path = require('path'),
    fs = require('fs'),
    mkdirp = require('mkdirp'),
    mv = require('mv'),
    async = require('async'),
    nconf = require.main.require('nconf');
var db = module.parent.require('./database');

var controllers = require('./lib/controllers');

var plugin = {
        embedRegex: /\[pdf\/([\w\-_.]+)\]/g
    },
    app;

plugin.init = function(params, callback) {
    var router = params.router,
        hostMiddleware = params.middleware,
        multiparty = require.main.require('connect-multiparty')();

    app = params.app;

    router.get('/admin/plugins/pdf-embed', hostMiddleware.admin.buildHeader, controllers.renderAdminPage);
    router.get('/api/admin/plugins/pdf-embed', controllers.renderAdminPage);
    router.post('/plugins/nodebb-plugin-pdf-embed/upload', multiparty, hostMiddleware.validateFiles, hostMiddleware.applyCSRF, controllers.upload);
    
    var uploadPath = path.join(nconf.get('upload_path'), 'pdf-embed');

    mkdirp(uploadPath, callback);
};

plugin.addAdminNavigation = function(header, callback) {
    header.plugins.push({
        route: '/plugins/pdf-embed',
        icon: 'file-pdf',
        name: 'PDF Embed'
    });

    callback(null, header);
};

plugin.registerFormatting = function(payload, callback) {
    payload.options.push({ name: 'pdf-embed', className: 'fa fa-file-pdf-o' });
    callback(null, payload);
};

plugin.processUpload = function(payload, callback) {
    if (payload.type.startsWith('application/pdf')) {
        var id = path.basename(payload.path).toLocaleLowerCase(),
            uploadPath = path.join(nconf.get('upload_path'), 'pdf-embed', id);
        async.waterfall([
            async.apply(mv, payload.path, uploadPath),
            async.apply(db.setObject, 'pdf-embed:id:' + id, {
                name: payload.name,
                size: payload.size
            }),
            async.apply(db.sortedSetAdd, 'pdf-embed:date', +new Date(), id)
        ], function(err) {
            if (err) {
                return callback(err);
            }
            callback(null, {
                id: id
            });
        });
    } else {
        callback(new Error('invalid-file-type'));
    }
};

plugin.parsePost = function(data, callback) {
    if (!data || !data.postData || !data.postData.content) {
        return callback(null, data);
    }
   
    plugin.parseRaw(data.postData.content, function(err, content) {
        if (err) {
            return callback(err);
        }

        data.postData.content = content;
        callback(null, data);
    });
};

plugin.parseRaw = function(content, callback) {
    var matches = content.match(plugin.embedRegex);
    if (!matches) {
        return callback(null, content);
    }

    // Filter out duplicates
    matches = matches.filter(function(match, idx) {
        return idx === matches.indexOf(match);
    }).map(function(match) {
        return match.slice(5, -1);
    });
    async.filter(matches, plugin.exists, function(err, ids) {
        async.reduce(ids, content, function(content, id, next) {
            app.render('partials/pdf-embed', {
                id: id,
                path: path.join(nconf.get('relative_path'), '/uploads/pdf-embed', id)
            }, function(err, html) {
                content = content.replace('[pdf/' + id + ']', html);
                next(err, content);
            });
        }, callback);
    });
};

plugin.exists = function(id, callback) {
    db.isSortedSetMember('pdf-embed:date', id, callback);
};

module.exports = plugin;