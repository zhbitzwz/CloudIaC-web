import React, { useEffect, useRef, useState } from 'react';
import { Form, Input, Button, notification, Row, Col } from 'antd';
import queryString from 'query-string';
import { LangIcon } from 'components/iconfont';
import { t, getLanguage, setLanguage } from 'utils/i18n';
import { useRequest } from 'ahooks';
import { requestWrapper } from 'utils/request';
import { authAPI } from "../services/auth";
import styles from './styles.less';

const layout = {
  labelCol: { span: 5 },
  wrapperCol: { span: 19 }
};
const tailLayout = {
  wrapperCol: { span: 24 }
};

export default () => {

  const language = getLanguage();
  const { callbackUrl, redirectToExchange } = queryString.parse(window.location.search);
  const [ canShowRegister, setCanShowRegister ] = useState(false);
  useRequest(
    () => requestWrapper(
      authAPI.getSysConfigSwitches.bind(null)
    ),
    {
      onSuccess: (data) => {
        setCanShowRegister(data.enableRegister || false);
      }
    }
  );

  const onFinish = async (values) => {
    try {
      const res = await authAPI.login(values);
      if (res.code != 200) {
        throw new Error(res.message);
      }
      localStorage.accessToken = res.result.token;
      const userInfoRes = await authAPI.info();
      if (userInfoRes.code != 200) {
        throw new Error(userInfoRes.message);
      }
      const userInfo = userInfoRes.result || {};
      const { devManual = 0 } = userInfo.newbieGuide || {};
      const updateUserInfoRes = await authAPI.updateSelf({
        newbieGuide: {
          devManual: devManual + 1
        }
      });
      if (updateUserInfoRes.code != 200) {
        throw new Error(updateUserInfoRes.message);
      }
      setUserConfig(updateUserInfoRes.result || {});
      if (redirectToExchange === 'y') {
        redirectToExchangePage();
      } else {
        redirectToPage();
      }
    } catch (e) {
      notification.error({
        message: e.message
      });
    }
  };

  const setUserConfig = (updateUserInfo) => {
    const { devManual = 0 } = updateUserInfo.newbieGuide || {};
    localStorage.newbieGuide_devManual = devManual <= 3;
  };

  useEffect(() => {
    if (localStorage.accessToken) {
      if (redirectToExchange === 'y') {
        redirectToExchangePage();
      } else {
        redirectToIndex();
      }
    }
  }, []);

  const redirectToExchangePage = async () => {
    const { url, query } = queryString.parseUrl(decodeURIComponent(callbackUrl));
    const res = await authAPI.getSsoToken();
    const { token } = res && res.result || {};
    const redirectToUrl = queryString.stringifyUrl({
      url,
      query: {
        ...query,
        accessToken: token
      }
    });
    window.location.href = redirectToUrl;
  };

  const redirectToPage = () => {
    if (callbackUrl) {
      window.location.href = decodeURIComponent(callbackUrl);
    } else {
      redirectToIndex();
    }
  };

  const redirectToIndex = () => {
    window.location.href = '/';
  };

  const redirectToRegister = () => {
    const search = window.location.search;
    window.location.href = `/register${search}`;
  };

  const redirectToFindPassword = () => {
    const search = window.location.search;
    window.location.href = `/find-password/${search}`;
  };

  const redirectToOfficialWebsite = () => {
    window.location.href = "https://www.cloudiac.org";
  };

  return (
    <div className={styles.login}>
      <div className='center-container'>
        <div className='center-card'>
          <div className='header-container'>
            <div className='logo' onClick={redirectToOfficialWebsite}>
              <img src='/assets/logo/iac-logo-light.svg' alt='logo'/>
            </div>
          </div>
          <div className='loginFormWrapper'>
            <Form
              {...layout}
              name='basic'
              className='loginForm'
              requiredMark='optional'
              onFinish={onFinish}
            >
              <div>
                <Form.Item
                  className='format-form-item'
                  label={
                    <>
                      <span>{t('define.loginPage.email')}</span>
                    </>
                  }
                  name='email'
                  rules={[
                    { required: true, message: t('define.loginPage.email.placeholder') },
                    { type: 'email', message: t('define.loginPage.email.formatError') }
                  ]}
                  getValueFromEvent={(e) => e.target.value.trim()}
                >
                  <Input placeholder={t('define.loginPage.email.placeholder')} />
                </Form.Item>
              </div>


              <Form.Item
                className='format-form-item'
                label={t('define.loginPage.password')}
                name='password'
                rules={[{ required: true, message: t('define.loginPage.password.placeholder') }]}
                getValueFromEvent={(e) => e.target.value.trim()}
              >
                <Input.Password placeholder={t('define.loginPage.password.placeholder')} />
              </Form.Item>

              <Form.Item {...tailLayout} style={{ paddingTop: 36, marginBottom: 0 }}>
                <Button style={{ height: 36 }} block={true} type='primary' htmlType='submit'>
                  {t('define.loginPage.login')}
                </Button>
              </Form.Item>
            </Form>
            { canShowRegister && <div className='bottom-actions-container'>
              <div onClick={redirectToRegister}>{t('define.loginPage.password.registerForFree')}</div>
              <div onClick={redirectToFindPassword}>{t('define.loginPage.password.findPassword')}</div>
            </div>
            }
          </div>
        </div>
        {language === 'zh' ? (
          <div className='change-language'>
            <LangIcon className='lang-icon' />
            <span>产品使用语言</span>
            <span className='change-language-btn' onClick={() => setLanguage('en')}>EN?</span>
          </div>
        ) : (
          <div className='change-language'>
            <LangIcon className='lang-icon' />
            <span>View this page in</span>
            <span className='change-language-btn' onClick={() => setLanguage('zh')}>中文?</span>
          </div>
        )}
      </div>
      <div className='foot'>Copyright © 2022 杭州云霁科技有限公司</div>
    </div>
  );
};
