export const storeCredentials = (token, userId) => dispatch => {
  dispatch({
    type: 'storeCredentials',
    payload: {token: token, userId: userId}
  })
}
export const getCredentials = () => dispatch => {
  dispatch({
    type: 'getCredentials'
  })
}
