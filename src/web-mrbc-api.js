import express from 'express'
import meta    from '../package.json'
import lib     from './lib.js'

const app  = express()
const PORT = meta.config.port


/*
 * each method for the routes
 */
const webCompile = () => // this inner function aimed only to format interfaces
    (req, res) => {
        Promise.all([
            lib.getResource(req),
            lib.createTempDirectory
        ])
            .then(lib.writeTempFile)
            .then(lib.execCompile(req))
            .then(lib.makeResponse(req, res))
            .catch(lib.makeErrorResponse(res))
    }

const syntaxCheck = () => (req, res) => { res.send('test') }

const informCommand = option => {
    return (req, res) => {
        // TODO: specify bytecode format
        const format = req.query.format === '2' ? 2 : 3
        // do command
        const command = `${mrbc[format]} ${option}`
        exec(command, (err, stdout, stderr) => {
            res
                .set(jsonHeader)
                .status(200)
                .json({
                    success: true,
                    lines: stdout.split('\n').filter(e => e !== '')
                })
        })
    }
}


/*
 * routing
 */
app
    .get('/compile/',   webCompile())
    .get('/check/',     syntaxCheck())
    .get('/help/',      informCommand('-h'))
    .get('/version/',   informCommand('--version'))
    .get('/copyright/', informCommand('--copyright'))

/*
 * start sever
 */
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}.`)
})
