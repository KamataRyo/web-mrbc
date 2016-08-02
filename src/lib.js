import tmp      from 'tmp'
import fs       from 'fs'
import request  from 'request'
import { exec } from 'child_process'

/*
 * supportive constants and helper functions
 */

// path to compiler
const mrbc = {
    2: `cd ${ __dirname }/mrbc && ./mrbc`,
    3: `cd ${ __dirname }/mruby/bin && ./mrbc`,
}
// API uniformed header
const jsonHeader = {
    'Content-Type': 'application/json; charset=utf-8'
}
// For binary download
const makeDownloadHeader = (filename, filesize) => {
    return {
        'Content-Type': 'application/octet-stream; charset=utf-8',
        'Content-Length': filesize,
        'Content-Disposition': `attachment; filename="${filename}"`
    }
}
// customized error object about this server response
class httpError extends Error {
    setStatus(code, text) {
        this.statusCode = code
        this.statusText = text
        return this
    }
}


/*
 * Tasks
 */

export default {
    // Abstract resource. if url given, request the content at first
    getResource: (req, res) => {
        const query = req.query
        if(!query.output) {
            query.output = 'noname.mrb'
        }

        if(query.type === 'url') {
            let url = query.content
            return new Promise((fulfilled, rejected) => {
                // make request at first
                request(url, (err, res, body) => {
                    // unhandle internal error
                    if(err) {
                        rejected(
                            new httpError()
                                .setStatus(500, 'Internal Server Error')
                        )
                    // request failed
                    // TODO: how about case 3xx and 2xx
                    } else if(res.statusCode !== 200) {
                        rejected(
                            new httpError()
                                .setStatus(404, 'Resource not found')
                        )
                    // request OK
                    } else {
                        fulfilled({
                            content: body,
                            output: query.output
                        })
                    }
                })
            })

        } else if(query.type === 'source') {
            return {
                content: query.content,
                output: query.output
            }

        } else {
            throw new httpError('Unknown resource type queried.')
                .setStatus(400, 'Bad Request')
        }
    },

    // ctreate a temporary directory
    createTempDirectory: (req, res) => {
        return new Promise((fulfilled, rejected) => {
            tmp.dir((err, path, cleanupCallback) => {
                if(err) {
                    rejected(
                        new httpError()
                            .setStatus(500, 'Internal Server Error')
                    )
                } else {
                    fulfilled({
                        path: path,
                        cleanupCallback
                    })
                }
            })
        })
    },

    // write content to the temporary file
    writeTempFile: ([resource, tempdir]) => {
        return new Promise((fulfilled, rejected) => {
            let fileIO = {
                input: `${tempdir.path}/${resource.output}.rb`,
                output: `${tempdir.path}/${resource.output}`,
                outputBase: resource.output,
                cleanup: tempdir.cleanup
            }
            fs.writeFile(fileIO.input, resource.content, (err) => {
                if(err) {
                    tempdir.cleanup()
                    rejected(
                        new httpError()
                            .setStatus(500, 'Internal Server Error')
                    )
                } else {
                    fulfilled(fileIO)
                }
            })
        })
    },

    // exec compile
    execCompile: (req, options) => {
        return (fileIO) => {
            return new Promise((fulfilled, rejected) => {
                // specify bytecode format requested
                const mrbcx = req.query.format === '2' ? mrbc[2] : mrbc[3]

                // redundant options arguments
                if(Array.isArray(options)) {
                    options = options.join('')
                }

                const command = `${mrbcx} ${options} -o ${fileIO.output} ${fileIO.input}`
                exec(command, (err, stdout, stderr) => {
                    if(err) {
                        fileIO.cleanup()
                        rejected(
                            new httpError().
                                setStatus(500, 'Internal Server Error')
                        )

                    } else if(stderr) {
                        // maybe compile failed
                        fileIO.cleanup()
                        rejected(
                            new httpError('Compile error occured.')
                                .setStatus(400, 'Bad Request')
                        )

                    } else {
                        // maybe compile success
                        fulfilled({fileIO, stdout})
                    }
                })
            })
        }
    },

    // do res.send
    makeResponse: (req, res) => {
        return ({fileIO, stdout}) => {
            // TODO: check the type of Express response 1 or '1'
            if(req.query.download === 1) {
                // response as download file
                exec(`cat ${fileIO.output.output}`, (err, stdout, stderr) => {
                    if(err || stderr) {
                        throw new httpError()
                            .setStatus(500, 'Internal Server Error')
                    } else {
                        res
                            .set(makeDownloadHeader(fileIO.outputBase))
                            .send(stdout)
                    }
                })

            } else {
                // response as buffer
                res
                    .set(jsonHeader)
                    .json({stdout})
            }
        }
    },

    // do res.send in case erro occured
    makeErrorResponse: (res) => {
        (err) => {
            res.header('Content-Type', 'application/json; charset=utf-8')
            res.json({
                statusCode: err.statusCode,
                statusText: err.statusText,
                message: err.message
            })
            // after all
            err.callback
                && (typeof err.callback === 'function')
                && err.callback()
        }
    },
}


  // this is original ruby source to be translate into js
    // def send_mrb( pathrbname, opt )
    //   if(opt.include?("--verbose")==true || opt.include?("-v")==true || opt.include?("-o")==true ) then
    //     @compiler.destroy
    //     render action: "new"
    //     return
    //   end
    //
    //   if(opt.include?("--")==true) then
    //     o, e, s = Open3.capture3("mrbc " + opt + " >&2")
    //     redirect_to @compiler, notice: e.to_s + ' ' + s.to_s
    //     @compiler.destroy
    //     return
    //   end
    //
    //
    //   fullpath = Rails.root.to_s + "/public" + File.dirname(pathrbname) + "/"
    //
    // bname = File.basename(pathrbname).downcase
    // if( bname!=File.basename(pathrbname) )then
    // 	File.rename( fullpath + File.basename(pathrbname), fullpath + bname )
    // end
    //
    //   rbfile = File.basename(bname)
    //   mrbfile = File.basename(bname, ".rb") + ".mrb"
    //   cfile = File.basename(bname, ".rb") + ".c"
    //
    //   #o, e, s = Open3.capture3("cd " + fullpath + "; mrbc " + opt + " -o" + mrbfile + " " + rbfile + " >&2")
    //   o, e, s = Open3.capture3("cd " + fullpath + "; mrbc " + opt + " " + rbfile + " >&2")
    //   if( e==''  ) then
    //     if( opt.include?("-B")==true )then
    //       mrb_data = File.binread(fullpath + cfile)
    //       send_data(mrb_data, filename: cfile, type: "application/octet-stream", disposition: "inline")
    //     else
    //       mrb_data = File.binread(fullpath + mrbfile)
    //       send_data(mrb_data, filename: mrbfile, type: "application/octet-stream", disposition: "inline")
    //     end
    //   else
    //     redirect_to @compiler, notice: e.to_s + ' ' + s.to_s
    //   end
    //
    //   @compiler.destroy
    //   deleteall( fullpath )
    // end
