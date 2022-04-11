import { FormattedMessage } from 'react-intl';
import zhCN from 'antd/es/locale/zh_CN';
import enUS from 'antd/es/locale/en_US';
import get from 'lodash/get';
import messages from './messages';

export const t = (path) => {
  return (
    <FormattedMessage {...get(messages, path)} />
  );
};

export const getLanguage = () => {
  return window.localStorage.getItem('IAC_LOCALE') || 'zh';
};

export const setLanguage = (language) => {
  window.localStorage.setItem('IAC_LOCALE', language || 'zh');
  window.location.reload();
};

export const getAntdLocale = () => {
  const language = getLanguage();
  return {
    zh: zhCN,
    en: enUS
  }[language] || zhCN;
};