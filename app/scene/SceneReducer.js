'use strict';

import { Map } from 'immutable'
import { ActionConst } from 'react-native-router-flux'
import * as SceneConst from './Const.js' 

const defaultState = Map({
    'state' : SceneConst.DEVICES_SCENE 
})

export default function (state = defaultState, action) {
    switch(action.type) {
        case ActionConst.FOCUS:
            return state.set('state', action.scene.sceneKey);
    }
    return state;
} 