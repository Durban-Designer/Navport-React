export default (state = {}, action) => {
  switch (action.type) {
    case 'storeCredentials':
      state = {
        token: action.payload.token,
        userId: action.payload.userId
      }
      return state
    case 'getCredentials':
      console.log(state)
      return state
    default:
      return state
  }
}
