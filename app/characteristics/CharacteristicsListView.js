'use strict';

import React, { Component, PropTypes } from 'react';
import {
  View,
  ListView,
  ListViewDataSource
} from 'react-native';
import CharacteristicsView from './CharacteristicView'

export default class CharacteristicsListView extends Component {

  constructor(props) {
    super(props)
    var ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
    this.state = { dataSource: ds.cloneWithRows(this.props.characteristics) };
    this._renderCell = this._renderCell.bind(this);
  }

  static propTypes = {
    characteristics: PropTypes.arrayOf(PropTypes.shape({
      isReadable: PropTypes.bool.isRequired,
      isWritable: PropTypes.bool.isRequired,
      isNotifiable: PropTypes.bool.isRequired,
      uuid: PropTypes.string.isRequired
    }).isRequired).isRequired,
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      dataSource: this.state.dataSource.cloneWithRows(nextProps.characteristics)
    })
  }

  _renderCell(rowData) {
    (
      <CharacteristicsView
        isReadable={rowData.isReadable}
        isWritable={rowData.isWritable}
        isNotifiable={rowData.isNotifiable}
        uuid={rowData.uuid}
        onClick={null}
      />
    );
  }

  _renderSeparator(section, row, adjacentRowHighlighted) {
    return (
      <View
        key={`${section}-${row}`}
        style={{height:2}}
      />
    );
  }

  render() {
    return (
      <ListView
        style={{paddingTop: 50}}
        dataSource={this.state.dataSource}
        renderRow={this._renderCell}
        renderSeparator={this._renderSeparator}
        enableEmptySections={true}
      />
    );
  }
}
