'use strict';

import React, { Component, PropTypes } from 'react';
import {
  View,
  ListView,
  ListViewDataSource
} from 'react-native';
import ServiceView from './ServiceView'

export default class ServiceListView extends Component {

  constructor(props) {
    super(props)
    var ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
    this.state = { dataSource: ds.cloneWithRows(this.props.services) };
    this._renderCell = this._renderCell.bind(this);
  }

  static propTypes = {
    services: PropTypes.arrayOf(PropTypes.shape({
      characteristicsCount: PropTypes.number,
      isPrimary: PropTypes.bool.isRequired,
      uuid: PropTypes.string.isRequired
    }).isRequired).isRequired,
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      dataSource: this.state.dataSource.cloneWithRows(nextProps.services)
    })
  }

  _renderCell(rowData) {
    return (
      <ServiceView
        characteristicsCount={rowData.characteristicsCount}
        isPrimary={rowData.isPrimary}
        uuid={rowData.uuid}
        onClick={() => {
          this.props.onServiceClicked(rowData.uuid)
        }}
      />
    )
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
