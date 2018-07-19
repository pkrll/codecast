
import {takeLatest, take, put, call, select} from 'redux-saga/effects';
import React from 'react';
import {Button, FormGroup, Intent} from '@blueprintjs/core';

import {asyncRequestJson} from '../utils/api';
import {getBlob, uploadBlob} from '../utils/blobs';

export default function (bundle, deps) {

  bundle.defineAction('saveScreenEncodingStart', 'Save.Encoding.Start');
  bundle.defineAction('saveScreenEncodingDone', 'Save.Encoding.Done');
  bundle.addReducer('saveScreenEncodingStart', saveScreenEncodingStartReducer);
  bundle.addReducer('saveScreenEncodingDone', saveScreenEncodingDoneReducer);

  bundle.defineAction('saveScreenUpload', 'Save.Upload.Start');

  bundle.defineAction('saveScreenPreparing', 'Save.Prepare.Pending');
  bundle.defineAction('saveScreenUploadReady', 'Save.Upload.Ready');
  bundle.defineAction('saveScreenEventsUploading', 'Save.Events.Upload.Pending');
  bundle.defineAction('saveScreenEventsUploaded', 'Save.Events.Upload.Success');
  bundle.defineAction('saveScreenAudioUploading', 'Save.Audio.Upload.Pending');
  bundle.defineAction('saveScreenAudioUploaded', 'Save.Audio.Upload.Success');
  bundle.defineAction('saveScreenUploadSucceeded', 'Save.Success');
  bundle.defineAction('saveScreenUploadFailed', 'Save.Failure');


  bundle.addReducer('saveScreenPreparing', function (state, action) {
    return state.setIn(['save', 'step'], 'upload/preparing');
  });

  bundle.addReducer('saveScreenUploadReady', function (state, action) {
    return state.setIn(['save', 'step'], 'upload/ready');
  });

  bundle.addReducer('saveScreenUpload', function (state, action) {
    return state.setIn(['save', 'busy'], true);
  });

  bundle.addReducer('saveScreenEventsUploading', function (state, action) {
    return state.setIn(['save', 'uploadEvents'], 'pending');
  });

  bundle.addReducer('saveScreenEventsUploaded', function (state, action) {
    return state.update('save', save => save
      .set('uploadEvents', 'done').set('eventsUrl', action.url));
  });

  bundle.addReducer('saveScreenAudioUploading', function (state, action) {
    return state.setIn(['save', 'uploadAudio'], 'pending');
  });

  bundle.addReducer('saveScreenAudioUploaded', function (state, action) {
    return state.update('save', save => save
      .set('uploadAudio', 'done').set('audioUrl', action.url));
  });

  bundle.addReducer('saveScreenUploadSucceeded', function (state, action) {
    const {playerUrl} = action;
    return state.update('save', save => save
      .set('busy', false).set('done', true).set('playerUrl', playerUrl));
  });

  bundle.addReducer('saveScreenUploadFailed', function (state, action) {
    return state.update('save', save => save
      .set('busy', false).set('error', action.error));
  });

  bundle.defineAction('uploadTokenChanged', 'Save.UploadToken.Changed');
  bundle.addReducer('uploadTokenChanged', function (state, {token}) {
    return state.set('uploadToken', token);
  });
  function getUploadToken (state) {
    return state.get('uploadToken');
  }

  bundle.addSaga(function* saveSaga ({actionTypes}) {
    yield takeLatest(actionTypes.recorderStopped, encodingSaga)
    yield takeLatest(actionTypes.saveScreenUpload, uploadSaga);
  });

  bundle.defineView('SaveScreen', SaveScreenSelector, SaveScreen);

};

function saveScreenEncodingStartReducer (state, _action) {
  return state.set('save', {});
}

function saveScreenEncodingDoneReducer (state, {payload: {audioUrl, wavAudioUrl, eventsUrl}}) {
  return state
    .set('save', Immutable.Map({
      step: 'done',
      audioUrl: action.audioUrl,
      wavAudioUrl: action.wavAudioUrl,
      eventsUrl: action.eventsUrl
    }));
}

function SaveScreenSelector (state, props) {
  const getMessage = state.get('getMessage');
  const save = state.get('save')
  const result = {getMessage, ...save};
}

class SaveScreen extends React.PureComponent {

