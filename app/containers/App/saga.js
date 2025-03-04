import { call, put, takeLatest } from 'redux-saga/effects';
import { notification } from 'antd';
import { t } from 'utils/i18n';
import orgsAPI from 'services/orgs';
import projectAPI from 'services/project';
import userAPI from 'services/user';
import sysAPI from 'services/sys';
import { safeJsonParse, getMatchParams } from 'utils/util';
import queryString from 'query-string';
function* getOrgs(action) {
  try {
    const { isDemo } = queryString.parse(location.search);
    let res;
    if (isDemo === 'true') {
      res = yield call(orgsAPI.allEnableOrgs, { ...action.payload, isDemo: true });
    } else {
      res = yield call(orgsAPI.allEnableOrgs, action.payload);
    }
    if (res.code !== 200) {
      throw new Error(res.message);
    }
    yield put({
      type: 'global/set-orgs',
      payload: res.result || {}
    });
    //url中默认存在orgId
    const { orgId } = getMatchParams();
    if (orgId) {
      yield put({
        type: 'global/set-curOrg',
        payload: {
          orgId
        }
      });
    }
  } catch (err) {
    notification.error({
      message: err.message
    });
  }
}

function* getProjects(action) {
  try {
    const res = yield call(projectAPI.allEnableProjects, action.payload);
    if (res.code !== 200) {
      throw new Error(res.message);
    }
    const projects = res.result || {};
    yield put({
      type: 'global/set-projects',
      payload: projects
    });
    const { projectId } = getMatchParams();
    const localCurProject = safeJsonParse([localStorage.getItem('curProject')]);
    const localProjectId = (localCurProject || {}).id;
    const projectList = projects.list || [];
    if (projectList.length === 0) {
      yield put({
        type: 'global/set-curProject',
        payload: {
          projectId: null
        }
      });
    } else if (projectId) {
      yield put({
        type: 'global/set-curProject',
        payload: {
          projectId: projectId
        }
      });
    } else if (projectList.find(it => localProjectId && localProjectId === it.id)) {
      yield put({
        type: 'global/set-curProject',
        payload: {
          projectId: localProjectId
        }
      });
    } else {
      // yield put({
      //   type: 'global/set-curProject',
      //   payload: {
      //     projectId: (projectList[0] || {}).id
      //   }
      // });
    }
  } catch (err) {
    notification.error({
      message: err.message
    });
  }
}

function* getUserInfo({ payload } = {}) {
  try {
    const res = yield call(userAPI.info, payload);
    if (res.code !== 200) {
      throw new Error(res.message);
    }
    yield put({
      type: 'global/set-userInfo',
      payload: res.result || {}
    });
  } catch (err) {
    notification.error({
      message: err.message
    });
  }
}

function* updateUserInfo({ payload, cb }) {
  try {
    const res = yield call(userAPI.updateSelf, payload);
    if (res.code !== 200) {
      throw new Error(res.message);
    }
    notification.success({
      message: t('define.message.opSuccess')
    });
    yield put({
      type: 'global/getUserInfo',
      payload
    });
    cb && cb();
  } catch (err) {
    cb && cb(err);
    notification.error({
      message: err.message
    });
  }
}

function* getSysConfigSwitches({ payload } = {}) {
  try {
    const res = yield call(sysAPI.getSysConfigSwitches, payload);
    if (res.code !== 200) {
      throw new Error(res.message);
    }
    yield put({
      type: 'global/set-sysConfigSwitches',
      payload: res.result || {}
    });
  } catch (err) {
    notification.error({
      message: err.message
    });
  }
}

export default function* testSaga() {
  yield takeLatest('global/getSysConfigSwitches', getSysConfigSwitches);
  yield takeLatest('global/getOrgs', getOrgs);
  yield takeLatest('global/getProjects', getProjects);
  yield takeLatest('global/getUserInfo', getUserInfo);
  yield takeLatest('global/updateUserInfo', updateUserInfo);
}
