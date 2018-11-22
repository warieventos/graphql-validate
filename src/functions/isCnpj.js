module.exports = (cnpj) => {
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
