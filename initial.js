#!/usr/bin/env node

(function() {
  var parseQuery, fs, parse, noop;

  parseQuery = require('querystring').parse;
  fs = require('fs');
  noop = new Function;

  function trim(cmd) {
    var rcmd, fchar;

    rcmd = (cmd || '').trim();
    fchar = rcmd.charAt(0);

    if ((fchar === '"' || fchar === "'") && fchar === rcmd.slice(-1))
      rcmd = rcmd.slice(1, -1);

    return rcmd;
  }

  function stripBOM(text) {
    return text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
  }

  function makeArray(key, array) {
    var cmd, size;

    size = 0;
    cmd = array.reduce(function(prev, curr) {
      curr = trim(String(curr));
      size += curr.length;
      prev.push(curr);
      return prev;
    }, []);

    if (size <= 30)
      cmd[0] = cmd.join('  ')
      , cmd.length = 1;

    return ['[@' + key + ']'].concat(cmd);
  }

  function makeObject(key, obj) {
    var cmd = [];

    if (Object.keys(obj).length) {
      cmd.push('[' + key + ']');
      for (var k in obj)
        cmd.push(trim(JSON.stringify(k)) + ' = ' + trim(JSON.stringify(obj[k])));
    }

    return cmd;
  }

  function makeString(key, str) {
    return ['[&' + key + ']', trim(String(str))];
  }

  function world(cmd) {
    if (cmd === 'null') return null;
    if (cmd === 'true') return true;
    if (cmd === 'false') return false;
    if (/^[-+]?\d+$/.test(cmd)) return eval(cmd);
    return cmd;
  }


  parse = this.parse = function(source) {
    var result, fchar, index, oini, key, nk, k;

    source = source.replace(/(?:\n)?\s*;([^\n]+)?/g, '').trim().replace(/^\[/, '');
    source = parseQuery(source, '[', ']');
    result = {};

    for (key in source)
      if (key !== '') {
        fchar = key.charAt(0);

        if (fchar === '&')
          // examples: [&path]./apps/webSite
          //        => path = './apps/webSite'
          result[key.slice(1)] = trim(source[key]);

        else if (fchar === '@')
          // examples: [@suffix].html  .shtml  .xml
          //        => suffix = ['.html', '.shtml', '.xml']
          result[key.slice(1)] = trim(source[key]).split(/\s+/);

        else {
          oini = parseQuery(source[key].trim(), '\n', '=');
          result[key] = {};
          index = 0;

          for (k in oini)
            if (k !== '' && (nk = trim(k)) !== '')
              result[key][nk] = world(trim(oini[k]));
        }
      }

    return result;
  };


  this.stringify = function(cmds) {
    var cmd, method, key, val;

    cmd = [];
    for (key in cmds) {
      val = cmds[key];

      if (Array.isArray(val)) method = makeArray;
      else if (typeof val === 'object') method = makeObject;
      else method = makeString;

      cmd = cmd.concat('\n', method(key, val));
    }

    return cmd.join('\n').trim();
  };


  this.loadSync = function(file, charset) {
    return this.parse(stripBOM(fs.readFileSync(file, charset || 'utf8')));
  };


  this.writeSync = function(file, data, charset) {
    return fs.writeFileSync(file, this.stringify(data), charset || 'utf8');
  };


  this.load = function(file, charset, callback) {
    if (typeof charset === 'function')
      callback = charset, charset = 'utf8';

    if (typeof callback !== 'function')
      callback = noop;

    fs.readFile(file, charset || 'utf8', function(err, data) {
      if (!err) data = parse(stripBOM(data));
      callback(err, data);
    });
  };


  this.write = function(file, data, callback) {
    var text;

    if (typeof callback !== 'function')
      callback = noop;

    fs.writeFile(file, (text = this.stringify(data)), function() {
      callback(text);
    });
  };

}).call(this);
