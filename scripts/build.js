const { exec, mkdir, mv, rm, set } = require('shelljs')

set('-e')
set('-v')

rm('-R', 'build')
mkdir('build')

exec('backpack build', { async: true })
exec('tsc -d', { async: true }, function () {
    mv('src/index.d.ts', 'build/main.d.ts')
    rm('src/*.{js,js.map}')
})
