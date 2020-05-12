const version = require('../package.json').version
const fs = require('fs')
const axios = require('axios')
const child_process = require('child_process')

let OS = {
    darwin: 'macos-latest',
    linux: 'ubuntu-16.04',
    win32: 'windows-latest',
}

let PREFIX = {
    darwin: 'lib',
    freebsd: 'lib',
    linux: 'lib',
    sunos: 'lib',
    win32: '',
}

let SUFFIX = {
    darwin: '.dylib',
    freebsd: '.so',
    linux: '.so',
    sunos: '.so',
    win32: '.dll',
}
let platform = OS[process.platform]

try {
    let stats = fs.statSync(__dirname + '/../native/index.node')
    if (stats) return
} catch {}

if (platform) {
    let url = `https://github.com/imazen/imageflow-node/releases/download/${version}/libimageflow-${platform}.node`

    axios({
        method: 'get',
        url: url,
        responseType: 'stream',
    })
        .then(function (response) {
            response.data.pipe(fs.createWriteStream('./native/index.node'))
        })
        .catch(() => {
            throw 'Unable to download the required binary'
        })
} else {
    try {
        child_process.execSync('rustc --version').toString()
    } catch {
        throw 'Error prebuilt binary not found please install rust and built it again'
    }

    child_process.execSync('cargo build --release', {
        cwd: __dirname + '/../native',
    })
    fs.copyFileSync(
        `${__dirname}/../native/target/release/${
            PREFIX[process.platform]
        }imageflow_node${SUFFIX[process.platform]}`,
        __dirname + '/../native/index.node'
    )
}
