import React, { Component } from 'react';
import { withRouter } from 'react-router-dom'
import { BrowserRouter as Router, Route} from 'react-router-dom'
import { Switch } from 'react-router-dom'
import { connect } from 'react-redux';
import './navbar.css';
import home from './home.js';
import login from './login.js';
import account from './account.js';
import NoMatch from './404.js';

const mapStateToProps = state => ({
  ...state
})

const Home = withRouter(({ history }) => (
    <button
      type='button'
      onClick={() => { history.push('/') }}
    >
      Home
    </button>
))

const Login = withRouter(({ history }) => (
    <button
      type='button'
      onClick={() => { history.push('/login') }}
    >
      Login
    </button>
))

const Account = withRouter(({ history }) => (
    <button
      type='button'
      onClick={() => { history.push('/account') }}
    >
      Account
    </button>
))

class App extends Component {
  render () {
    let mustLog
    if (this.props.token !== null) {
      mustLog = <Account />
    }
    return (
      <div className="main">
        <Router>
            <div>
                <Home />
                <Login />
                {mustLog}
                <Switch>
                    <Route exact path="/" component={home}/>
                    <Route path="/login" component={login}/>
                    <Route path="/account" component={account}/>
                    <Route component={NoMatch}/>
                </Switch>
            </div>
        </Router>
      </div>
    );
  }
}

export default connect(mapStateToProps)(App);
