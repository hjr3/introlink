jQuery.fn.extend({
	insertAtCaret: function(myValue){
	  return this.each(function(i) {
		if (document.selection) {
		  //For browsers like Internet Explorer
		  this.focus();
		  sel = document.selection.createRange();
		  sel.text = myValue;
		  this.focus();
		}
		else if (this.selectionStart || this.selectionStart == '0') {
		  //For browsers like Firefox and Webkit based
		  var startPos = this.selectionStart;
		  var endPos = this.selectionEnd;
		  var scrollTop = this.scrollTop;
		  this.value = this.value.substring(0, startPos)+myValue+this.value.substring(endPos,this.value.length);
		  this.focus();
		  this.selectionStart = startPos + myValue.length;
		  this.selectionEnd = startPos + myValue.length;
		  this.scrollTop = scrollTop;
		} else {
		  this.value += myValue;
		  this.focus();
		}
	  })
	}
});

var il = (function () {
	var api = {},
		poll = false,
		port,
		emails,
	
	connectPort = function() {
		var port = chrome.extension.connect({name: "emails"});
		port.onDisconnect.addListener(function() {
			port = false;
		});
		
		return port;
	},
	
	sendEmails = function(message) {
		if (!port) {
			//console.log('Port is gone');
			
			port = connectPort();
			
			if (!port) {
				//console.log('Port still not connected');
				//console.log(port);
			}
		}
		
		emails = message.emails;
		port.postMessage(message);
	},
	
	findEmails = function (list) {
		var regex = /([a-z0-9!#$%&'\*+\-\/=?\^_`\{\|\}~\.]+@(?:[a-z0-9\-]+)(?:\.[a-z0-9\-]+)+)/i;
		var emails = [];
		
		for (var i = 0; i < list.length; i++) {
			var l = list[i];
			var parts = l.split(regex);
			
			var name = parts[0] || '';
			if (name) {
				name = name.replace(/["<]+/g,'');
			}
			
			var email = parts[1];
			
			
			if (email) {
				email.toLowerCase();
				emails.push({
					raw_email: l,
					email: email,
					name: name
				});
			}
		}
		
		return emails;
	},
	
	pollEmails = function () {

		//console.log('Polling emails');
				
		var e = $("#canvas_frame").contents().find("textarea[name=to]").val();
		if (typeof e === 'undefined') {
			sendEmails({emails:[]});
			return;
		}
		
		var emails = findEmails(e.split(", "));
		
		if (emails.length === 2) {
			//console.log('Send request to make button glow');
			sendEmails({emails: emails});
		} else if (emails.length === 1) {
			e = $("#canvas_frame").contents().find("textarea[name=cc]").val();
			var cc_emails = findEmails(e.split(", "));
			
			if (cc_emails.length === 1) {
				emails = emails.concat(cc_emails);
				//console.log('Send request to make button glow');
				sendEmails({emails: emails});
			} else {
				//console.log('Send request to stop glowing since we do not have 2 emails');
				sendEmails({emails: []});
			}
		} else {
			//console.log('Send request to stop glowing since we do not have 2 emails');
			sendEmails({emails: []});
		}
				
		if (poll) {
			window.setTimeout(pollEmails, 2000);
		}
	};

	api.startPolling = function() {
		//console.log('Looking for emails');
		poll = true;
		pollEmails();
	};
	
	api.stopPolling = function() {
		//console.log('No longer looking for emails');
		poll = false;
	};
	
	api.insertLink = function(email) {
		var href,
			content,
			link,
			textarea;

		href = 'http://develup.me/introlink/invite/?email=' + escape(email.raw_email);
		content = 'Connect with ' + email.name + ' on LinkedIn';

		if (!email.name) {
			content = 'Connect with ' + email.email + ' on LinkedIn';
		}

		link = '<a href="' + href + '" target="_blank">' + content + '</a>';
		textarea = $("#canvas_frame").contents().find("textarea[name=body]").get(0);

		if ($(textarea).is(":visible")) {
			$(textarea).insertAtCaret(link);
		} else {
			var td = $(textarea).closest('td');
			var richformat = td.find('iframe').get(0);
			var body = $(richformat).contents().find('body');
			link = link + '<br>';
			body.append(link);
		}
	};
	
	api.getEmails = function() {
		return emails;
	};

	return api;
}());

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
	sendResponse({});
	
    if (request.poll === true) {
		il.startPolling();
	}
	
	if (request.poll === false) {
		il.stopPolling();
	}
	
	if (request.link === true) {
		var emails = il.getEmails();
		for (var i = 0; i < emails.length; i++) {
			il.insertLink(emails[i]);
		}
	}
});
