PORT    = require('./package.json').config.port
tmp     = require 'tmp'
fs      = require 'fs'
request = require 'request'
app     = require('express')()
exec 　　= require('child_process').exec


# supportive constants and helper functions
## path to compiler
mrbc =
    2: "cd #{__dirname}/mrbc && ./mrbc"
    3: "cd #{__dirname}/mruby/bin && ./mrbc"
## API uniformed header
jsonHeader =
    'Content-Type' : 'application/json; charset=utf-8'
## For binary download
makeDownloadHeader = (filename, filesize) -> {
    'Content-Type' : 'application/octet-stream; charset=utf-8'
    'Content-Length': filesize
    'Content-Disposition': "attachment; filename=\"#{filename}\""
}

class httpError extends Error
    setStatus: (code, text) ->
        @statusCode = code
        @statusText = text
        return this


# Tasks
## Abstract resource. if url given, request the content at first
getResource = (req) ->
    unless req.query.output then req.query.output = 'noname.mrb'
    if req.query.type is 'url'
        url = req.query.content
        new Promise (fulfilled, rejected) ->
            request url, (err, res, body) ->
                if err
                    rejected new httpError().setStatus(500, 'Internal Server Error')
                else if res.statusCode isnt 200
                    rejected new httpError().setStatus(404, 'Resource not found')
                else
                    fulfilled {content: body, output: req.query.output}

    else if req.query.type is 'source'
        {content:req.query.content, output: req.query.output}

    else
        throw new httpError 'Unknown resource type queried.'
            .setStatus 400, 'Bad Request'

## ctreate a temporary directory
createTempDirectory = ->
    new Promise (fulfilled, rejected) ->
        tmp.dir (err, path, cleanupCallback) ->
            if err
                rejected new httpError().setStatus(500, 'Internal Server Error')
            else
                fulfilled {path: path, cleanupCallback}

## write content to the temporary file
writeTempFile = ([resource, tempdir]) ->
    new Promise (fulfilled, rejected) ->
        fileIO =
            input: "#{tempdir.path}/#{resource.output}.rb"
            output: "#{tempdir.path}/#{resource.output}"
            outputBase: resource.output
            cleanup: tempdir.cleanup
        fs.writeFile fileIO.input, resource.content, (err) ->
            if err
                tempdir.cleanup()
                rejected new httpError().setStatus(500, 'Internal Server Error')
            else
                fulfilled fileIO

## exec compile
execCompile = (req, options) ->
    (fileIO) ->
        new Promise (fulfilled, rejected) ->

            # specify bytecode format requested
            mrbc = if req.query.format is '2' then mrbc[2] else mrbc = mrbc[3]

            # redundant options arguments
            if Array.isArray options then options = options.join ''

            command = "#{mrbc} #{options} -o #{fileIO.output} #{fileIO.input}"
            exec command, (err, stdout, stderr) ->
                if err
                    fileIO.cleanup()
                    rejected new httpError(),setStatus(500, 'Internal Server Error')
                else if stderr
                    # maybe compile failed
                    fileIO.cleanup()
                    rejected new httpError('Compile error occured.'),setStatus(400, 'Bad Request')
                    # maybe compile success
                    fulfilled {fileIO, stdout}

## do res.send
makeRespose = (req, res) ->
    ({fileIO, stdout}) ->
        if req.query.download is 1 # TODO: check the type of Express response 1 or '1'
            # response as download file
            exec "cat #{fileIO.output.output}", (err, stdout, stderr) ->
                if err or stderr
                    rejected new httpError().setStatus(500, 'Internal Server Error').setCallback
                else
                    res
                        .set makeDownloadHeader(fileIO.outputBase)
                        .send stdout
        else
            # response as buffer
            res
                .set jsonJeader
                .json {
                    stdout
                }


## do res.send in case erro occured
makeErrorResponse = (err) ->
    res.header 'Content-Type', 'application/json; charset=utf-8'
    res.json {
        statusCode: err.statusCode
        statusText: err.statusText
        message: err.message
    }
    # after all
    if err.callback then callback()


# each method for route
webCompile = (req, res) ->
    Promise.all [getResource(req), createTempDirectory]
        .then writeTempFile
        .then execCompile(req)
        .then makeResponse(req, res)
        .catch makeErrorResponse

sendDocument = (req, res) ->
    res.set(jsonHeader).status(200).json [
        {
            endpoint: '/'
            description: 'return this document.'
            queries: {}
        },
        {
            endpoint: '/compile/'
            description: 'compile ruby code.'
            queries:
                format: 'set ByteCode Format version.'
                type: "'source' or 'url'"
                content: "resource described as 'type'."
                name: 'name of output. if set, the compiled file will be downloaded.'
        },
        {
            endpoint: '/check/'
            description: 'check syntax.'
            queries:
                format: 'set ByteCode Format version.'
                type: "'source' or 'url'"
                content: "resource described as 'type'."
        },
        {
            endpoint: '/help/'
            description: 'mrbc -h'
            queries:
                format: 'set ByteCode Format version.'
        },
        {
            endpoint: '/version/'
            description: 'display version information.'
            queries:
                format: 'set ByteCode Format version.'
        },
        {
            endpoint: '/copyright/'
            description: 'display copyright information.'
            queries:
                format: 'set ByteCode Format version.'
        }
    ]

syntaxCheck = (req, res) -> res.send 'test'

informCommand = (option) ->
    (req, res) ->
        # specify bytecode format
        if req.query.format is 2
            format = 2
        else
            format = 3
        # do command
        exec "#{mrbc[format]} #{option}", (err, stdout, stderr) ->
            res.set(jsonHeader).status(200).json {
                success: true
                lines: stdout.split('\n').filter (e) -> e isnt ''
            }


# routing
app
    .get '/', sendDocument
    .get '/compile/', webCompile
    .get '/check/', syntaxCheck
    .get '/help/', informCommand '-h'
    .get '/version/', informCommand '--version'
    .get '/copyright/', informCommand '--copyright'

# start sever
app.listen PORT, ->
    console.log "Server is listening on port #{PORT}."


###
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
###
