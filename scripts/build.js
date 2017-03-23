const { exec, mkdir, mv, rm, set, test } = require('shelljs')

set('-e')
set('-v')

if (test('-d', 'build')) {
  rm('-R', 'build')
}
mkdir('build')

exec('backpack build', { async: true })
exec('tsc -d', { async: true }, function () {
    mv('src/index.d.ts', 'build/main.d.ts')
    rm('src/*.{js,js.map}')
})
