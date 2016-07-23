PORT = require('./package.json').config.port
tmp = require 'tmp'
fs = require 'fs'
app = require('express')()


sanitize = (option)->
    'aaaa'

app.get '/', (req, res) ->

    # Case with source
    if req.query.type is 'source'
        # create tempfile
        tmp.file (err, path, fd, cleanupCallback) ->
            if err then throw err

            # write source to tempfile
            fs.writeFile path, req.content, (err) ->

                # get options
                options = sanitize req.options ## accept -g and -B

                console.log req.query
                # create command
                if req.query.version is '2'
                    mrbc = "#{__dirname}/mrbc/mrbc #{options} #{path}"
                else
                    mrbc = "#{__dirname}/mruby/bin/mrbc #{options} #{path}"


                res.charset 'UTF-8'
                res.contentType 'application/octet-stream'
                res.send mrbc

                # cleanup tempfile
                cleanupCallback()

    else
        res.send 'unkown'


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