  render () {
    const {getMessage, audioUrl, wavAudioUrl, eventsUrl, playerUrl, busy, done, prepare, uploadEvents, uploadAudio, error} = this.props;
    /* TODO: select target among user grants */
    /* TODO: display progress while encoding mp3? */
    return (
      <form>
        <FormGroup labelFor='eventsUrlInput' label={"URL évènements"}>
          <input id='eventsUrlInput' type='text' className='pt-input' value={eventsUrl} readOnly/>
        </FormGroup>
        <FormGroup labelFor='audioUrlInput' label={"URL audio"}>
          <input id='audioUrlInput' type='text' className='pt-input' value={audioUrl} readOnly/>
        </FormGroup>
        {wavAudioUrl &&
          <FormGroup labelFor='wavAudioUrlInput' label={"URL audio (wav)"}>
            <input id='wavAudioUrlInput' type='text' className='pt-input' value={wavAudioUrl} readOnly/>
          </FormGroup>}
        <p>
          <Button onClick={this.onUpload} disabled={busy || done} intent={done && Intent.PRIMARY}
            icon='floppy-disk' text="Save" />
          {/* TODO: cleanup status */}
          {busy
            ? <i className="fa fa-spin fa-spinner"/>
            : (done
                ? <i className="fa fa-check"/>
                : false)}
        </p>
        {prepare === 'pending' && <p>{getMessage('PREPARING_RECORDING')}</p>}
        {uploadEvents === 'pending' && <p>{getMessage('UPLOADING_EVENTS')}</p>}
        {uploadAudio === 'pending' && <p>{getMessage('UPLOADING_AUDIO')}</p>}
        {error && <p>{getMessage('UPLOADING_ERROR')}</p>}
        {done && <p>{getMessage('UPLOADING_COMPLETE')}</p>}
        {done &&
          <FormGroup labelFor='playerUrlInput' label={getMessage('PLAYBACK_LINK')}>
            <input id='playerUrlInput' type='text' className='pt-input' value={playerUrl} readOnly/>
          </FormGroup>}
      </form>
    );
  }

  onUpload = () => {
    this.props.dispatch({type: deps.saveScreenUpload});
  };

}

function* encodingSaga ({actionTypes}) {
  yield put({type: actions.saveScreenEncodingStart, payload: {}});
  yield put({type: actionTypes.switchToScreen, payload: {screen: 'save'}});
  const recorder = yield select(deps.getRecorderState);
  /* Encode the audio track, reporting progress. */
  const {worker} = recorder.get('context');
  const {mp3, wav, duration} = yield call(worker.call, 'export', {mp3: true, wav: true}, encodingProgressSaga);
  const mp3Url = URL.createObjectURL(mp3);
  const wavUrl = URL.createObjectURL(wav);
   /* Ensure the 'end' event occurs before the end of the audio track. */
  const version = RECORDING_FORMAT_VERSION;
  const endTime = Math.floor(duration * 1000);
  const events = recorder.get('events').push([endTime, 'end']);
  const subtitles = [];
  const data = {version, events, subtitles};
  const eventsBlob = new Blob([JSON.stringify(data)], {encoding: "UTF-8", type:"application/json;charset=UTF-8"});
  const eventsUrl = URL.createObjectURL(eventsBlob);
  /* Signal that the recorder has stopped. */
  yield put({
    type: actionTypes.saveScreenEncodingDone,
    payload: {
      audioUrl: mp3Url,
      wavAudioUrl: wavUrl,
      eventsUrl: eventsUrl,
    }
  });
  function* encodingProgressSaga ({step, progress}) {
    /* step: copy|wav|mp3 */
    yield put({type: actionTypes.saveScreenEncodingProgress, payload: {step, progress}});
  }
}

function* uploadSaga ({actionTypes, selectors}) {
  try {
    // Step 1: prepare the upload by getting the S3 form parameters
    // from the server.
    yield put({type: actionTypes.saveScreenPreparing});
    const save = yield select(state => state.get('save'));
    const token = yield select(selectors.getUploadToken);
    const response = yield call(asyncRequestJson, 'upload', {token});
    yield put({type: actionTypes.saveScreenUploadReady});
    // Upload the events file.
    yield put({type: actionTypes.saveScreenEventsUploading});
    const eventsBlob = yield call(getBlob, save.get('eventsUrl'));
    yield call(uploadBlob, response.events, eventsBlob);
    yield put({type: actionTypes.saveScreenEventsUploaded, url: response.events.public_url});
    // Upload the audio file.
    yield put({type: actionTypes.saveScreenAudioUploading});
    const audioBlob = yield call(getBlob, save.get('audioUrl'));
    yield call(uploadBlob, response.audio, audioBlob);
    yield put({type: actionTypes.saveScreenAudioUploaded, url: response.audio.public_url});
    // Signal completion.
    yield put({type: actionTypes.saveScreenUploadSucceeded, playerUrl: response.player_url});
  } catch (error) {
    yield put({type: actionTypes.saveScreenUploadFailed, error});
  }
}


/*
  Use as part of restarting the recorder:
    const context = state.getIn(['recorder', 'context']);
      .set('recorder', Immutable.Map({status: 'ready', context}))
*/
