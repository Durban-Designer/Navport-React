import React, { Component } from 'react';
import './home.css';
import axios from 'axios'
class App extends Component {
  constructor (props) {
    super(props);
    this.state = {
      array: [],
      List: <div>Nothing to display</div>
    }
    axios.get('http://localhost:81/test')
      .then(response => {
        this.setState({
          array: response.data,
          List: response.data.map((obj, i) =>
            <div className="card" key={i}>
              <h2 className="title">{obj.title}</h2>
              <p className="content">{obj.content}</p>
              <h4 className="foot">{obj.foot}</h4>
            </div>
          )
        })
        console.log(this.state.array)
      })
      .catch(err => {
        console.log(err);
      })
  }
  render () {
    return (
      <div className="main">
        <h2>Home</h2>
        {this.state.List}
      </div>
    );
  }
}

export default App;
