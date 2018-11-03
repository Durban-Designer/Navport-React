import React, { Component } from 'react';
import axios from 'axios'
import { connect } from 'react-redux';
import { getCredentials } from '../actions/credentialsController'
import './account.css';

const mapStateToProps = state => ({
  ...state
})
const mapDispatchToProps = dispatch => ({
  getCredentials: () => dispatch(getCredentials())
})

class Account extends Component {
  constructor (props) {
    super(props);
    this.state = {
      email: '1',
      name: '2',
      password: '',
      view: '',
      error: false
    }
    this.formSubmit = this.formSubmit.bind(this);
    this.updateName = this.updateName.bind(this);
    this.updateEmail = this.updateEmail.bind(this);
    this.updatePassword = this.updatePassword.bind(this);
    axios.get('http://localhost:81/users/' + this.props.credentialsReducer.userId, { headers: { Authorization: 'JWT ' + this.props.credentialsReducer.token }})
      .then(response => {
        this.setState({
          email: response.data.email,
          name: response.data.name
        });
      })
      .catch(err => {
        console.log(err)
      })
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
  updateName (event) {
    this.setState({name: event.target.value});
  }
  updatePassword (event) {
    this.setState({password: event.target.value});
  }
  render () {
    var modal
    if (this.state.view === 'edit') {
      modal = <EditModal />
    } else {
      modal = <ViewModal />
    }
    return (
      <div className="main">
        {modal}
      </div>
    );
  }
}

function EditModal (props) {
  var errorUpdateModal
  if (this.state.error) {
    errorUpdateModal =  <h4 className="errorMessage">Unable to Update User object</h4>
  }
  return (
    <div className="EditModal">
      <form onSubmit={this.updateUser}>
        <input value={props.email} onChange={this.updateEmail} placeholder="email@example.com"/>
        <input value={props.password} onChange={this.updatePassword} placeholder="**********"/>
        <input value={props.name} onChange={this.updateName} placeholder="User St. John"/>
        {errorUpdateModal}
        <input type="submit" value="Confirm Edit" />
      </form>
    </div>
  );
}

function ViewModal (props) {
  console.log(props);
  return (
    <div className="ViewModal">
      <h2>Account</h2>
      <h4>{props.email}</h4>
      <h4>{props.name}</h4>
    </div>
  );
}

export default connect(mapStateToProps, mapDispatchToProps)(Account);
