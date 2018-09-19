const validator = require('validator')
const format = require('string-format')
const { ValidationError } = require('./error')

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
    CNPJ: validator.isCnpj
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

validator.isCpf = (cpf) => {
  if (cpf.length !== 11 ||
    cpf === '00000000000' ||
    cpf === '11111111111' ||
    cpf === '22222222222' ||
    cpf === '33333333333' ||
    cpf === '44444444444' ||
    cpf === '55555555555' ||
    cpf === '66666666666' ||
    cpf === '77777777777' ||
    cpf === '88888888888' ||
    cpf === '99999999999'
  ) { return false }
  let add = 0
  for (let i = 0; i < 9; i++) { add += parseInt(cpf.charAt(i), 10) * (10 - i) }
  let rev = 11 - (add % 11)
  if (rev === 10 || rev === 11) { rev = 0 }
  if (rev !== parseInt(cpf.charAt(9), 10)) { return false }
  add = 0
  for (let i = 0; i < 10; i++) { add += parseInt(cpf.charAt(i), 10) * (11 - i) }
  rev = 11 - (add % 11)
  if (rev === 10 || rev === 11) { rev = 0 }
  return rev === parseInt(cpf.charAt(10), 10)
}

validator.isCnpj = (cnpj) => {
  const b = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

  if (cnpj.length !== 14) {
    return false
  }

  if (/0{14}/.test(cnpj)) {
    return false
  }

  let n = 0
  for (let i = 0; i < 12; n += cnpj[i] * b[++i]) {}
  if (cnpj[12] !== (((n %= 11) < 2) ? 0 : 11 - n).toString()) {
    return false
  }

  n = 0
  for (let i = 0; i <= 12; n += cnpj[i] * b[i++]) {}

  return cnpj[13] === (((n %= 11) < 2) ? 0 : 11 - n).toString()
}

module.exports = validator
