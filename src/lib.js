import tmp       from 'tmp'
import fs        from 'fs'
import request   from 'request'
import { exec }  from 'child_process'
import HttpError from 'standard-http-error'

/*
 * supportive constants and helper functions
 */

// path to compiler
const mrbc = {
    2: `${ __dirname }/../mrbc/mrbc`,
    3: `${ __dirname }/../mruby/bin/mrbc`,
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

const DEFAULT_OUTPUT_NAME = 'noname.mrb'

/*
 * Tasks
 * They use req and res object on express server
 */

export default {

    DEFAULT_OUTPUT_NAME,

    // Abstract resource. if url given, request the content at first
    getResource: (query) => {
        if(!query.output || query.output === '') {
            query.output = DEFAULT_OUTPUT_NAME
        }

        if(query.type === 'url') {
            let url = query.content
            return new Promise((fulfilled, rejected) => {
                // make request at first
                request(url, (err, res, body) => {
                    // request OK
                    if (!err && res.statusCode === 200) {
                        fulfilled({
                            content: body,
                            output: query.output
                        })
                    } else {
                        // request failed
                        rejected(new HttpError(404))
                    }
                })
            })

        } else if(query.type === 'source') {
            return new Promise((fulfilled) => {
                fulfilled({
                    content: query.content,
                    output: query.output
                })
            })

        } else {
            return new Promise((fulfilled, rejected) => {
                rejected(new HttpError(400, 'Unknown resource type queried.'))
            })
        }
    },

    // ctreate a temporary directory
    // argument interrupt raise error artificially for test
    createTempDirectory: (interrupt) => {
        return new Promise((fulfilled, rejected) => {
            tmp.dir((err, path, cleanupCallback) => {
                if(err || interrupt) {
                   // unknown internal error
                    rejected(new HttpError(500))
                } else {
                    fulfilled({
                        path: path,
                        cleanupCallback
                    })
                }
            })
        })
    },

    // write content to a new file under given directory
    writeFile: ([resource, dir]) => {
        return new Promise((fulfilled, rejected) => {
            const fileIO = {
                input: `${dir.path}/${resource.output}.rb`,
                output: `${dir.path}/${resource.output}`,
                outputBase: resource.output,
                cleanup: dir.cleanupCallback
            }
            fs.writeFile(fileIO.input, resource.content, (err) => {
                if(err) {
                    console.log(fileIO)
                    fileIO.cleanup()
                    rejected(new HttpError(500))
                } else {
                    fulfilled(fileIO)
                }
            })
        })
    },

    // exec compile
    execCompile: (format, options) => {
        return (fileIO) => {
            return new Promise((fulfilled, rejected) => {
                // specify bytecode format requested
                const mrbcx = (format.toString() === '2') ? mrbc[2] : mrbc[3]

                // redundant options arguments
                if(Array.isArray(options)) {
                    options = options.join('')
                }

                const command = `${mrbcx} ${options} -o"${fileIO.output}" "${fileIO.input}"`
                exec(command, (err, stdout, stderr) => {
                    if(err) {
                        console.log(err)

                        fileIO.cleanup()
                        rejected(new HttpError(500))

                    } else if(stderr) {
                        // maybe compile failed
                        fileIO.cleanup()
                        rejected(new HttpError(400, 'Compile Error'))

                    } else {
                        // maybe compile success
                        fulfilled({fileIO})
                    }
                })
            })
        }
    },

    // do res.send
    makeResponse: (download, res) => {
        return ({fileIO}) => {
            return new Promise((fulfilled, rejected) => {
                exec(`cat ${fileIO.output}`, (err, stdout, stderr) => {
                    if(err || stderr) {
                        rejected(new HttpError(500))
                    } else {
                        if (download) {
                            res.set(makeDownloadHeader(fileIO.outputBase))
                            res.send(stdout)
                            fulfilled(true)
                        } else {
                            // response as buffer
                            res.set(jsonHeader)
                            res.json({stdout})
                            fulfilled(true)
                        }
                    }
                })
            })
        }
    },

    // do res.send in case erro occured
    makeErrorResponse: (res) => {
        return (err) => {
            return new Promise((fulfilled) => {
                res.set(jsonHeader)// TODO: set Status Code. Also in test
                res.json({
                    code: err.code,
                    name: err.name,
                    message: err.message
                })
                // after all
                err.callback
                    && (typeof err.callback === 'function')
                    && err.callback()
                fulfilled()
            })
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
