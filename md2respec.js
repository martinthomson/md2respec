'use strict';

var spawn = require('child_process').spawn;
var fs = require('fs');

var hn = /^<h(\d)>([^<]+)</;
var level = 0;
var headers = {};
function updateLevel(targetLevel, title) {
    while (level >= targetLevel && level > 0) {
        console.log('</section>');
        --level;
    }
    while (level < targetLevel) {
        if (level + 1 === targetLevel && !headers[title]) {
            console.log('<section id="%s">', title);
            headers[title] = true;
        } else {
            console.log('<section>');
        }
        ++level;
    }
}
function printTail() {
    updateLevel(0);
    console.log('</body>');
    console.log('</html>');
}

function printConverted(data) {
    var lines = data.toString().split(/(?:\r?\n|\r)/);
    lines.forEach(function(line) {
        var m = line.match(hn);
        if (m) {
            var title = m[2].trim().toLowerCase().replace(/[^\w]/g, '-');
            updateLevel(parseInt(m[1]), title);
            if (title === 'abstract') {
                return; // hack!
            }
        }
        console.log(line.replace(/{{/g, '<a>').replace(/}}/g, '</a>'));
    });
}

function printError(err) {
    console.error(err.toString());
    if (err.stack) {
        console.error(err.stack);
    }
}
var redcarpet = [ '/usr/bin/redcarpet', '--parse-no_intra_emphasis', '--parse-fenced_code_blocks',
                  '--parse-autolink', '--parse-strikethrough', '--parse-superscript' ];

function configRead(err, data) {
    var config = JSON.parse(data);
    console.log('<!DOCTYPE html>');
    console.log('<html>');
    console.log('<head>');
    console.log('  <title>%s</title>', config.title);
    console.log('  <script src="http://www.w3.org/Tools/respec/respec-w3c-common"');
    console.log('          async class="remove"></script>');
    console.log('  <script class="remove">');
    console.log('var respecConfig = %s;', data);
    console.log('  </script>');
    console.log('</head>');
    console.log('<body>');

    var convert = spawn('ruby', redcarpet.concat(process.argv[3]), { cwd: process.cwd() });
    convert.stdout.on('data', printConverted);
    convert.stderr.on('data', printError);
    convert.on('close', printTail);
    convert.on('error', printError);
}

if (process.argv.length < 4) {
    console.error('Usage: %s %s <config> <markdown>', process.argv[0], process.argv[1]);
    process.exit(1);
}

fs.readFile(process.argv[2], configRead);
