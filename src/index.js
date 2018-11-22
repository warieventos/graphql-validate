const validator = require('validator')
const format = require('string-format')
const { ValidationError } = require('./error')
const extractGraphQLErrors = require('./functions/extractGraphQLErrors')
const isCpf = require('./functions/isCpf')
const isCnpj = require('./functions/isCnpj')

validator.isCnpj = isCnpj
validator.isCpf = isCpf

validator.utils = {
  promisifyValidator: (attribute, value, config) => {
    return new Promise(async function (resolve) {
      const errors = []

      if (typeof config.validation === 'object') {
        if (!Array.isArray(value)) {
          value = [value]
        }
        await value.map(async item => {
            try {
              await validator.processValidation(config.validation, item, false)
            } catch (processedErrors) {
              errors.push(...processedErrors.map(error => {
                error.key = `${attribute}.${error.key}`
                return error
              }))
            }
          }
        )
      } else {
        let result = config.validation(value)
        if (typeof result.then === 'function') {
          try {
            result = await result
          } catch (e) {
            throw e
          }
        }

        if (Array.isArray(result)) {
          result.map(value => errors.push({
            key: attribute,
            message: format(config.message, value)
          }))
        }
        if (result === false) {
          errors.push({ key: attribute, message: format(config.message, value) })
        }
      }
      resolve(errors)
    })
  },
  promisifyValidators: (attributeConfigs, input) => {
    const validateKeys = Object.keys(input)
    const promiseValidators = []
    validateKeys.filter(key => attributeConfigs[key]).map(
      attribute => {
        if (!Array.isArray(attributeConfigs[attribute])) {
          attributeConfigs[attribute] = [attributeConfigs[attribute]]
        }
        attributeConfigs[attribute].map(config => {
          promiseValidators.push(validator.utils.promisifyValidator(attribute, input[attribute], config))
        })
      }
    )
    return promiseValidators
  }
}

validator.processValidation = (attributeConfigs, input, throwValidationError = true) => {
  return new Promise((resolve, reject) => {
    const promiseValidators = validator.utils.promisifyValidators(attributeConfigs, input)
    Promise.all(promiseValidators)
      .then(validationErrors => {
        const errors = [].concat(...validationErrors)
        if (errors.length) {
          if (throwValidationError) {
            reject(new ValidationError(errors))
          } else {
            reject(errors)
          }
        }
        resolve()
      })
  })
}

validator.listValidator = (list = [{ data: {}, params: [] }], validation) => {
  return list
    .filter(item => !validation(...item.params))
    .map(item => item.data)
}

validator.isDocumentByType = (document, type) => {
  const documentValidators = {
    CPF: validator.isCpf,
    CNPJ: validator.isCnpj,
    OTHER: value => validator.isAlphanumeric(value) && value.length < 21
  }

  if (documentValidators[type.toUpperCase()]) {
    return documentValidators[type.toUpperCase()](document)
  }
  return true
}

validator.hasDuplicatedInObject = (propertyName, inputArray) => {
  if (!inputArray.length) {
    return false
  }

  let seenDuplicate = false
  let testObject = {}

  inputArray.map(function (item) {
    let itemPropertyName = item[propertyName]
    if (itemPropertyName in testObject) {
      testObject[itemPropertyName].duplicate = true
      item.duplicate = true
      seenDuplicate = true
    } else {
      testObject[itemPropertyName] = item
      delete item.duplicate
    }
  })

  return seenDuplicate
}

module.exports = {
  ...validator,
  extractGraphQLErrors
}
