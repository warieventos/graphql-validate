const { isValidElement } = require('react')

const defaultMap = {
  LOGIN_FAILED: 'Usuário ou senha inválida',
  TOO_LARGE: 'Número muito grande',
  INVALID_FORMAT: 'Formato inválido',
  DUPLICATED: 'Duplicado',
  CHOOSE_BETWEEN: 'Apenas uma opção deve ser escolhida',
  UNIQUE: 'Já foi usado',
  UNIQUE_ATTRIBUTE: 'Deve ser único',
  INVALID_DATA: 'Não existe'
}

const getSummary = (data) => {
  if (data.length === 0) {
    return false
  }
  else if (data.length === 1) {
    return Object.values(data)[0]
  }
  return Object.values(data).reduce((prev, current) => {
    return prev + '● ' + current + '\n'
  }, '')
}


const getErrorText = (code, map, attribute = null) => {
  const mappedError = map[code]
  if (mappedError) {
    if (typeof mappedError === 'object' && !isValidElement(mappedError)) {
      if (attribute && mappedError[attribute]) {
        return mappedError[attribute]
      }
    } else {
      return mappedError
    }
  }
  return 'Erro Inesperado'
}

module.exports = (error, map = defaultMap) => {
  let errorMessage = ''

  if (error.graphQLErrors && error.graphQLErrors.length > 0) {
    const errorObject = error.graphQLErrors[0]
    const { state, message } = errorObject

    if (state) {
      for (let key in state) {
        state[key] = getErrorText(state[key][0], map, key)
      }
      return {
        message: 'Erro: um ou mais campos não foram preenchidos corretamente',
        data: state,
        getSummary: () => getSummary(state)
      }
    }

    errorMessage = getErrorText(message, map)
    return {
      message: errorMessage,
      getSummary: () => errorMessage
    }
  }

  if (error.networkError && typeof error.networkError.statusCode === 'undefined') {
    errorMessage = 'Erro ao acessar o servidor: verifique sua conexão'
  }
  else {
    errorMessage = 'Erro Inesperado'
  }

  return {
    message: errorMessage,
    getSummary: () => errorMessage
  }
}
