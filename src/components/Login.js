import React, { Component } from 'react';
import axios from 'axios'
import { connect } from 'react-redux';
import { storeCredentials } from '../actions/credentialsController'
import './login.css';

const mapStateToProps = state => ({
  ...state
})
const mapDispatchToProps = dispatch => ({
  storeCredentials: (token, userId) => dispatch(storeCredentials(token, userId))
})

class Login extends Component {
  constructor (props) {
    super(props);
    this.state = {
      email: '',
      password: '',
      error: false
    }
    this.formSubmit = this.formSubmit.bind(this);
    this.updateEmail = this.updateEmail.bind(this);
    this.updatePassword = this.updatePassword.bind(this);
  }
  formSubmit (evt) {
    evt.preventDefault()
    axios.post('http://localhost:81/users/login', {
      email: this.state.email,
      password: this.state.password
    })
      .then(response => {
        this.props.storeCredentials(response.data.token, response.data.userId);
        this.props.history.push('/account');
      })
      .catch(err => {
        console.log(err)
        this.setState({
          error: true
        });
      })
  }
  updateEmail (event) {
    this.setState({email: event.target.value});
  }
  updatePassword (event) {
    this.setState({password: event.target.value});
  }
  render () {
    let errorModal
    if (this.state.error) {
      errorModal =  <h4 className="errorMessage">Username / Password combination Incorrect</h4>
    }
    return (
      <div className="main">
        <form onSubmit={this.formSubmit}>
          <input value={this.state.email} onChange={this.updateEmail} placeholder="email@example.com"/>
          <input value={this.state.password} onChange={this.updatePassword} placeholder="**********"/>
          {errorModal}
          <input type="submit" value="Login" />
        </form>
      </div>
    );
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Login);
