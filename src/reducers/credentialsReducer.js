export default (state = {}, action) => {
  switch (action.type) {
    case 'storeCredentials':
      state = {
        token: action.payload.token,
        userId: action.payload.userId
      }
      return state
    case 'getCredentials':
      return state
    default:
      return state
  }
}
