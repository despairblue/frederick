import Conf = require('conf')
import * as Debug from 'debug'
import * as fs from 'fs'
import * as inquirer from 'inquirer'
import * as _ from 'lodash'
import * as meow from 'meow'
import * as pkgUp from 'pkg-up'

const debug = Debug('wunderflats:bin-generateCSV:config')

// Prevent caching of this module so module.parent is always accurate
delete require.cache[__filename]
const pkgJsonPath = pkgUp.sync(__filename)

function printConfig(config: Conf) {
  console.log('Saved Configuration: \n')
  for (let [key, value] of config) {
    console.log(`${key}: "${value}"`)
  }
  console.log()
}

function saveConfig(confInstance: Conf, config: { [key: string]: string }): Conf {
  _.map(config, (value, key) => key && confInstance.set(key, value))

  return confInstance
}

export async function getConfiguration(questions: inquirer.Question[]): Promise<Conf> {
  if (!pkgJsonPath) {
    throw new Error('Project name could not be inferred. Please specify the `projectName` option.')
  }

  const projectName = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8')).name

  // extract default value for configuration from questions
  const defaults: object = questions.reduce(function(acc, question) {
    if (question.name) {
      acc[question.name] = question.default
    }

    return acc
  }, {})
  const config = new Conf({ defaults, projectName })
  // construct help message
  const help: string[] = questions.map(function(question) {
    return `--${question.name}='${question.default}'\t(${question.message})`
  })
  const cli = meow(help)

  debug('defaults %o', defaults)
  debug('help %o', help)

  // persist current command-line flags
  // TODO: should probably be filtered
  const newConfig = saveConfig(config, cli.flags)

  if (skipConfirm(defaults, cli.flags)) {
    return newConfig
  } else {
    printConfig(config)

    const { useSavedConfig } = await inquirer.prompt([
      {
        default: true,
        message: 'Is that correct?',
        name: 'useSavedConfig',
        type: 'confirm',
      },
    ])

    if (useSavedConfig) {
      return config
    } else {
      // use saved configuration as default values
      const questionsWithDefaults = questions.map(function(question) {
        if (question.name) {
          let value = config.get(question.name)

          if (value) {
            // special case the `expand` question since it expects and index
            // instead of a value
            if (question.type === 'expand' && question.choices instanceof Array) {
              const index = question.choices.findIndex((choice: any) => {
                return choice.value === value
              })

              question.default = index
            } else {
              question.default = value
            }
          }
        }

        return question
      })

      debug('questionsWithDefaults %o', questionsWithDefaults)

      return saveConfig(config, await inquirer.prompt(questions))
    }
  }
}

function skipConfirm (defaults: object, flags: { [key: string]: string }): boolean {
  const defaultKeys = Object.keys(defaults)
  const cliKeys = Object.keys(flags)

  return _.difference(defaultKeys, cliKeys).length === 0
}
