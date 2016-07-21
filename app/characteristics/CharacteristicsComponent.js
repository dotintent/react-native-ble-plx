'use strict';

import React, { Component } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableHighlight,
} from 'react-native';
import { connect } from 'react-redux'

import CharacteristicsListView from './CharacteristicsListView'

class CharacteristicsComponent extends Component {
  render() {
    return (
      <View style={{flex: 1, padding: 20}}>
        <CharacteristicsListView
          services={this.props.characteristics}/>
        <Text>Status: {this.props.state}</Text>
      </View>
    )
  }
}

var styles = StyleSheet.create({

});

export default connect()
(CharacteristicsComponent)
