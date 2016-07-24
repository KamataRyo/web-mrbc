PORT    = require('./package.json').config.port
tmp     = require 'tmp'
fs      = require 'fs'
request = require 'request'
app     = require('express')()
exec 　　= require('child_process').exec


app.get '/', (req, res) ->

    cleanup    = -> # set cleanupCallback if needed or, empty function to do nothing
    source     = '' # set source code to compile
    sourcePath = '' # set where to write source
    buildCommand = (mrbcVer, options, path) ->
        # create command
        if req.query.version is '2'
            "#{__dirname}/mrbc/mrbc #{options} #{path}"
        else # if req.query.version is '3'
            "#{__dirname}/mruby/bin/mrbc #{options} #{path}"
    # TODO: check mrbc specifocation
    outputPath = ->
        sourcePath + '.mrb'

    # start Promise
    new Promise (fulfilled, rejected) ->
        # if url given, request the content at first
        if req.query.type is 'url'
            url = req.query.content
            request url, (err, res, body) ->
                if err
                    rejected [500, 'Internal Server Error']
                else if res.statusCode isnt 200
                    rejected [404, 'Resource not found']
                else
                    source = body
                    fulfilled()

        else if req.query.type is 'source'
            source = req.query.content
            fulfilled()

        else
            rejected [400, 'Bad Request', 'Unknown resource type queried.']

    .then ->
        # ctreate a temporary file
        new Promise (fulfilled, rejected) ->
            tmp.file (err, path, fd, cleanupCallback) ->
                cleanup = cleanupCallback
                if err
                    rejected [500, 'Internal Server Error']
                else
                    sourcePath = path
                    fulfilled()

    .then ->
        console.log 'aa'
        # write content to the temporary file
        new Promise (fulfilled, rejected) ->
            fs.writeFile sourcePath, content, (err) ->
                if err
                    rejected [500, 'Internal Server Error']
                else
                    fulfilled()

    .then ->
        # build command
        command = buildCommand req.query.version, req.query.options, sourcePath

        # exec command
        new Promise (fulfilled, rejected) ->
            exec command, (err, stdout, stderr) ->
                if err
                    rejected [500, 'Internal Server Error']
                else if stderr
                    # maybe compile failed
                    rejected [400, 'Bad Request', 'Compile error occured.']
                else
                    # maybe compile success
                    fulfilled()

    .then ->
        # send the binary
        exec "cat #{outputPath()}", (err, stdout, stderr) ->
            if error or stderr
                rejected [500, 'Internal Server Error']
            else
                res.header 'Content-Type', 'application/octet-stream; charset=utf-8'
                res.send stdout
                fulfilled()
            # after all
            cleanup()

    .catch ([statusCode, statusText, message]) ->
        res.header 'Content-Type', 'application/json; charset=utf-8'
        res.json {statusCode, statusText, message}
        # after all
        cleanup()



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
