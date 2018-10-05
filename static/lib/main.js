"use strict";
/* globals $, require */

$(document).ready(function() {
	function upload(callback) {
		require(['uploader'], function (uploader) {
			uploader.show({
				title: 'Upload PDF',
				description: 'Upload an PDF file for embedding into your post',
				route: config.relative_path + '/plugins/nodebb-plugin-pdf-embed/upload'
			}, callback);
		});
	}

	$(window).on('action:composer.loaded', function (ev, data) {
		require(['composer/formatting', 'composer/controls'], function(formatting, controls) {
			if (formatting && controls) {
				formatting.addButtonDispatch('pdf-embed', function(textarea, selectionStart, selectionEnd){
					upload(function (id) {
						controls.insertIntoTextarea(textarea, '[pdf/' + id + ']');
						controls.updateTextareaSelection(textarea, id.length + 8, id.length + 8);
					});
				});
			}
		});

		if ($.Redactor) {
			$.Redactor.opts.plugins.push('pdf-embed');
		}
	});

	$(window).on('action:redactor.load', function() {
		$.Redactor.prototype['pdf-embed'] = function () {
			return {
				init: function () {
					var self = this;

					// require translator as such because it was undefined without it
					require(['translator'], function (translator) {
						translator.translate('Embed PDF', function (translated) {
							var button = self.button.add('pdf-embed', translated);
							self.button.setIcon(button, '<i class="fa fa-file-pdf-o"></i>');
							self.button.addCallback(button, self['pdf-embed'].onClick);
						});
					});
				},
				onClick: function () {
					var self = this;
					upload(function (id) {
						templates.parse('partials/pdf-embed', {
							path: config.relative_path + '/uploads/pdf-embed/' + id
						}, function (html) {
							self.insert.html(html);
						});
					});
				}
			};
		};
	});
});