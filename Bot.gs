function Bot (token, update) {
  this.token = token;
  this.update = update;
  this.handlers = [];
}

Bot.prototype.register = function ( handler) {
  this.handlers.push(handler);
}

Bot.prototype.process = function () {  
  for (var i in this.handlers) {
    var event = this.handlers[i];
    var result = event.condition(this);
    if (result) {
      return event.handle(this);
    }
  }
}

Bot.prototype.request = function (method, data) {
  var contentType = 'application/json';
  var options = {
    'method' : 'post',
    'contentType': contentType,
    'payload' : JSON.stringify(data)
  };
  Logger.log(options);
  
  var response = UrlFetchApp.fetch('https://api.telegram.org/bot' + this.token + '/' + method, options);
  if (response.getResponseCode() == 200) {
    return JSON.parse(response.getContentText());
  }
  
  return false;
}

Bot.prototype.getFile = function (fileId) {
  var response = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/getFile?file_id=' + fileId);
  var pathObj = JSON.parse(response.getContentText());
  var path = pathObj.result.file_path;
  var responseFile = UrlFetchApp.fetch('https://api.telegram.org/file/bot' + this.token + '/' + path);
  var base64 = responseFile.getBlob().getBytes();
  return Utilities.newBlob(base64, MimeType.JPEG);
}

Bot.prototype.saveFile = function (blob, name, path) {
  var file = blob.setName(name);
  var folder = DriveApp.getFoldersByName(path).next();
  folder.createFile(file);
}

Bot.prototype.replyToSender = function (text) {
  return this.request('sendMessage', {
    'chat_id': this.update.message.from.id,
    'text': text,
    'disable_web_page_preview': false,
    'parse_mode': 'HTML'
  });
}

Bot.prototype.replyToSenderWithKeybord = function (options) {
    return this.request('sendMessage', {
      'chat_id': this.update.message.from.id,
      'text': options.text,
      'disable_web_page_preview': false,
      'parse_mode': 'HTML',
      'reply_markup': options.keybord
    });
}

Bot.prototype.replyToAdmins = function (text) {
  for (var i in admins) {
    this.request('sendMessage', {
      'chat_id': admins[i],
      'text': text,
      'disable_web_page_preview': false,
      'parse_mode': 'HTML'
    });
  }
  return 0;
}

function CommandBus() {
  this.commands = [];
}

CommandBus.prototype.on = function (regexp, callback) {
  this.commands.push({'regexp': regexp, 'callback': callback});
}

CommandBus.prototype.condition = function (bot) {
  return true;
}

CommandBus.prototype.handle = function (bot) {
  for (var i in this.commands) {
    var cmd = this.commands[i];
    /*var tokens;
    var update = bot.update;
    if (typeof update['callback_query'] !== 'undefined') {
      var callback = update['callback_query'];
      tokens = cmd.regexp.exec(callback['data']);
    } else {
      tokens = cmd.regexp.exec(bot.update.message.text);
    }*/
    var tokens = cmd.regexp.exec(bot.update.message.text);
    if (tokens != null) {
      return cmd.callback.apply(bot, tokens.splice(1));
    }
  }
  return bot.replyToSender("Invalid command");
}