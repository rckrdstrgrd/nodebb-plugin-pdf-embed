'use strict';
/* globals $, app, socket, define */

define('admin/plugins/pdf-embed', ['settings'], function(Settings) {

	var ACP = {};

	ACP.init = function() {
		Settings.load('pdf-embed', $('.pdf-embed-settings'));

		$('#save').on('click', function() {
			Settings.save('pdf-embed', $('.pdf-embed-settings'), function() {
				app.alert({
					type: 'success',
					alert_id: 'pdf-embed-saved',
					title: 'Settings Saved',
					message: 'Please reload your NodeBB to apply these settings',
					clickfn: function() {
						socket.emit('admin.reload');
					}
				});
			});
		});
	};

	return ACP;
});