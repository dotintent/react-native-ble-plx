import React, { Component, PropTypes } from 'react';
import {
  View,
  ListView,
  ListViewDataSource
} from 'react-native';
import ScannedDeviceView from './ScannedDeviceView'

export default class ScannedDeviceListView extends Component {

  constructor(props) {
    super(props)
    var ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
    this.state = { dataSource: ds.cloneWithRows(this.props.scannedDevices) };

    this._renderCell = this._renderCell.bind(this);
  }

  static propTypes = {
    scannedDevices: PropTypes.arrayOf(PropTypes.shape({
      name: PropTypes.string,
      uuid: PropTypes.string.isRequired,
      rssi: PropTypes.number.isRequired
    }).isRequired).isRequired,
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      dataSource: this.state.dataSource.cloneWithRows(nextProps.scannedDevices)
    })
  }

  _renderCell(rowData) {
    return (

      <ScannedDeviceView
        uuid={rowData.uuid}
        name={rowData.name}
        rssi={rowData.rssi}
        onClick={() => {
          this.props.onScannedDeviceClicked(rowData.uuid)
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
        dataSource={this.state.dataSource}
        renderRow={this._renderCell}
        renderSeparator={this._renderSeparator}
        enableEmptySections={true}
      />
    );
  }
}
