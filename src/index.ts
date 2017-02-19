import Conf = require('conf')
import * as Debug from 'debug'
import * as inquirer from 'inquirer'
import * as _ from 'lodash'
import * as meow from 'meow'

const debug = Debug('wunderflats:bin-generateCSV:config')

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

export async function getConfigurtion(questions: inquirer.Question[]): Promise<Conf> {
  // extract default value for configuration from questions
  const defaults = questions.reduce(function(acc, question) {
    if (question.name) {
      acc[question.name] = question.default
    }

    return acc
  }, {})
  const config = new Conf(defaults)
  // construct help message
  const help: string[] = questions.map(function(question) {
    return `--${question.name}='${question.default}'\t(${question.message})`
  })
  const cli = meow(help)

  debug('defaults %o', defaults)
  debug('help %o', help)

  // persist current command-line flags
  // TODO: should probably be filtered
  saveConfig(config, cli.flags)
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
