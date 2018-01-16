import * as React from 'React'
import { AppRegistry } from 'react-native'
import App from './js/App'
import { createStore, applyMiddleware } from 'redux'
import { Provider } from 'react-redux'
import thunk from 'redux-thunk'
import { bleReducer } from './js/ble/BleReducer'

const store = createStore(bleReducer, applyMiddleware(thunk))

class StoreComponent extends React.Component<{}> {
  render() {
    return (
      <Provider store={store}>
        <App />
      </Provider>
    )
  }
}

AppRegistry.registerComponent('Sniffator', () => StoreComponent)
