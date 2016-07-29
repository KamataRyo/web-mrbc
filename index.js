(function() {
  var PORT, app, createTempDirectory, exec, execCompile, fs, getResource, httpError, informCommand, jsonHeader, makeDownloadHeader, makeErrorResponse, makeRespose, mrbc, request, sendDocument, syntaxCheck, tmp, webCompile, writeTempFile,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  PORT = require('./package.json').config.port;

  tmp = require('tmp');

  fs = require('fs');

  request = require('request');

  app = require('express')();

  exec = require('child_process').exec;

  mrbc = {
    2: "cd " + __dirname + "/mrbc && ./mrbc",
    3: "cd " + __dirname + "/mruby/bin && ./mrbc"
  };

  jsonHeader = {
    'Content-Type': 'application/json; charset=utf-8'
  };

  makeDownloadHeader = function(filename, filesize) {
    return {
      'Content-Type': 'application/octet-stream; charset=utf-8',
      'Content-Length': filesize,
      'Content-Disposition': "attachment; filename=\"" + filename + "\""
    };
  };

  httpError = (function(superClass) {
    extend(httpError, superClass);

    function httpError() {
      return httpError.__super__.constructor.apply(this, arguments);
    }

    httpError.prototype.setStatus = function(code, text) {
      this.statusCode = code;
      this.statusText = text;
      return this;
    };

    return httpError;

  })(Error);

  getResource = function(req) {
    var url;
    if (!req.query.output) {
      req.query.output = 'noname.mrb';
    }
    if (req.query.type === 'url') {
      url = req.query.content;
      return new Promise(function(fulfilled, rejected) {
        return request(url, function(err, res, body) {
          if (err) {
            return rejected(new httpError().setStatus(500, 'Internal Server Error'));
          } else if (res.statusCode !== 200) {
            return rejected(new httpError().setStatus(404, 'Resource not found'));
          } else {
            return fulfilled({
              content: body,
              output: req.query.output
            });
          }
        });
      });
    } else if (req.query.type === 'source') {
      return {
        content: req.query.content,
        output: req.query.output
      };
    } else {
      throw new httpError('Unknown resource type queried.').setStatus(400, 'Bad Request');
    }
  };

  createTempDirectory = function() {
    return new Promise(function(fulfilled, rejected) {
      return tmp.dir(function(err, path, cleanupCallback) {
        if (err) {
          return rejected(new httpError().setStatus(500, 'Internal Server Error'));
        } else {
          return fulfilled({
            path: path,
            cleanupCallback: cleanupCallback
          });
        }
      });
    });
  };

  writeTempFile = function(arg) {
    var resource, tempdir;
    resource = arg[0], tempdir = arg[1];
    return new Promise(function(fulfilled, rejected) {
      var fileIO;
      fileIO = {
        input: tempdir.path + "/" + resource.output + ".rb",
        output: tempdir.path + "/" + resource.output,
        outputBase: resource.output,
        cleanup: tempdir.cleanup
      };
      return fs.writeFile(fileIO.input, resource.content, function(err) {
        if (err) {
          tempdir.cleanup();
          return rejected(new httpError().setStatus(500, 'Internal Server Error'));
        } else {
          return fulfilled(fileIO);
        }
      });
    });
  };

  execCompile = function(req, options) {
    return function(fileIO) {
      return new Promise(function(fulfilled, rejected) {
        var command;
        mrbc = req.query.format === '2' ? mrbc[2] : mrbc = mrbc[3];
        if (Array.isArray(options)) {
          options = options.join('');
        }
        command = mrbc + " " + options + " -o " + fileIO.output + " " + fileIO.input;
        return exec(command, function(err, stdout, stderr) {
          if (err) {
            fileIO.cleanup();
            return rejected(new httpError(), setStatus(500, 'Internal Server Error'));
          } else if (stderr) {
            fileIO.cleanup();
            rejected(new httpError('Compile error occured.'), setStatus(400, 'Bad Request'));
            return fulfilled({
              fileIO: fileIO,
              stdout: stdout
            });
          }
        });
      });
    };
  };

  makeRespose = function(req, res) {
    return function(arg) {
      var fileIO, stdout;
      fileIO = arg.fileIO, stdout = arg.stdout;
      if (req.query.download === 1) {
        return exec("cat " + fileIO.output.output, function(err, stdout, stderr) {
          if (err || stderr) {
            return rejected(new httpError().setStatus(500, 'Internal Server Error').setCallback);
          } else {
            return res.set(makeDownloadHeader(fileIO.outputBase)).send(stdout);
          }
        });
      } else {
        return res.set(jsonJeader).json({
          stdout: stdout
        });
      }
    };
  };

  makeErrorResponse = function(err) {
    res.header('Content-Type', 'application/json; charset=utf-8');
    res.json({
      statusCode: err.statusCode,
      statusText: err.statusText,
      message: err.message
    });
    if (err.callback) {
      return callback();
    }
  };

  webCompile = function(req, res) {
    return Promise.all([getResource(req), createTempDirectory]).then(writeTempFile).then(execCompile(req)).then(makeResponse(req, res))["catch"](makeErrorResponse);
  };

  sendDocument = function(req, res) {
    return res.set(jsonHeader).status(200).json([
      {
        endpoint: '/',
        description: 'return this document.',
        queries: {}
      }, {
        endpoint: '/compile/',
        description: 'compile ruby code.',
        queries: {
          format: 'set ByteCode Format version.',
          type: "'source' or 'url'",
          content: "resource described as 'type'.",
          name: 'name of output. if set, the compiled file will be downloaded.'
        }
      }, {
        endpoint: '/check/',
        description: 'check syntax.',
        queries: {
          format: 'set ByteCode Format version.',
          type: "'source' or 'url'",
          content: "resource described as 'type'."
        }
      }, {
        endpoint: '/help/',
        description: 'mrbc -h',
        queries: {
          format: 'set ByteCode Format version.'
        }
      }, {
        endpoint: '/version/',
        description: 'display version information.',
        queries: {
          format: 'set ByteCode Format version.'
        }
      }, {
        endpoint: '/copyright/',
        description: 'display copyright information.',
        queries: {
          format: 'set ByteCode Format version.'
        }
      }
    ]);
  };

  syntaxCheck = function(req, res) {
    return res.send('test');
  };

  informCommand = function(option) {
    return function(req, res) {
      var format;
      if (req.query.format === 2) {
        format = 2;
      } else {
        format = 3;
      }
      return exec(mrbc[format] + " " + option, function(err, stdout, stderr) {
        return res.set(jsonHeader).status(200).json({
          success: true,
          lines: stdout.split('\n').filter(function(e) {
            return e !== '';
          })
        });
      });
    };
  };

  app.get('/', sendDocument).get('/compile/', webCompile).get('/check/', syntaxCheck).get('/help/', informCommand('-h')).get('/version/', informCommand('--version')).get('/copyright/', informCommand('--copyright'));

  app.listen(PORT, function() {
    return console.log("Server is listening on port " + PORT + ".");
  });


  /*
    def send_mrb( pathrbname, opt )
      if(opt.include?("--verbose")==true || opt.include?("-v")==true || opt.include?("-o")==true ) then
        @compiler.destroy
        render action: "new"
        return
      end
  
      if(opt.include?("--")==true) then
        o, e, s = Open3.capture3("mrbc " + opt + " >&2")
        redirect_to @compiler, notice: e.to_s + ' ' + s.to_s
        @compiler.destroy
        return
      end
  
  
      fullpath = Rails.root.to_s + "/public" + File.dirname(pathrbname) + "/"
  
  	bname = File.basename(pathrbname).downcase
  	if( bname!=File.basename(pathrbname) )then
  		File.rename( fullpath + File.basename(pathrbname), fullpath + bname )
  	end
  
      rbfile = File.basename(bname)
      mrbfile = File.basename(bname, ".rb") + ".mrb"
      cfile = File.basename(bname, ".rb") + ".c"
  
      #o, e, s = Open3.capture3("cd " + fullpath + "; mrbc " + opt + " -o" + mrbfile + " " + rbfile + " >&2")
      o, e, s = Open3.capture3("cd " + fullpath + "; mrbc " + opt + " " + rbfile + " >&2")
      if( e==''  ) then
        if( opt.include?("-B")==true )then
          mrb_data = File.binread(fullpath + cfile)
          send_data(mrb_data, filename: cfile, type: "application/octet-stream", disposition: "inline")
        else
          mrb_data = File.binread(fullpath + mrbfile)
          send_data(mrb_data, filename: mrbfile, type: "application/octet-stream", disposition: "inline")
        end
      else
        redirect_to @compiler, notice: e.to_s + ' ' + s.to_s
      end
  
      @compiler.destroy
      deleteall( fullpath )
    end
   */

}).call(this);
