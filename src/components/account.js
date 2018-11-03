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

function EditModal () {
  var errorUpdateModal
  if (this.state.error) {
    errorUpdateModal =  <h4 className="errorMessage">Unable to Update User object</h4>
  }
  return (
    <div className="EditModal">
      <form onSubmit={this.updateUser}>
        <input value={this.state.email} onChange={this.updateEmail} placeholder="email@example.com"/>
        <input value={this.state.password} onChange={this.updatePassword} placeholder="**********"/>
        <input value={this.state.name} onChange={this.updateName} placeholder="User St. John"/>
        {errorUpdateModal}
        <input type="submit" value="Confirm Edit" />
      </form>
    </div>
  );
}

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
    var modal
    var errorUpdateModal
    if (this.state.view === 'edit') {
      modal = <EditModal />
    } else {
      modal = function () {
        return (
          <div className="ViewModal">
            <h2>Account</h2>
            <h4>{this.state.email}</h4>
            <h4>{this.state.name}</h4>
          </div>
        );
      }
    }
    if (this.state.error) {
      errorUpdateModal =  <h4 className="errorMessage">Unable to Update User object</h4>
    }
    return (
      <div className="main">
        {modal}
        <pre>
         {
          JSON.stringify(this.props)
         }
        </pre>
      </div>
    );
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Login);
